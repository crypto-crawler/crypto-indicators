#!/usr/bin/env node
import yargs from 'yargs';
import crawlerBitMEXInstrumentModule from './crawlers/crawler_bitmex_instrument';
import crawlerFundingRateModule from './crawlers/crawler_funding_rate';
import crawlerHB10Module from './crawlers/crawler_hb10';
import crawlerOkexFundingRateModule from './crawlers/crawler_okex_funding_rate';
import crawlerSpotindexPriceModule from './crawlers/crawler_spot_index_price';
import crawlerTickerModule from './crawlers/crawler_ticker';
import crawlerTradeModule from './crawlers/crawler_trade';

// eslint-disable-next-line no-unused-expressions
yargs
  .command(crawlerBitMEXInstrumentModule)
  .command(crawlerHB10Module)
  .command(crawlerTickerModule)
  .command(crawlerTradeModule)
  .command(crawlerFundingRateModule)
  .command(crawlerOkexFundingRateModule)
  .command(crawlerSpotindexPriceModule)
  .wrap(null)
  .demandCommand(1, '').argv;
