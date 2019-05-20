import {
  FieldValue,
  TEnum,
  TInterface,
  TObject,
  TScalar,
  TUnion
} from './types';

export function getTypeReferenceName(
  obj: TEnum | TObject | TUnion | TInterface
): string {
  switch (obj.kind) {
    case 'OBJECT_TYPE':
      return getRecordProxyName(obj);
    case 'INTERFACE':
      return getInterfaceName(obj.name);
    case 'ENUM':
      return getEnumName(obj.name);
    case 'UNION':
      return getUnionName(obj.name);
  }
}

export function getRecordProxyName(obj: TObject): string {
  if (!obj) {
    return '';
  }

  return `RecordProxy$${obj.name}`;
}

export function getEnumName(name: string): string {
  return `Enum$${name}`;
}

export function getUnionName(name: string): string {
  return `Union$${name}`;
}

export function getInterfaceName(name: string): string {
  return `Interface$${name}`;
}

export function getGetLinkedRecordFunctionName(
  owner: TObject,
  fieldName: string
): string {
  return `${getRecordProxyName(owner)}$getLinkedRecord$${fieldName}`;
}

export function getGetLinkedRecordsFunctionName(
  owner: TObject,
  fieldName: string
): string {
  return `${getRecordProxyName(owner)}$getLinkedRecords$${fieldName}`;
}

export function getConnectionHandlerGetConnectionFunctionName(
  owner: TObject,
  connection: TObject
): string {
  return `ConnectionHandler$getConnection$${getRecordProxyName(
    owner
  )}$${getRecordProxyName(connection)}`;
}

export function getConnectionHandlerCreateEdgeFunctionName(
  owner: TObject,
  edgeName: string
): string {
  return `ConnectionHandler$createEdge$${owner.name}$${edgeName}`;
}

export function getConnectionHandlerInsertEdgeFunctionName(
  connection: TObject
): string {
  return `ConnectionHandler$insertEdge$${connection.name}`;
}

export function getGetOrCreateLinkedRecordFunctionName(
  ownerObj: TObject,
  fieldName: string
): string {
  return `${getRecordProxyName(ownerObj)}$getOrCreateLinkedRecord$${fieldName}`;
}

export function getSetLinkedRecordFunctionName(
  owner: TObject,
  fieldName: string
): string {
  return `${getRecordProxyName(owner)}$setLinkedRecord$${fieldName}`;
}

export function getSetLinkedRecordsFunctionName(
  owner: TObject,
  fieldName: string
): string {
  return `${getRecordProxyName(owner)}$setLinkedRecords$${fieldName}`;
}

export function getGetValueFunctionName(
  field: {
    field: FieldValue;
    type: TScalar | TEnum;
  },
  obj: TObject
): string {
  return `${getRecordProxyName(obj)}$getValue$${field.field.name}`;
}

export function getAllRecordProxiesName(): string {
  return 'Store$AllRecordProxyTypes';
}

export function getSetValueFunctionName(
  field: {
    field: FieldValue;
    type: TScalar | TEnum;
  },
  obj: TObject
): string {
  return `${getRecordProxyName(obj)}$setValue$${field.field.name}`;
}

export function getStoreTypeName(): string {
  return 'Store$RecordSourceSelectorProxy';
}

export function getCreateFunctionName(obj: TObject): string {
  return `Store$${getRecordProxyName(obj)}$create`;
}

export function getGetRootFieldFunctionName(fieldValue: FieldValue): string {
  return `Store$getRootField$${fieldValue.name}`;
}

export function getGetPluralRootFieldFunctionName(
  fieldValue: FieldValue
): string {
  return `Store$getPluralRootField$${fieldValue.name}`;
}

export function getConnectionHandlerInsertEdgeUnionName(): string {
  return `ConnectionHandler$insertEdgeUnion`;
}

export function getAllConnectionsUnionName(): string {
  return `Store$allConnections`;
}
