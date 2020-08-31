import { strict as assert } from 'assert';
import { crawlHB10, HB10IndexMsg } from 'crypto-crawler/dist/crawler/huobi';
import * as kafka from 'kafka-node';
import yargs from 'yargs';
import { Heartbeat } from '../utils/heartbeat';
import { createLogger } from '../utils/logger';
import { KAFKA_HB10_TOPIC } from './common';

const commandModule: yargs.CommandModule = {
  command: 'crawler_hb10',
  describe: 'Crawl Huobi HB10 Index',
  // eslint-disable-next-line no-shadow
  builder: (yargs) => yargs.options({}),
  handler: async () => {
    const logger = createLogger(`crawler-hb10`);
    const heartbeat = new Heartbeat(logger);

    const publisher = new kafka.HighLevelProducer(
      new kafka.KafkaClient({
        clientId: 'crawler_hb10',
        kafkaHost: process.env.KAFKA_HOST || 'localhost:9092',
      }),
    );

    crawlHB10(
      async (msg: HB10IndexMsg): Promise<void> => {
        heartbeat.updateHeartbeat();

        const km = new kafka.KeyedMessage(
          `${msg.exchange}-${msg.id}-${msg.interval}`,
          JSON.stringify(msg),
        );
        const payloads: kafka.ProduceRequest[] = [{ topic: KAFKA_HB10_TOPIC, messages: [km] }];
        publisher.send(payloads, (err, data) => {
          if (err) {
            logger.error(err);
          }
          assert.equal(KAFKA_HB10_TOPIC, Object.keys(data)[0]);
        });
      },
    );
  },
};

export default commandModule;
