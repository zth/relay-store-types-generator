import * as t from '@babel/types';
import {
  getMethodDefinition,
  generateMethodImplementationVariant,
  getOverloadedMethodReference,
  makeExact,
  makeFullyNullableArray,
  makeNullable,
  makeTypeReference,
  mapTypeContainerToType,
  typeToTypeAnnotation
} from '../typeHelpers';

import {
  getAllRecordProxiesName,
  getCreateFunctionName,
  getEnumName,
  getGetPluralRootFieldFunctionName,
  getGetRootFieldFunctionName,
  getRecordProxyName,
  getStoreTypeName
} from '../nameGenerators';
import { FieldValue, ParsedSchema, TTypes } from '../types';
import { makeArgsObj } from './args';

export function generateRecordSourceSelectorProxy(parsedSchema: ParsedSchema) {
  const simpleRootFields: Array<{
    field: FieldValue;
    type: TTypes;
  }> = parsedSchema.rootFields.reduce((acc, curr) => {
    if (curr.type.kind === 'TYPE') {
      acc.push({
        field: curr,
        type: mapTypeContainerToType(curr.name, curr.type, parsedSchema)
      });
    }
    return acc;
  }, []);

  const pluralRootFields: Array<{
    field: FieldValue;
    type: TTypes;
  }> = parsedSchema.rootFields.reduce((acc, curr) => {
    if (curr.type.kind === 'LIST') {
      acc.push({
        field: curr,
        type: mapTypeContainerToType(curr.name, curr.type.inner, parsedSchema)
      });
    }
    return acc;
  }, []);

  const storeDef = makeExact(
    t.objectTypeAnnotation(
      [
        /* create */
        getOverloadedMethodReference(
          'create',
          parsedSchema.objectTypes.map(obj =>
            makeTypeReference(getCreateFunctionName(obj))
          )
        ),

        /* delete */
        getMethodDefinition(
          'delete',
          [
            t.functionTypeParam(
              t.identifier('dataID'),
              t.stringTypeAnnotation()
            )
          ],
          t.voidTypeAnnotation()
        ),

        /* get */
        getMethodDefinition(
          'get',
          [
            t.functionTypeParam(
              t.identifier('dataID'),
              t.stringTypeAnnotation()
            )
          ],
          makeNullable(
            makeTypeReference(getEnumName(getAllRecordProxiesName()))
          )
        ),

        /* getRoot */
        getMethodDefinition(
          'getRoot',
          [],
          makeTypeReference(getRecordProxyName(parsedSchema.rootType))
        ),

        /* getRootField */
        simpleRootFields.length > 0
          ? getOverloadedMethodReference(
              'getRootField',
              simpleRootFields.map(rf =>
                makeTypeReference(getGetRootFieldFunctionName(rf.field))
              )
            )
          : null,

        /* getPluralRootField */
        pluralRootFields.length > 0
          ? getOverloadedMethodReference(
              'getPluralRootField',
              pluralRootFields.map(rf =>
                makeTypeReference(getGetPluralRootFieldFunctionName(rf.field))
              )
            )
          : null
      ].filter(Boolean)
    )
  );

  return [
    /* create */
    ...parsedSchema.objectTypes.map(obj =>
      generateMethodImplementationVariant(
        getCreateFunctionName(obj),
        [
          t.functionTypeParam(t.identifier('dataID'), t.stringTypeAnnotation()),
          t.functionTypeParam(
            t.identifier('typeName'),
            t.stringLiteralTypeAnnotation(obj.name)
          )
        ],
        makeTypeReference(getRecordProxyName(obj))
      )
    ),

    /* getRootField */
    ...simpleRootFields
      .map(rootField => {
        if (!rootField.type) {
          return null;
        }

        return generateMethodImplementationVariant(
          getGetRootFieldFunctionName(rootField.field),
          [
            t.functionTypeParam(
              t.identifier('fieldName'),
              t.stringLiteralTypeAnnotation(rootField.field.name)
            ),
            makeArgsObj(rootField.field.arguments)
          ],
          makeNullable(typeToTypeAnnotation(rootField.type))
        );
      })
      .filter(Boolean),

    /* getPluralRootField */
    ...pluralRootFields.map(rootField =>
      generateMethodImplementationVariant(
        getGetPluralRootFieldFunctionName(rootField.field),
        [
          t.functionTypeParam(
            t.identifier('fieldName'),
            t.stringLiteralTypeAnnotation(rootField.field.name)
          ),
          makeArgsObj(rootField.field.arguments)
        ],
        makeFullyNullableArray(typeToTypeAnnotation(rootField.type))
      )
    ),

    /* Actual declaration */
    t.exportNamedDeclaration(
      t.typeAlias(t.identifier(getStoreTypeName()), null, storeDef),
      []
    )
  ];
}
