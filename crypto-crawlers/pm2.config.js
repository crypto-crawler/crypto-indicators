const apps = [
  {
    name: 'crawler_okex_funding_rate',
    script: 'dist/cli.js',
    args: 'crawler_okex_funding_rate',
    exec_mode: 'fork', // cluster mode is incompatible with pm2-runtime !!!
    instances: 1,
  },
  {
    name: 'crawler_funding_rate',
    script: 'dist/cli.js',
    args: 'crawler_funding_rate',
    exec_mode: 'fork',
    instances: 1,
    cron_restart: '1 0 * * *',
    autorestart: false,
  },
  {
    name: 'crawler_hb10',
    script: 'dist/cli.js',
    args: 'crawler_hb10',
    exec_mode: 'fork',
    instances: 1,
  },
  {
    name: 'crawler_spot_index_price',
    script: 'dist/cli.js',
    args: 'crawler_spot_index_price',
    exec_mode: 'fork',
    instances: 1,
  },
  {
    name: 'crawler_bitmex_instrument',
    script: 'dist/cli.js',
    args: 'crawler_bitmex_instrument',
    exec_mode: 'fork',
    instances: 1,
  },
];

['Binance', 'Huobi', 'OKEx']
  .flatMap((exchange) => ['Spot', 'Swap'].map((marketType) => ({ exchange, marketType })))
  .forEach((x) => {
    apps.push({
      name: `crawler-ticker-${x.exchange}-${x.marketType}`,
      script: 'dist/cli.js',
      args: `crawler_ticker ${x.exchange} ${x.marketType}`,
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
    });
  });

[
  { exchange: 'Binance', marketType: 'Spot' },
  { exchange: 'Binance', marketType: 'Swap' },
  { exchange: 'BitMEX', marketType: 'Swap' },
  { exchange: 'Huobi', marketType: 'Spot' },
  { exchange: 'Huobi', marketType: 'Swap' },
  { exchange: 'OKEx', marketType: 'Spot' },
  { exchange: 'OKEx', marketType: 'Swap' },
].forEach((x) => {
  apps.push({
    name: `crawler-kline-${x.exchange}-${x.marketType}`,
    script: 'dist/cli.js',
    args: `crawler_kline ${x.exchange} ${x.marketType}`,
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
  });
});

module.exports = {
  apps,
};
