import { Msg } from 'crypto-crawler';
import fetchMarkets, { MarketType } from 'crypto-markets';

export const REDIS_TOPIC_PREFIX = 'crypto-crawlers';

// Topics
// eslint-disable-next-line import/prefer-default-export
export function calcRedisTopic(msg: Msg): string {
  switch (msg.channelType) {
    case 'BBO':
      return `${REDIS_TOPIC_PREFIX}:bbo-${msg.exchange}-${msg.marketType}`;
    case 'Ticker':
      return `${REDIS_TOPIC_PREFIX}:ticker-${msg.exchange}-${msg.marketType}`;
    case 'Trade':
      return `${REDIS_TOPIC_PREFIX}:trade-${msg.exchange}-${msg.marketType}`;
    default:
      throw new Error(`Unknown channelType ${msg.channelType}`);
  }
}

export async function calcPairs(
  exchange: string,
  marketType: MarketType,
): Promise<readonly string[]> {
  const swapCoins = new Set(
    (await fetchMarkets(exchange, 'Swap')).filter((m) => m.active).map((m) => m.base),
  );
  // USD or USDT pairs
  const pairs = (await fetchMarkets(exchange, marketType))
    .filter((m) => m.active && (m.quote === 'USD' || m.quote === 'USDT') && swapCoins.has(m.base))
    .map((m) => m.pair);

  const pairsFromEnv = (process.env.PAIRS || ' ').split(' ').filter((x) => x);

  return pairsFromEnv.length > 0 ? pairsFromEnv.filter((x) => pairs.includes(x)) : pairs;
}

export const REDIS_TOPIC_TRADE = `${REDIS_TOPIC_PREFIX}:trade`;
export const REDIS_TOPIC_SPOT_INDEX_PRICE = `${REDIS_TOPIC_PREFIX}:spot_index_price`;
export const REDIS_TOPIC_SPOT_INDEX_KLINE = `${REDIS_TOPIC_PREFIX}:spot_index_kline`;

export const REDIS_TOPIC_FUNDING_RATE = `${REDIS_TOPIC_PREFIX}:funding_rate`;

// Kafka topics
export const TRADE_TOPIC = 'brick-mover.trade';
export const KLINE_TOPIC = 'brick-mover.kline';
export const KAFKA_FUNDING_RATE_TOPIC = 'crypto-crawlers.funding_rate';
export const KAFKA_OKEx_FUNDING_RATE_TOPIC = 'crypto-crawlers.okex_funding_rate';
export const KAFKA_HB10_TOPIC = 'crypto-crawlers.hb10';
export const KAFKA_TICKER_TOPIC = 'crypto-crawlers.ticker';
export const KAFKA_KLINE_TOPIC = 'crypto-crawlers.kline';
export const KAFKA_KLINE_EXT_TOPIC = 'crypto-crawlers.kline_ext';

export const FUNDING_RATES_DIR = '/tmp/data/funding_rates';
