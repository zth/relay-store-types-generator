import * as t from '@babel/types';
import { getInterfaceName, getRecordProxyName } from '../nameGenerators';
import { makeTypeReference } from '../typeHelpers';
import { ParsedSchema } from '../types';

export function generateInterfaces(parsedSchema: ParsedSchema) {
  return parsedSchema.interfaceTypes.map(it =>
    t.exportNamedDeclaration(
      t.typeAlias(
        t.identifier(getInterfaceName(it.name)),
        null,
        t.unionTypeAnnotation(
          parsedSchema.objectTypes
            .filter(ot => ot.implementsInterfaces.includes(it.name))
            .map(objType => makeTypeReference(getRecordProxyName(objType)))
        )
      ),
      []
    )
  );
}
