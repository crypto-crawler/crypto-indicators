import { strict as assert } from 'assert';
import { FundingRateMsg } from 'crypto-crawler';
import { crawlRaw } from 'crypto-crawler/dist/crawler/okex';
import fetchMarkets from 'crypto-markets';
import * as kafka from 'kafka-node';
import yargs from 'yargs';
import { Heartbeat } from '../utils/heartbeat';
import { createLogger } from '../utils/logger';
import { KAFKA_OKEx_FUNDING_RATE_TOPIC } from './common';

function instrument_id_to_pair(instrument_id: string): string {
  const arr = instrument_id.split('-');
  return `${arr[0]}_${arr[1]}`;
}

const commandModule: yargs.CommandModule = {
  command: 'crawler_okex_funding_rate',
  describe: 'Crawl OKEx Swap funding rates',
  // eslint-disable-next-line no-shadow
  builder: (yargs) => yargs.options({}),
  handler: async () => {
    const markets = (await fetchMarkets('OKEx', 'Swap')).filter((m) => m.active);
    const channels = markets.map((m) => `swap/funding_rate:${m.baseId}-${m.quoteId}-SWAP`);
    assert.ok(channels.length > 0);

    const logger = createLogger(`crawler-okex-funding-rate`);
    const heartbeat = new Heartbeat(logger, 120);

    const publisher = new kafka.HighLevelProducer(
      new kafka.KafkaClient({
        clientId: 'crawler_okex_funding_rate',
        kafkaHost: process.env.KAFKA_HOST || 'localhost:9092',
      }),
    );

    crawlRaw(
      channels,
      async (obj): Promise<void> => {
        heartbeat.updateHeartbeat();

        const arr = obj.data as ReadonlyArray<{
          estimated_rate: string;
          funding_rate: string;
          funding_time: string;
          instrument_id: string;
          interest_rate: string;
          settlement_time: string;
        }>;

        const rates: readonly FundingRateMsg[] = arr.map((x) => ({
          exchange: 'OKEx',
          marketType: 'Swap',
          pair: instrument_id_to_pair(x.instrument_id),
          rawPair: x.instrument_id,
          channel: obj.table,
          channelType: 'FundingRate',
          timestamp: Date.now(),
          fundingRate: parseFloat(x.funding_rate),
          estimatedRate: parseFloat(x.estimated_rate),
          fundingTime: new Date(x.funding_time).getTime(),
          raw: x,
        }));

        const keyedMessages = rates.map(
          (rate) =>
            new kafka.KeyedMessage(
              `${rate.exchange}-${rate.marketType}-${rate.pair}-${rate.rawPair}-${rate.timestamp}`,
              JSON.stringify(rate),
            ),
        );
        const payloads: kafka.ProduceRequest[] = [
          { topic: KAFKA_OKEx_FUNDING_RATE_TOPIC, messages: keyedMessages },
        ];
        publisher.send(payloads, (err, data) => {
          if (err) {
            logger.error(err);
          } else {
            assert.equal(KAFKA_OKEx_FUNDING_RATE_TOPIC, Object.keys(data)[0]);
          }
        });
      },
    );
  },
};

export default commandModule;
