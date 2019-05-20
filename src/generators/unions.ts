import * as t from '@babel/types';
import { getRecordProxyName, getUnionName } from '../nameGenerators';
import { makeTypeReference } from '../typeHelpers';
import { ParsedSchema } from '../types';

export function generateUnions(parsedSchema: ParsedSchema) {
  return parsedSchema.unionTypes.map(ut =>
    t.exportNamedDeclaration(
      t.typeAlias(
        t.identifier(getUnionName(ut.name)),
        null,
        t.unionTypeAnnotation(
          ut.typeNames
            .map(tName => {
              const objType = parsedSchema.objectTypes.find(
                ot => ot.name === tName
              );

              if (objType) {
                return makeTypeReference(getRecordProxyName(objType));
              }

              return null;
            })
            .filter(Boolean)
        )
      ),
      []
    )
  );
}
