import Axios from 'axios';
import { Publisher } from 'utils';
import yargs from 'yargs';
import { REDIS_TOPIC_ETH_GAS_PRICE } from './common';

interface GasPriceMsg {
  rapid: number;
  fast: number;
  standard: number;
  slow: number;
  timestamp: number;
}

async function fetchGasNow(): Promise<GasPriceMsg | undefined> {
  const response = await Axios.get(
    'https://www.gasnow.org/api/v3/gas/price?utm_source=crypto-indicators',
  );
  if (!(response.status === 200 && response.data.code === 200)) {
    return undefined;
  }

  return response.data.data;
}

const commandModule: yargs.CommandModule = {
  command: 'crawler_gas_price',
  describe: 'Crawl Ethereum gas price from gasnow.org',
  // eslint-disable-next-line no-shadow
  builder: (yargs) => yargs.options({}),
  handler: async () => {
    const publisher = new Publisher<GasPriceMsg>(process.env.REDIS_URL || 'redis://localhost:6379');

    setInterval(async () => {
      const priceMsg = await fetchGasNow();

      if (priceMsg) {
        publisher.publish(REDIS_TOPIC_ETH_GAS_PRICE, priceMsg);
      }
    }, 15 * 1000); // every 15 seconds
  },
};

export default commandModule;
