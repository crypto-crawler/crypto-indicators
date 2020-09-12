#!/usr/bin/env node
import yargs from 'yargs';
import crawlerBlockHeader from './crawlers/crawler_block_header';
import crawlerGasPriceModule from './crawlers/crawler_gas_price';

// eslint-disable-next-line no-unused-expressions
yargs.command(crawlerBlockHeader).command(crawlerGasPriceModule).wrap(null).demandCommand(1, '')
  .argv;
