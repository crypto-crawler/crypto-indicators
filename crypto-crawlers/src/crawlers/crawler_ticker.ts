import { strict as assert } from 'assert';
import crawl, { TickerMsg } from 'crypto-crawler';
import { MarketType, MARKET_TYPES } from 'crypto-markets';
import yargs from 'yargs';
import { createLogger, Heartbeat, Publisher } from '../utils';
import { calcRedisTopic } from './common';

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

  crawl(
    exchange,
    marketType,
    ['Ticker'],
    pairs,
    async (msg): Promise<void> => {
      heartbeat.updateHeartbeat();

      const tickerMsg = msg as TickerMsg;

      publisher.publish(calcRedisTopic(tickerMsg), tickerMsg);
    },
  );
}

const commandModule: yargs.CommandModule = {
  command: 'crawler_ticker <exchange> <marketType> [pairs]',
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
      })
      .options({
        pairs: {
          type: 'array',
          demandOption: true,
        },
      }),
  handler: async (argv) => {
    const params: {
      exchange: string;
      marketType: MarketType;
      pairs: string[];
    } = argv as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    assert.ok(params.pairs.length > 0);
    assert.ok(process.env.DATA_DIR, 'Please define a DATA_DIR environment variable in .envrc');

    await crawlTicker(params.exchange, params.marketType, params.pairs);
  },
};

export default commandModule;
