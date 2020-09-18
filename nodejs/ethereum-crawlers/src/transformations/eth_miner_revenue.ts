import { IndexTickerMsg } from 'crypto-crawler/dist/crawler/okex';
import _ from 'lodash';
import { Publisher, Subscriber } from 'utils';
import Web3 from 'web3';
import { BlockHeader } from 'web3-eth';
import yargs from 'yargs';
import {
  REDIS_TOPIC_ETH_BLOCK_HEADER,
  REDIS_TOPIC_ETH_MINER_REVENUE,
  REDIS_TOPIC_SPOT_INDEX_PRICE,
} from '../crawlers/common';

interface BlockRewardMsg {
  number: number;
  hash: string;
  timestamp: number;
  revenue: number;
  revenueUSD: number;
}

const web3 = new Web3(
  new Web3.providers.WebsocketProvider(process.env.FULL_NODE_URL || 'ws://localhost:8546'),
);

async function calcBlockReward(blockHash: string): Promise<number> {
  const block = await web3.eth.getBlock(blockHash);
  const txs = await Promise.all(
    block.transactions.map((txHash) => web3.eth.getTransaction(txHash)),
  );
  const tmp = txs.filter((tx) => tx).map((tx) => web3.utils.fromWei(tx.value, 'ether'));
  const blockReward = _.sum(tmp.map((x) => parseFloat(x)));
  return blockReward;
}

const commandModule: yargs.CommandModule = {
  command: 'eth_miner_revenue',
  describe: 'Convert Ethereum miner revenue from ETH to USD.',
  // eslint-disable-next-line no-shadow
  builder: (yargs) => yargs.options({}),
  handler: async () => {
    let ethPrice = -1;
    const subscriberSpotPrice = new Subscriber<IndexTickerMsg>(
      async (tickMsg): Promise<void> => {
        if (tickMsg.pair === 'ETH_USDT') {
          ethPrice = tickMsg.last;
        }
      },
      REDIS_TOPIC_SPOT_INDEX_PRICE,
      process.env.REDIS_URL || 'redis://localhost:6379',
    );

    subscriberSpotPrice.run();
    while (ethPrice < 0) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    console.info('ethPrice: ', ethPrice);

    const publisher = new Publisher<BlockRewardMsg>(
      process.env.REDIS_URL || 'redis://localhost:6379',
    );

    const subscriber = new Subscriber<BlockHeader>(
      async (blockHeader): Promise<void> => {
        const blockReward = await calcBlockReward(blockHeader.hash);

        const msg: BlockRewardMsg = {
          number: blockHeader.number,
          hash: blockHeader.hash,
          timestamp: blockHeader.timestamp as number,
          revenue: blockReward,
          revenueUSD: ethPrice * blockReward,
        };

        publisher.publish(REDIS_TOPIC_ETH_MINER_REVENUE, msg);
      },
      REDIS_TOPIC_ETH_BLOCK_HEADER,
      process.env.REDIS_URL || 'redis://localhost:6379',
    );

    subscriber.run();
  },
};

export default commandModule;
