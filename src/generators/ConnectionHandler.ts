import { FieldValue, ParsedSchema, TObject } from '../types';
import * as t from '@babel/types';
import {
  getMethodDefinition,
  generateMethodImplementationVariant,
  getOverloadedMethodReference,
  getTypeFromName,
  makeExact,
  makeNullable,
  makeOptional,
  makeTypeReference
} from '../typeHelpers';
import {
  getAllConnectionsUnionName,
  getConnectionHandlerCreateEdgeFunctionName,
  getConnectionHandlerGetConnectionFunctionName,
  getConnectionHandlerInsertEdgeFunctionName,
  getConnectionHandlerInsertEdgeUnionName,
  getRecordProxyName,
  getStoreTypeName
} from '../nameGenerators';

interface TConnectionInfo {
  owners: Array<TObject>;
  connectionObjectType: TObject;
  edgeObjectType: TObject;
}

function extractConnectionInfo(
  obj: TObject,
  parsedSchema: ParsedSchema
): TConnectionInfo | null {
  if (!isConnection(obj)) {
    return null;
  }

  const edges = obj.fields.edges;

  if (edges.type.kind === 'LIST' && edges.type.inner.kind === 'TYPE') {
    const edge = edges.type.inner;
    const edgeObjectType = getTypeFromName(edge.typeName, parsedSchema);
    if (edgeObjectType.kind === 'OBJECT_TYPE') {
      return {
        owners: parsedSchema.objectTypes
          .flatMap(ot =>
            Object.values(ot.fields).find(f =>
              isConnectionField(f, parsedSchema)
            )
              ? ot
              : null
          )
          .filter(Boolean),
        connectionObjectType: obj,
        edgeObjectType
      };
    }
  }

  return null;
}

function isConnection(obj: TObject): boolean {
  return !!(
    obj.name.endsWith('Connection') &&
    !!obj.fields.edges &&
    obj.fields.pageInfo
  );
}

function isConnectionField(
  field: FieldValue,
  parsedSchema: ParsedSchema
): boolean {
  if (field.type.kind !== 'TYPE') {
    return false;
  }

  const objType = parsedSchema.objectTypes.find(
    ot => field.type.kind === 'TYPE' && ot.name === field.type.typeName
  );

  return objType ? isConnection(objType) : false;
}

export function generateConnectionHandler(parsedSchema: ParsedSchema) {
  const connectionAggregate: {
    connections: Array<TConnectionInfo>;
    connectionOwners: Array<TObject>;
  } = parsedSchema.objectTypes.reduce(
    (acc, curr) => {
      if (isConnection(curr)) {
        acc.connections.push(extractConnectionInfo(curr, parsedSchema));
      }

      const connectionFields = Object.values(curr.fields).filter(f =>
        isConnectionField(f, parsedSchema)
      );

      if (connectionFields.length > 0) {
        acc.connectionOwners.push(curr);
      }

      return acc;
    },
    {
      connections: [],
      connectionOwners: []
    }
  );

  return [
    /* Output type functions */

    /* getConnection */
    ...connectionAggregate.connections.flatMap(co =>
      co.owners.flatMap(owner =>
        generateMethodImplementationVariant(
          getConnectionHandlerGetConnectionFunctionName(
            owner,
            co.connectionObjectType
          ),
          [
            t.functionTypeParam(
              t.identifier('record'),
              makeTypeReference(getRecordProxyName(owner))
            ),
            t.functionTypeParam(t.identifier('key'), t.stringTypeAnnotation())
          ],
          makeNullable(
            makeTypeReference(getRecordProxyName(co.connectionObjectType))
          )
        )
      )
    ),

    /* createEdge */
    ...connectionAggregate.connections.flatMap(co =>
      co.owners.flatMap(owner =>
        generateMethodImplementationVariant(
          getConnectionHandlerCreateEdgeFunctionName(
            owner,
            co.edgeObjectType.name
          ),
          [
            t.functionTypeParam(
              t.identifier('store'),
              makeTypeReference(getStoreTypeName())
            ),
            t.functionTypeParam(
              t.identifier('connection'),
              makeTypeReference(getRecordProxyName(co.connectionObjectType))
            ),
            t.functionTypeParam(
              t.identifier('node'),
              makeTypeReference(getRecordProxyName(owner))
            ),
            t.functionTypeParam(
              t.identifier('edgeType'),
              t.stringLiteralTypeAnnotation(co.edgeObjectType.name)
            )
          ],
          makeTypeReference(getRecordProxyName(co.edgeObjectType))
        )
      )
    ),

    /* insertEdgeBefore/after */
    ...connectionAggregate.connections.flatMap(co => [
      generateMethodImplementationVariant(
        getConnectionHandlerInsertEdgeFunctionName(co.connectionObjectType),
        [
          t.functionTypeParam(
            t.identifier('connection'),
            makeTypeReference(getRecordProxyName(co.connectionObjectType))
          ),
          t.functionTypeParam(
            t.identifier('newEdge'),
            makeTypeReference(getRecordProxyName(co.edgeObjectType))
          ),
          makeOptional(
            t.functionTypeParam(
              t.identifier('cursor'),
              makeNullable(t.stringTypeAnnotation())
            )
          )
        ],
        t.voidTypeAnnotation()
      )
    ]),

    /* Since insertEdge shares the same method, we can make a union here and just use that when outputting actual definitions */
    t.typeAlias(
      t.identifier(getConnectionHandlerInsertEdgeUnionName()),
      null,
      t.unionTypeAnnotation(
        connectionAggregate.connections.map(co =>
          makeTypeReference(
            getConnectionHandlerInsertEdgeFunctionName(co.connectionObjectType)
          )
        )
      )
    ),

    /* deleteNode takes any connection, so we output a union of that */
    t.typeAlias(
      t.identifier(getAllConnectionsUnionName()),
      null,
      t.unionTypeAnnotation(
        connectionAggregate.connections.map(co =>
          makeTypeReference(getRecordProxyName(co.connectionObjectType))
        )
      )
    ),

    /* Output actual definition */
    t.exportNamedDeclaration(
      t.typeAlias(
        t.identifier('Store$ConnectionHandler'),
        null,
        makeExact(
          t.objectTypeAnnotation([
            /* getConnection */
            getOverloadedMethodReference(
              'getConnection',
              connectionAggregate.connections.flatMap(co =>
                co.owners.flatMap(owner =>
                  makeTypeReference(
                    getConnectionHandlerGetConnectionFunctionName(
                      owner,
                      co.connectionObjectType
                    )
                  )
                )
              )
            ),

            /* createEdge */
            getOverloadedMethodReference(
              'createEdge',
              connectionAggregate.connections.flatMap(co =>
                co.owners.flatMap(owner =>
                  makeTypeReference(
                    getConnectionHandlerCreateEdgeFunctionName(
                      owner,
                      co.edgeObjectType.name
                    )
                  )
                )
              )
            ),

            /* insertEdgeBefore */
            getOverloadedMethodReference('insertEdgeBefore', [
              makeTypeReference(getConnectionHandlerInsertEdgeUnionName())
            ]),

            /* insertEdgeAfter */
            getOverloadedMethodReference('insertEdgeAfter', [
              makeTypeReference(getConnectionHandlerInsertEdgeUnionName())
            ]),

            /* deleteNode */
            getMethodDefinition(
              'deleteNode',
              [
                t.functionTypeParam(
                  t.identifier('connection'),
                  makeTypeReference(getAllConnectionsUnionName())
                ),
                t.functionTypeParam(
                  t.identifier('nodeID'),
                  t.stringTypeAnnotation()
                )
              ],
              t.voidTypeAnnotation()
            )
          ])
        )
      ),
      []
    )
  ];
}
