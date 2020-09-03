import { strict as assert } from 'assert';
import { TradeMsg } from 'crypto-crawler';
import * as kafka from 'kafka-node';
import _ from 'lodash';
import yargs from 'yargs';
import { KAFKA_KLINE_EXT_TOPIC, REDIS_TOPIC_TRADE } from '../crawlers/common';
import { createLogger, Heartbeat, Subscriber } from '../utils';
import { TimeBar } from './time_bar';

const INTERVAL = 60000; // 1 minute in milliseconds

interface OHLCVMsg {
  open: number;
  high: number;
  low: number;
  close: number;

  mean: number;
  median: number;
}

function aggregate(nums: readonly number[]): OHLCVMsg {
  assert.ok(nums.length > 0);
  const open = nums[0];
  const close = nums[nums.length - 1];

  nums = [...nums].sort((x, y) => x - y); // eslint-disable-line no-param-reassign

  const high = nums[nums.length - 1];
  const low = nums[0];

  const mean = _.mean(nums);

  const mid = Math.ceil(nums.length / 2);

  const median = nums.length % 2 === 0 ? (nums[mid] + nums[mid - 1]) / 2 : nums[mid - 1];

  return {
    open,
    high,
    low,
    close,
    mean,
    median,
  };
}

function buildTimeBar(barTime: number, barSize: number, trades: readonly TradeMsg[]): TimeBar {
  trades = _.sortBy(_.uniqBy(trades, 'trade_id'), 'timestamp'); // eslint-disable-line no-param-reassign
  assert.ok(trades.length > 0);
  const { exchange, marketType, pair, rawPair } = trades[0];

  const priceOHLC: OHLCVMsg = aggregate(trades.map((x) => x.price));

  const volume = _.sum(trades.map((t) => t.quantity));
  const volume_sell = _.sum(trades.filter((t) => t.side).map((t) => t.quantity));
  const volume_buy = _.sum(trades.filter((t) => !t.side).map((t) => t.quantity));
  const volume_quote = _.sum(trades.map((t) => t.quantity * t.price));
  const volume_quote_sell = _.sum(trades.filter((t) => t.side).map((t) => t.quantity * t.price));
  const volume_quote_buy = _.sum(trades.filter((t) => !t.side).map((t) => t.quantity * t.price));

  const bar: TimeBar = {
    exchange,
    market_type: marketType,
    pair,
    raw_pair: rawPair,
    bar_size: barSize,
    timestamp: barTime,
    timestamp_start: trades[0].timestamp,
    ...priceOHLC,
    volume,
    volume_sell,
    volume_buy,
    volume_quote,
    volume_quote_sell,
    volume_quote_buy,

    vwap: volume_quote / volume,

    count: trades.length,
    count_sell: trades.filter((t) => t.side).length,
    count_buy: trades.filter((t) => !t.side).length,
  };

  return bar;
}

const commandModule: yargs.CommandModule = {
  command: 'kline_builder',
  describe: 'Merge trades into 1-minute klines',
  // eslint-disable-next-line no-shadow
  builder: (yargs) => yargs.options({}),
  handler: async () => {
    const publisher = new kafka.HighLevelProducer(
      new kafka.KafkaClient({
        clientId: 'kline_builder',
        kafkaHost: process.env.KAFKA_HOST || 'localhost:9092',
      }),
    );

    const logger = createLogger('kline-builder');
    const heartbeat = new Heartbeat(logger, 60);

    let barTimeEnd = Math.floor(Date.now() / INTERVAL) * INTERVAL;
    let barTimeBegin = barTimeEnd - INTERVAL;
    let nextBarTimeEnd = barTimeEnd + INTERVAL;

    let cache = new Map<string, TradeMsg[]>();
    let cacheNext = new Map<string, TradeMsg[]>();

    const subscriber = new Subscriber<TradeMsg>(
      async (msg): Promise<void> => {
        heartbeat.updateHeartbeat();

        const tradeMsg = msg as TradeMsg;

        if (tradeMsg.timestamp < barTimeBegin) {
          logger.error(
            `Expired msg, barTimeBegin: ${barTimeBegin}, tradeMsg: ${JSON.stringify(tradeMsg)}`,
          );
        } else if (tradeMsg.timestamp < nextBarTimeEnd) {
          const cacheTmp = tradeMsg.timestamp < barTimeBegin ? cache : cacheNext;

          const key = `${tradeMsg.exchange}-${tradeMsg.marketType}-${tradeMsg.pair}-${tradeMsg.rawPair}`;
          if (!cacheTmp.has(key)) {
            cacheTmp.set(key, []);
          }
          cacheTmp.get(key)!.push(tradeMsg);
        } else if (tradeMsg.timestamp < nextBarTimeEnd + INTERVAL) {
          // build 1-minute TimeBar and clear cache
          const bars = Array.from(cache.values()).map((trades) =>
            buildTimeBar(barTimeEnd, INTERVAL, trades),
          );

          barTimeBegin = barTimeEnd;
          barTimeEnd = nextBarTimeEnd;
          nextBarTimeEnd += INTERVAL;
          cache = cacheNext;
          cacheNext = new Map<string, TradeMsg[]>();

          // Send bars to Kafka
          const keyedMessages = bars.map(
            (bar) =>
              new kafka.KeyedMessage(
                `${bar.exchange}-${bar.market_type}-${bar.pair}-${bar.raw_pair}-${bar.timestamp}`,
                JSON.stringify(bar),
              ),
          );
          const payloads: kafka.ProduceRequest[] = [
            { topic: KAFKA_KLINE_EXT_TOPIC, messages: keyedMessages },
          ];
          publisher.send(payloads, (err, data) => {
            if (err) {
              logger.error(err);
            } else {
              assert.equal(KAFKA_KLINE_EXT_TOPIC, Object.keys(data)[0]);
            }
          });
        } else {
          logger.error(
            `Future msg, nextBarTimeEnd: ${nextBarTimeEnd}, tradeMsg: ${JSON.stringify(tradeMsg)}`,
          );
        }
      },
      REDIS_TOPIC_TRADE,
      process.env.REDIS_URL || 'redis://localhost:6379',
    );

    subscriber.run();
  },
};

export default commandModule;
