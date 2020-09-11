import { TickerMsg } from 'crypto-crawler';
import { MarketType } from 'crypto-markets';
import { Publisher, Subscriber } from 'utils';
import yargs from 'yargs';
import { REDIS_TOPIC_BTC_VOLUME_RATIO, REDIS_TOPIC_TICKER } from '../crawlers/common';

interface BTCVolumeRatioMsg {
  exchange: string;
  marketType: MarketType;
  pair: string;
  base: string;
  quote: string;
  timestamp: number;
  quoteVolume: number;
  btcQuoteVolume: number;
}

const commandModule: yargs.CommandModule = {
  command: 'btc_volume_ratio',
  describe: 'Divide by BTC trading volume',
  // eslint-disable-next-line no-shadow
  builder: (yargs) => yargs.options({}),
  handler: async () => {
    const publisher = new Publisher<BTCVolumeRatioMsg>(
      process.env.REDIS_URL || 'redis://localhost:6379',
    );
    // `${exchange}-${marketType}-{USD|USDT}` => pairs
    const btcVolumeMap = new Map<string, number>();

    const subscriber = new Subscriber<TickerMsg>(
      async (tickerMsg): Promise<void> => {
        if (!tickerMsg.pair.includes('_USD')) return;

        const cacheKey = `${tickerMsg.exchange}-${tickerMsg.marketType}-${
          tickerMsg.pair.split('_')[1]
        }`;

        if (tickerMsg.pair === 'BTC_USD' || tickerMsg.pair === 'BTC_USDT') {
          btcVolumeMap.set(cacheKey, tickerMsg.quoteVolume);
        } else {
          if (!btcVolumeMap.has(cacheKey)) return;

          const btcVolume = btcVolumeMap.get(cacheKey)!;

          const msg: BTCVolumeRatioMsg = {
            exchange: tickerMsg.exchange,
            marketType: tickerMsg.marketType,
            pair: tickerMsg.pair,
            base: tickerMsg.pair.split('_')[0],
            quote: tickerMsg.pair.split('_')[1],
            timestamp: tickerMsg.timestamp,
            quoteVolume: tickerMsg.quoteVolume,
            btcQuoteVolume: btcVolume,
          };
          publisher.publish(REDIS_TOPIC_BTC_VOLUME_RATIO, msg);
        }
      },
      REDIS_TOPIC_TICKER,
      process.env.REDIS_URL || 'redis://localhost:6379',
    );

    subscriber.run();
  },
};

export default commandModule;
