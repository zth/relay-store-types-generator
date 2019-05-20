import generate from '@babel/generator';
import * as t from '@babel/types';
import * as fs from 'fs';
import * as prettier from 'prettier';
import { generateUnions } from './generators/unions';
import { getEnum, makeTypeReference } from './typeHelpers';
import { getAllRecordProxiesName, getRecordProxyName } from './nameGenerators';
import { generateRecordSourceSelectorProxy } from './generators/recordSourceSelectorProxy';
import { generateEnums } from './generators/enums';
import { generateRecordProxy } from './generators/recordProxy';
import { generateInterfaces } from './generators/interfaces';
import { generateConnectionHandler } from './generators/ConnectionHandler';
import { Config, ParsedSchema } from './types';
import * as path from 'path';

export function generateAssets(config: Config, parsedSchema: ParsedSchema) {
  const fileExtension = config.mode === 'FLOW' ? '.js.flow' : '.ts';

  fs.writeFileSync(
    path.resolve(config.outDir + '/relay-store-types' + fileExtension),
    prettier.format(
      generate(
        t.program([
          /* Unions */
          ...generateUnions(parsedSchema),

          /* Interfaces */
          ...generateInterfaces(parsedSchema),

          /* Enums */
          ...generateEnums(parsedSchema),

          /* RecordProxies */
          ...parsedSchema.objectTypes.flatMap(ot =>
            generateRecordProxy(ot, parsedSchema)
          ),

          /* Enum for all record proxies */
          getEnum(
            getAllRecordProxiesName(),
            parsedSchema.objectTypes.map(ot =>
              makeTypeReference(getRecordProxyName(ot))
            )
          ),

          /* Store */
          ...generateRecordSourceSelectorProxy(parsedSchema),

          /* ConnectionHandler */
          ...generateConnectionHandler(parsedSchema)
        ]),
        {
          auxiliaryCommentBefore: `${
            config.mode === 'FLOW' ? ' @flow strict-local\n' : ''
          } THIS FILE IS AUTO-GENERATED, PLEASE DO NOT EDIT `
        }
      ).code,
      {
        parser: config.mode === 'FLOW' ? 'flow' : 'typescript',
        semi: true,
        singleQuote: true
      }
    )
  );
}
