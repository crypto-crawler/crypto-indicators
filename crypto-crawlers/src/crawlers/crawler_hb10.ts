import { crawlHB10, HB10IndexMsg } from 'crypto-crawler/dist/crawler/huobi';
import { createLogger, Heartbeat, Publisher } from 'utils';
import yargs from 'yargs';
import { REDIS_HB10_TOPIC } from './common';

const commandModule: yargs.CommandModule = {
  command: 'crawler_hb10',
  describe: 'Crawl Huobi HB10 Index',
  // eslint-disable-next-line no-shadow
  builder: (yargs) => yargs.options({}),
  handler: async () => {
    const logger = createLogger(`crawler-hb10`);
    const heartbeat = new Heartbeat(logger);

    const publisher = new Publisher<HB10IndexMsg>(
      process.env.REDIS_URL || 'redis://localhost:6379',
    );

    crawlHB10(
      async (msg: HB10IndexMsg): Promise<void> => {
        heartbeat.updateHeartbeat();

        publisher.publish(REDIS_HB10_TOPIC, msg);
      },
    );
  },
};

export default commandModule;
