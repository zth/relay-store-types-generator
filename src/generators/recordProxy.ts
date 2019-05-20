import {
  MethodTargetContainer,
  ParsedSchema,
  TEnum,
  TObject,
  TScalar,
  TUnion
} from '../types';
import * as t from '@babel/types';
import {
  generateMethodImplementationVariant,
  getMethodDefinition,
  getOverloadedMethodReference,
  getTypeFromName,
  makeArray,
  makeExact,
  makeFullyNullableArray,
  makeNullable,
  makeTypeReference,
  typeToTypeAnnotation
} from '../typeHelpers';
import {
  getGetLinkedRecordFunctionName,
  getGetLinkedRecordsFunctionName,
  getGetOrCreateLinkedRecordFunctionName,
  getGetValueFunctionName,
  getRecordProxyName,
  getSetLinkedRecordFunctionName,
  getSetLinkedRecordsFunctionName,
  getSetValueFunctionName,
  getTypeReferenceName
} from '../nameGenerators';
import { makeArgsObj } from './args';

export function generateRecordProxy(
  owner: TObject,
  parsedSchema: ParsedSchema
) {
  const fields: {
    getSetValue: Array<
      MethodTargetContainer<TScalar> | MethodTargetContainer<TEnum>
    >;
    getSetLinkedRecord: Array<
      MethodTargetContainer<TObject> | MethodTargetContainer<TUnion>
    >;
    getSetLinkedRecords: Array<
      MethodTargetContainer<TObject> | MethodTargetContainer<TUnion>
    >;
  } = Object.values(owner.fields).reduce(
    (acc, field) => {
      const list = field.type.kind === 'LIST';
      const targetType =
        field.type.kind === 'LIST' ? field.type.inner : field.type;

      if (targetType.kind === 'LIST') {
        console.warn(
          `Failed to handle "${
            field.name
          }" due to: Nested lists support not implemented.`
        );

        // Bail early
        return acc;
      }

      const type = getTypeFromName(targetType.typeName, parsedSchema);

      switch (type.kind) {
        case 'SCALAR':
        case 'ENUM': {
          acc.getSetValue.push({ owner, field, type, list });
          break;
        }

        case 'UNION':
        case 'OBJECT_TYPE': {
          if (list) {
            acc.getSetLinkedRecords.push({ owner, field, type, list });
          } else {
            acc.getSetLinkedRecord.push({ owner, field, type, list });
          }
          break;
        }
      }

      return acc;
    },
    {
      getSetValue: [],
      getSetLinkedRecord: [],
      getSetLinkedRecords: []
    }
  );

  return [
    /**
     * Definitions of getValue/setValue functions
     */
    ...fields.getSetValue.flatMap(type => [
      /* getValue */
      generateMethodImplementationVariant(
        getGetValueFunctionName(type, owner),
        [
          t.functionTypeParam(
            t.identifier('key'),
            t.stringLiteralTypeAnnotation(type.field.name)
          ),
          makeArgsObj(type.field.arguments)
        ],
        makeNullable(typeToTypeAnnotation(type.type))
      ),
      /* setValue */
      generateMethodImplementationVariant(
        getSetValueFunctionName(type, owner),
        [
          t.functionTypeParam(
            t.identifier('value'),
            makeNullable(typeToTypeAnnotation(type.type))
          ),
          t.functionTypeParam(
            t.identifier('name'),
            t.stringLiteralTypeAnnotation(type.field.name)
          ),
          makeArgsObj(type.field.arguments)
        ],
        makeTypeReference(getRecordProxyName(owner))
      )
    ]),
    /**
     * Definitions of getLinkedRecord and related functions
     */
    ...fields.getSetLinkedRecord.flatMap(linkedRecord => [
      /* getOrCreateLinkedRecord */
      generateMethodImplementationVariant(
        getGetOrCreateLinkedRecordFunctionName(
          linkedRecord.owner,
          linkedRecord.field.name
        ),
        [
          t.functionTypeParam(
            t.identifier('name'),
            t.stringLiteralTypeAnnotation(linkedRecord.field.name)
          ),
          t.functionTypeParam(
            t.identifier('typeName'),
            t.stringLiteralTypeAnnotation(linkedRecord.type.name)
          ),
          makeArgsObj(linkedRecord.field.arguments)
        ],
        makeTypeReference(getTypeReferenceName(linkedRecord.type))
      ),

      /* getLinkedRecord */
      generateMethodImplementationVariant(
        getGetLinkedRecordFunctionName(
          linkedRecord.owner,
          linkedRecord.field.name
        ),
        [
          t.functionTypeParam(
            t.identifier('key'),
            t.stringLiteralTypeAnnotation(linkedRecord.field.name)
          ),
          makeArgsObj(linkedRecord.field.arguments)
        ],
        makeNullable(makeTypeReference(getTypeReferenceName(linkedRecord.type)))
      ),

      /* setLinkedRecord */
      generateMethodImplementationVariant(
        getSetLinkedRecordFunctionName(
          linkedRecord.owner,
          linkedRecord.field.name
        ),
        [
          t.functionTypeParam(
            t.identifier('record'),
            makeTypeReference(getTypeReferenceName(linkedRecord.type))
          ),
          t.functionTypeParam(
            t.identifier('name'),
            t.stringLiteralTypeAnnotation(linkedRecord.field.name)
          ),
          makeArgsObj(linkedRecord.field.arguments)
        ],
        makeTypeReference(getRecordProxyName(owner))
      )
    ]),

    /**
     * Definitions of getLinkedRecords/setLinkedRecords
     */
    ...fields.getSetLinkedRecords.flatMap(linkedRecord => [
      /* getLinkedRecords */
      generateMethodImplementationVariant(
        getGetLinkedRecordsFunctionName(
          linkedRecord.owner,
          linkedRecord.field.name
        ),
        [
          t.functionTypeParam(
            t.identifier('name'),
            t.stringLiteralTypeAnnotation(linkedRecord.field.name)
          ),
          makeArgsObj(linkedRecord.field.arguments)
        ],
        makeFullyNullableArray(
          makeTypeReference(getTypeReferenceName(linkedRecord.type))
        )
      ),

      /* setLinkedRecords */
      generateMethodImplementationVariant(
        getSetLinkedRecordsFunctionName(
          linkedRecord.owner,
          linkedRecord.field.name
        ),
        [
          t.functionTypeParam(
            t.identifier('records'),
            makeArray(
              makeNullable(
                makeTypeReference(getTypeReferenceName(linkedRecord.type))
              )
            )
          ),
          t.functionTypeParam(
            t.identifier('name'),
            t.stringLiteralTypeAnnotation(linkedRecord.field.name)
          ),
          makeArgsObj(linkedRecord.field.arguments)
        ],
        makeTypeReference(getRecordProxyName(owner))
      )
    ]),

    /**
     * The actual type declaration
     */
    t.exportNamedDeclaration(
      t.typeAlias(
        t.identifier(getRecordProxyName(owner)),
        null,
        makeExact(
          t.objectTypeAnnotation(
            [
              /* copyFieldsFrom */
              getMethodDefinition(
                'copyFieldsFrom',
                [
                  t.functionTypeParam(
                    t.identifier('source'),
                    makeTypeReference(getRecordProxyName(owner))
                  )
                ],
                t.voidTypeAnnotation()
              ),

              /* getDataID */
              getMethodDefinition('getDataID', [], t.stringTypeAnnotation()),

              /* getLinkedRecord */
              fields.getSetLinkedRecord.length > 0
                ? getOverloadedMethodReference(
                    'getLinkedRecord',
                    fields.getSetLinkedRecord.map(linkedRecord =>
                      makeTypeReference(
                        getGetLinkedRecordFunctionName(
                          linkedRecord.owner,
                          linkedRecord.field.name
                        )
                      )
                    )
                  )
                : null,

              /* getType */
              getMethodDefinition(
                'getType',
                [],
                t.stringLiteralTypeAnnotation(owner.name)
              ),

              /* getValue */
              fields.getSetValue.length > 0
                ? getOverloadedMethodReference(
                    'getValue',
                    fields.getSetValue.map(field =>
                      makeTypeReference(getGetValueFunctionName(field, owner))
                    )
                  )
                : null,

              /* setValue */
              fields.getSetValue.length > 0
                ? getOverloadedMethodReference(
                    'setValue',
                    fields.getSetValue.map(field =>
                      makeTypeReference(getSetValueFunctionName(field, owner))
                    )
                  )
                : null,

              /* setLinkedRecord */
              fields.getSetLinkedRecord.length > 0
                ? getOverloadedMethodReference(
                    'setLinkedRecord',
                    fields.getSetLinkedRecord.map(linkedRecord =>
                      makeTypeReference(
                        getSetLinkedRecordFunctionName(
                          linkedRecord.owner,
                          linkedRecord.field.name
                        )
                      )
                    )
                  )
                : null,

              /* getOrCreateLinkedRecord */
              fields.getSetLinkedRecord.length > 0
                ? getOverloadedMethodReference(
                    'getOrCreateLinkedRecord',
                    fields.getSetLinkedRecord.map(linkedRecord =>
                      makeTypeReference(
                        getGetOrCreateLinkedRecordFunctionName(
                          linkedRecord.owner,
                          linkedRecord.field.name
                        )
                      )
                    )
                  )
                : null,

              /* setLinkedRecords */
              fields.getSetLinkedRecords.length > 0
                ? getOverloadedMethodReference(
                    'setLinkedRecords',
                    fields.getSetLinkedRecords.map(linkedRecord =>
                      makeTypeReference(
                        getSetLinkedRecordsFunctionName(
                          linkedRecord.owner,
                          linkedRecord.field.name
                        )
                      )
                    )
                  )
                : null,

              /* getLinkedRecords */
              fields.getSetLinkedRecords.length > 0
                ? getOverloadedMethodReference(
                    'getLinkedRecords',
                    fields.getSetLinkedRecords.map(linkedRecord =>
                      makeTypeReference(
                        getGetLinkedRecordsFunctionName(
                          linkedRecord.owner,
                          linkedRecord.field.name
                        )
                      )
                    )
                  )
                : null
            ].filter(Boolean)
          )
        )
      ),
      [],
      null
    )
  ];
}
