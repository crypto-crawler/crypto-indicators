import { crawlInstrument } from 'crypto-crawler/dist/crawler/bitmex';
import { createLogger, Heartbeat, Publisher } from 'utils';
import yargs from 'yargs';

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
