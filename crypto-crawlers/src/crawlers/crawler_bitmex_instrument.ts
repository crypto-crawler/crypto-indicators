import { crawlInstrument } from 'crypto-crawler/dist/crawler/bitmex';
import yargs from 'yargs';
import { Publisher } from '../utils';
import { Heartbeat } from '../utils/heartbeat';
import { createLogger } from '../utils/logger';

const commandModule: yargs.CommandModule = {
  command: 'crawler_bitmex_instrument',
  describe: 'Crawl BitMEX instrument',
  // eslint-disable-next-line no-shadow
  builder: (yargs) => yargs.options({}),
  handler: async () => {
    const logger = createLogger(`crawler-BitMEX-instrument`);
    const heartbeat = new Heartbeat(logger);

    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

    const publisher = new Publisher<string>(REDIS_URL);

    await crawlInstrument(
      async (msg: string): Promise<void> => {
        heartbeat.updateHeartbeat();

        publisher.publish('crypto-crawlers:bitmex_instrument', msg);
      },
    );
  },
};

export default commandModule;
