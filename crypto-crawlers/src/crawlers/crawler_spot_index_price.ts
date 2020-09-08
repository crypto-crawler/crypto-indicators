import { strict as assert } from 'assert';
import { crawlIndex, IndexKlineMsg, IndexTickerMsg } from 'crypto-crawler/dist/crawler/okex';
import yargs from 'yargs';
import { Publisher } from '../utils';
import { Heartbeat } from '../utils/heartbeat';
import { createLogger } from '../utils/logger';
import {
  fetchMarketsWithCache,
  REDIS_TOPIC_SPOT_INDEX_KLINE,
  REDIS_TOPIC_SPOT_INDEX_PRICE,
} from './common';

const commandModule: yargs.CommandModule = {
  command: 'crawler_spot_index_price',
  describe: 'Crawl Spot index price',
  // eslint-disable-next-line no-shadow
  builder: (yargs) => yargs.options({}),
  handler: async () => {
    const pairs = (await fetchMarketsWithCache('OKEx', 'Swap')).map((m) => m.pair);
    assert.ok(pairs.length > 0);

    const logger = createLogger(`crawler-spot-index-price`);
    const heartbeat = new Heartbeat(logger, 60);

    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

    const publisher = new Publisher<IndexTickerMsg>(REDIS_URL);
    const klinePublisher = new Publisher<IndexKlineMsg>(REDIS_URL);

    // key=${exchange}-${pair}-${interval}
    const mymap = new Map<string, IndexKlineMsg>();

    crawlIndex(
      pairs,
      ['Ticker', 'Kline'],
      async (msg: IndexTickerMsg | IndexKlineMsg): Promise<void> => {
        heartbeat.updateHeartbeat();

        if ((msg as IndexKlineMsg).interval) {
          const klineMsg = msg as IndexKlineMsg;
          const key = `OKEx-${klineMsg.pair}-${klineMsg.interval}`;

          if (mymap.has(key)) {
            const prev = mymap.get(key)!;
            if (msg.timestamp > prev.timestamp) {
              klinePublisher.publish(`${REDIS_TOPIC_SPOT_INDEX_KLINE}_${klineMsg.interval}`, prev);
            }
          }
          mymap.set(key, klineMsg);
        } else {
          const tickerMsg = msg as IndexTickerMsg;

          publisher.publish(REDIS_TOPIC_SPOT_INDEX_PRICE, tickerMsg);
        }
      },
    );
  },
};

export default commandModule;
