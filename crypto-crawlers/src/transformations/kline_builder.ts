import { strict as assert } from 'assert';
import { TradeMsg } from 'crypto-crawler';
import _ from 'lodash';
import yargs from 'yargs';
import { REDIS_TOPIC_KLINE_EXT, REDIS_TOPIC_TRADE } from '../crawlers/common';
import { createLogger, Publisher, Subscriber } from '../utils';
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
    const publisher = new Publisher<TimeBar>(process.env.REDIS_URL || 'redis://localhost:6379');

    const logger = createLogger('kline-builder');

    let prevBarTimeEnd = -1;
    let prevBarTimeBegin = -1;
    let curBarTimeEnd = -1;

    let cachePrev = new Map<string, TradeMsg[]>();
    let cache = new Map<string, TradeMsg[]>();

    const subscriber = new Subscriber<TradeMsg>(
      async (tradeMsg): Promise<void> => {
        const key = `${tradeMsg.exchange}-${tradeMsg.marketType}-${tradeMsg.pair}-${tradeMsg.rawPair}`;

        if (prevBarTimeEnd === -1) {
          prevBarTimeEnd = Math.floor(tradeMsg.timestamp / INTERVAL) * INTERVAL;
          prevBarTimeBegin = prevBarTimeEnd - INTERVAL;
          curBarTimeEnd = prevBarTimeEnd + INTERVAL;
        }

        if (tradeMsg.timestamp < prevBarTimeBegin) {
          logger.error(
            `Expired msg, prevBarTimeBegin: ${prevBarTimeBegin}, tradeMsg: ${JSON.stringify(
              tradeMsg,
            )}`,
          );
        } else if (tradeMsg.timestamp < prevBarTimeEnd) {
          if (!cachePrev.has(key)) {
            cachePrev.set(key, []);
          }
          cachePrev.get(key)!.push(tradeMsg);
        } else if (tradeMsg.timestamp < curBarTimeEnd) {
          if (!cache.has(key)) {
            cache.set(key, []);
          }
          cache.get(key)!.push(tradeMsg);
        } else {
          // build 1-minute TimeBar from cachePrev
          const bars = Array.from(cachePrev.values()).map((trades) =>
            buildTimeBar(prevBarTimeEnd, INTERVAL, trades),
          );
          bars.forEach((bar) => publisher.publish(REDIS_TOPIC_KLINE_EXT, bar));

          prevBarTimeEnd = Math.floor(tradeMsg.timestamp / INTERVAL) * INTERVAL;
          prevBarTimeBegin = prevBarTimeEnd - INTERVAL;
          curBarTimeEnd = prevBarTimeEnd + INTERVAL;

          cachePrev = cache;
          cache = new Map<string, TradeMsg[]>();
          cache.set(key, [tradeMsg]);
        }
      },
      REDIS_TOPIC_TRADE,
      process.env.REDIS_URL || 'redis://localhost:6379',
    );

    subscriber.run();
  },
};

export default commandModule;
