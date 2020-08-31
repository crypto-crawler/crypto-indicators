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

module.exports = {
  apps,
};
