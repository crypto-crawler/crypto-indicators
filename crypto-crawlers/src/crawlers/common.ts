import fetchMarkets, { Market, MarketType } from 'crypto-markets';
import { RedisCache } from '../utils/redis_cache';

export const REDIS_TOPIC_PREFIX = 'crypto-crawlers';

export async function fetchMarketsWithCache(
  exchange: string,
  marketType: MarketType,
): Promise<readonly Market[]> {
  const redisCache = new RedisCache(process.env.REDIS_URL || 'redis://localhost:6379');
  const key = `${REDIS_TOPIC_PREFIX}:markets:${exchange}:${marketType}`;
  const pairsRedis = await redisCache.get(key);
  if (pairsRedis) {
    redisCache.close();
    return JSON.parse(pairsRedis);
  }

  const markets = (await fetchMarkets(exchange, marketType)).filter((m) => m.active);
  redisCache.set(key, JSON.stringify(markets));
  redisCache.close();
  return markets;
}

export async function calcPairs(
  exchange: string,
  marketType: MarketType,
): Promise<readonly string[]> {
  const swapCoins = new Set((await fetchMarketsWithCache(exchange, 'Swap')).map((m) => m.base));
  // USD or USDT pairs
  const pairs = (await fetchMarketsWithCache(exchange, marketType))
    .filter((m) => (m.quote === 'USD' || m.quote === 'USDT') && swapCoins.has(m.base))
    .map((m) => m.pair);

  const pairsFromEnv = (process.env.PAIRS || ' ').split(' ').filter((x) => x);

  return pairsFromEnv.length > 0 ? pairsFromEnv.filter((x) => pairs.includes(x)) : pairs;
}

export const REDIS_TOPIC_TICKER = `${REDIS_TOPIC_PREFIX}:ticker`;
export const REDIS_TOPIC_TRADE = `${REDIS_TOPIC_PREFIX}:trade`;
export const REDIS_TOPIC_SPOT_INDEX_PRICE = `${REDIS_TOPIC_PREFIX}:spot_index_price`;
export const REDIS_TOPIC_SPOT_INDEX_KLINE = `${REDIS_TOPIC_PREFIX}:spot_index_kline`;
export const REDIS_KLINE_TOPIC = `${REDIS_TOPIC_PREFIX}:kline`;
export const REDIS_TOPIC_KLINE_EXT = `${REDIS_TOPIC_PREFIX}:kline_ext`;

export const REDIS_TOPIC_FUNDING_RATE = `${REDIS_TOPIC_PREFIX}:funding_rate`;
export const REDIS_TOPIC_OKEX_FUNDING_RATE = `${REDIS_TOPIC_PREFIX}:okex_funding_rate`;
export const REDIS_HB10_TOPIC = `${REDIS_TOPIC_PREFIX}:hb10`;

export const REDIS_TOPIC_BTC_VOLUME_RATIO = `${REDIS_TOPIC_PREFIX}:btc_volume_ratio`;

export const FUNDING_RATES_DIR = '/tmp/data/funding_rates';
