import { MarketType } from 'crypto-markets';

export interface TimeBar {
  exchange: string;
  market_type: MarketType;
  pair: string;
  raw_pair: string;
  bar_size: number; // in second, BTC, ETH, USD, etc.
  timestamp: number; // end time
  timestamp_start: number; // start time

  open: number;
  high: number;
  low: number;
  close: number;
  mean: number;
  median: number;

  volume: number; // base volume
  volume_quote: number; // quote volume
  volume_sell: number; // base volume at sell side
  volume_buy: number; // base volume at buy side
  volume_quote_sell: number; // quote volume at sell side
  volume_quote_buy: number; // quote volume at buy side

  vwap: number; // volume weighted average price

  count: number; // number of trades
  count_sell: number; // number of sell trades
  count_buy: number; // number of buy trades
}
