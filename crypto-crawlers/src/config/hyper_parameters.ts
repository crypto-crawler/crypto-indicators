// ['10s', '1m', '3m', '5m', '15m', '30m', '1H', '4H']
export const TIME_BAR_SIZES: { [key: string]: number[] } = {
  BTC: [10, 60, 180, 300, 900, 1800, 3600, 14400],
  ETH: [10, 60, 180, 300, 900, 1800, 3600, 14400],
};

export const TICK_BAR_SIZES: { [key: string]: number[] } = {
  BTC: [16, 32, 64, 128],
  ETH: [8, 16, 32, 64],
};

export const VOLUME_BAR_SIZES: { [key: string]: number[] } = {
  BTC: [1, 2, 4, 8, 16, 32],
  ETH: [16, 32, 64, 128, 256, 512],
};

export const DOLLAR_BAR_SIZES: { [key: string]: number[] } = {
  BTC: [1, 2, 4, 8, 16, 32].map((x) => x * 10000),
  ETH: [4000, 8000, 16000, 32000, 64000, 128000],
};
