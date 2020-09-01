import { strict as assert } from 'assert';
import crawl, { KlineMsg, SUPPORTED_EXCHANGES } from 'crypto-crawler';
import { MarketType, MARKET_TYPES } from 'crypto-markets';
import * as kafka from 'kafka-node';
import yargs from 'yargs';
import { Heartbeat } from '../utils/heartbeat';
import { createLogger } from '../utils/logger';
import { calcPairs, KAFKA_KLINE_TOPIC } from './common';

async function crawlKline(
  exchange: string,
  marketType: MarketType,
  pairs: readonly string[],
): Promise<void> {
  const publisher = new kafka.HighLevelProducer(
    new kafka.KafkaClient({
      clientId: `crawler-kline-${exchange}-${marketType}`,
      kafkaHost: process.env.KAFKA_HOST || 'localhost:9092',
    }),
  );

  const logger = createLogger(`crawler-kline-${exchange}-${marketType}`);
  const heartbeat = new Heartbeat(logger, 120);

  // key=${exchange}-${marketType}-${rawPair}-${period}
  const mymap = new Map<string, KlineMsg>();

  crawl(
    exchange,
    marketType,
    ['Kline'],
    pairs,
    async (msg): Promise<void> => {
      heartbeat.updateHeartbeat();
      const klineMsg = msg as KlineMsg;

      const key = `${msg.exchange}-${msg.marketType}-${msg.rawPair}-${klineMsg.period}`;

      if (mymap.has(key)) {
        const prev = mymap.get(key)!;
        if (msg.timestamp > prev.timestamp) {
          const km = new kafka.KeyedMessage(
            `${prev.exchange}-${prev.marketType}-${prev.pair}-${prev.rawPair}-${prev.period}-${prev.timestamp}`,
            JSON.stringify(prev),
          );
          const payloads: kafka.ProduceRequest[] = [{ topic: KAFKA_KLINE_TOPIC, messages: [km] }];
          publisher.send(payloads, (err, data) => {
            if (err) {
              logger.error(err);
            } else {
              assert.equal(KAFKA_KLINE_TOPIC, Object.keys(data)[0]);
            }
          });
        }
      }
      mymap.set(key, klineMsg);
    },
  );
}

const commandModule: yargs.CommandModule = {
  command: 'crawler_kline <exchange> <marketType>',
  describe: 'Crawl kline',
  // eslint-disable-next-line no-shadow
  builder: (yargs) =>
    yargs
      .positional('exchange', {
        choices: SUPPORTED_EXCHANGES,
        type: 'string',
        demandOption: true,
      })
      .positional('marketType', {
        choices: MARKET_TYPES,
        type: 'string',
        demandOption: true,
      }),
  handler: async (argv) => {
    const params: {
      exchange: string;
      marketType: MarketType;
    } = argv as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const pairs = await calcPairs(params.exchange, params.marketType);
    assert.ok(pairs.length > 0);

    await crawlKline(params.exchange, params.marketType, pairs);
  },
};

export default commandModule;
