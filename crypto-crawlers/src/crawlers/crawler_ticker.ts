import { strict as assert } from 'assert';
import crawl, { TickerMsg } from 'crypto-crawler';
import fetchMarkets, { MarketType, MARKET_TYPES } from 'crypto-markets';
import * as kafka from 'kafka-node';
import yargs from 'yargs';
import { createLogger, Heartbeat, Publisher } from '../utils';
import { calcRedisTopic, KAFKA_TICKER_TOPIC } from './common';

const EXCHANGE_THRESHOLD: { [key: string]: number } = {
  BitMEX: 900,
  Bitfinex: 600,
  Bitstamp: 240,
  CoinbasePro: 120,
  Huobi: 120,
  Kraken: 240,
  MXC: 120,
  WhaleEx: 120,
};

async function crawlTicker(
  exchange: string,
  marketType: MarketType,
  pairs: readonly string[],
): Promise<void> {
  pairs = Array.from(new Set(pairs)); // eslint-disable-line no-param-reassign

  const publisher = new Publisher<TickerMsg>(process.env.REDIS_URL || 'redis://localhost:6379');

  const logger = createLogger(`crawler-ticker-${exchange}-${marketType}`);
  const heartbeat = new Heartbeat(logger, EXCHANGE_THRESHOLD[exchange] || 60);

  const kafkaPublisher = new kafka.HighLevelProducer(
    new kafka.KafkaClient({
      clientId: 'crawler_ticker',
      kafkaHost: process.env.KAFKA_HOST || 'localhost:9092',
    }),
  );

  crawl(
    exchange,
    marketType,
    ['Ticker'],
    pairs,
    async (msg): Promise<void> => {
      heartbeat.updateHeartbeat();

      const tickerMsg = msg as TickerMsg;

      publisher.publish(calcRedisTopic(tickerMsg), tickerMsg);

      const km = new kafka.KeyedMessage(
        `${msg.exchange}-${msg.marketType}-${msg.pair}-${msg.rawPair}`,
        JSON.stringify(tickerMsg),
      );
      const payloads: kafka.ProduceRequest[] = [{ topic: KAFKA_TICKER_TOPIC, messages: [km] }];
      kafkaPublisher.send(payloads, (err, data) => {
        if (err) {
          logger.error(err);
        }
        assert.equal(KAFKA_TICKER_TOPIC, Object.keys(data)[0]);
      });
    },
  );
}

const commandModule: yargs.CommandModule = {
  command: 'crawler_ticker <exchange> <marketType>',
  describe: 'Crawl ticker',
  // eslint-disable-next-line no-shadow
  builder: (yargs) =>
    yargs
      .positional('exchange', {
        choices: ['Binance', 'Bitfinex', 'Huobi', 'OKEx'],
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
    const swapPairs = (await fetchMarkets(params.exchange, params.marketType))
      .filter((m) => m.active)
      .map((m) => m.pair);
    const pairsFromEnv = (process.env.PAIRS || ' ').split(' ').filter((x) => x);
    const pairs =
      pairsFromEnv.length > 0 ? pairsFromEnv.filter((x) => swapPairs.includes(x)) : swapPairs;
    assert.ok(pairs.length > 0);

    await crawlTicker(params.exchange, params.marketType, pairs);
  },
};

export default commandModule;
