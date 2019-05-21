#!/usr/bin/env node
import 'array-flat-polyfill';
import * as program from 'commander';
import * as path from 'path';
import { Config } from './types';
import * as invariant from 'invariant';
import { parseSchema } from './parser';
import * as fs from 'fs';
import { generateAssets } from './generator';
import chalk from 'chalk';

program
  .description('Generate types for the Relay store using your GraphQL schema.')
  .option('--schema [path]', 'Path to schema.graphql')
  .option(
    '--custom-scalars-path [path]',
    'Path to file exporting custom scalars.'
  )
  .option('--out-dir [path]', 'Path to directory to output type file.')
  .option('--flow', 'Output Flow types.')
  .option('--typescript', 'Output TypeScript types.')
  .parse(process.argv);

const customScalars = program.customScalarsPath
  ? require(path.resolve(program.customScalarsPath))
  : null;

if (customScalars) {
  invariant(
    customScalars &&
      typeof customScalars === 'object' &&
      !Object.values(customScalars).find(val => typeof val !== 'string'),
    'customScalars file must export your custom scalars using module.export, and adhere to the shape { [customScalarName: string]: string }.'
  );
}

invariant(program.schema, 'You must include the path to your schema.graphql.');

invariant(
  program.outDir,
  'You must include a directory path to output the type file in.'
);

const config: Config = {
  schemaPath: path.resolve(program.schema),
  outDir: path.resolve(program.outDir),
  customScalars: customScalars || {},
  mode: program.flow ? 'FLOW' : 'TYPESCRIPT'
};

invariant(
  config.mode === 'FLOW',
  'Currently Flow-only, TypeScript coming soon!'
);

const parsedSchema = parseSchema(
  fs.readFileSync(path.resolve(config.schemaPath), 'utf8'),
  config
);

console.log(
  chalk.yellow(
    `Generating ${config.mode === 'FLOW' ? 'Flow' : 'TypeScript'} assets...`
  )
);

generateAssets(config, parsedSchema);

console.log(chalk.green('Done!'));
