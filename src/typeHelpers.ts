import * as t from '@babel/types';
import {
  FlowType,
  FunctionTypeParam,
  ObjectTypeAnnotation
} from '@babel/types';
import { StringTypeAnnotation } from '@babel/types';
import { BooleanTypeAnnotation } from '@babel/types';
import { NumberTypeAnnotation } from '@babel/types';
import { AnyTypeAnnotation } from '@babel/types';
import {
  ParsedSchema,
  ScalarObj,
  TEnum,
  TInterface,
  TObject,
  TTypes,
  TUnion,
  TypeContainer
} from './types';
import {
  getEnumName,
  getInterfaceName,
  getRecordProxyName,
  getUnionName
} from './nameGenerators';

const customScalars: ScalarObj = {
  Datetime: 'string',
  Cursor: 'string'
};

export function makeArray(type: FlowType) {
  return t.genericTypeAnnotation(
    t.identifier('Array'),
    t.typeParameterInstantiation([type])
  );
}

export function enumToTypeAnnotationReference(e: TEnum) {
  return makeTypeReference(getEnumName(e.name));
}

export function objectTypeToTypeAnnotationReference(type: TObject) {
  return makeTypeReference(getRecordProxyName(type));
}

export function interfaceToTypeAnnotationReference(type: TInterface) {
  return makeTypeReference(getInterfaceName(type.name));
}

export function unionToTypeAnnotationReference(type: TUnion) {
  return makeTypeReference(getUnionName(type.name));
}

export function typeToTypeAnnotation(type: TTypes) {
  switch (type.kind) {
    case 'SCALAR':
      return scalarToTypeAnnotation(type.type);
    case 'ENUM':
      return enumToTypeAnnotationReference(type);
    case 'OBJECT_TYPE':
      return objectTypeToTypeAnnotationReference(type);
    case 'INTERFACE':
      return interfaceToTypeAnnotationReference(type);
    case 'UNION':
      return unionToTypeAnnotationReference(type);
  }
}

export function mapTypeContainerToType(
  fieldName: string,
  typeContainer: TypeContainer,
  parsedSchema: ParsedSchema
): TTypes | null {
  switch (typeContainer.kind) {
    case 'LIST': {
      const inner = typeContainer.inner;

      if (inner.kind !== 'TYPE') {
        console.warn(
          `Failed to handle "${fieldName}" due to: Nested lists support not implemented.`
        );

        // Bail early
        return null;
      }

      return getTypeFromName(inner.typeName, parsedSchema);
    }

    case 'TYPE': {
      return getTypeFromName(typeContainer.typeName, parsedSchema);
    }
  }
}

export function scalarToTypeAnnotation(
  scalar: string
):
  | StringTypeAnnotation
  | BooleanTypeAnnotation
  | NumberTypeAnnotation
  | AnyTypeAnnotation {
  switch (scalar) {
    case 'string':
      return t.stringTypeAnnotation();
    case 'number':
      return t.numberTypeAnnotation();
    case 'boolean':
      return t.booleanTypeAnnotation();
    default:
      console.warn(`Could not map scalar "${scalar}" to type.`);
      return t.anyTypeAnnotation();
  }
}

export function getEnum(name: string, values: Array<FlowType>) {
  return t.exportNamedDeclaration(
    t.typeAlias(
      t.identifier(getEnumName(name)),
      null,
      t.unionTypeAnnotation(values)
    ),
    []
  );
}

export function getMethodDefinition(
  identifier: string,
  params: Array<FunctionTypeParam>,
  returnType: FlowType
) {
  return t.objectTypeProperty(
    t.identifier(identifier),
    t.functionTypeAnnotation(null, params, null, returnType)
  );
}

export function getOverloadedMethodReference(
  identifier: string,
  references: Array<FlowType>
) {
  return t.objectTypeProperty(
    t.identifier(identifier),
    t.intersectionTypeAnnotation(references)
  );
}

export function makeTypeReference(name: string) {
  return t.genericTypeAnnotation(t.identifier(name));
}

export function generateMethodImplementationVariant(
  name: string,
  params: Array<FunctionTypeParam>,
  returnType: FlowType
) {
  return t.typeAlias(
    t.identifier(name),
    null,
    t.functionTypeAnnotation(null, params, null, returnType)
  );
}

export function makeNullable(type: FlowType) {
  return t.nullableTypeAnnotation(type);
}

export function makeFullyNullableArray(innerType: FlowType) {
  return makeNullable(makeArray(makeNullable(innerType)));
}

export function getTypeFromName(
  name: string,
  parsedSchema: ParsedSchema
): TTypes | null {
  if (isScalar(name, customScalars)) {
    return {
      kind: 'SCALAR',
      name,
      type: getScalarName(name, customScalars)
    };
  }

  return (
    parsedSchema.interfaceTypes.find(it => it.name === name) ||
    parsedSchema.unionTypes.find(ut => ut.name === name) ||
    parsedSchema.objectTypes.find(ot => ot.name === name) ||
    parsedSchema.enumTypes.find(et => et.name === name) ||
    null
  );
}

export function isScalar(valueName: string, customScalars: ScalarObj): boolean {
  return (
    ['Int', 'Boolean', 'Float', 'String', 'ID'].includes(valueName) ||
    !!customScalars[valueName]
  );
}

export function getScalarName(
  scalar: string,
  customScalars: ScalarObj
): string {
  if (customScalars[scalar]) {
    return customScalars[scalar];
  }

  switch (scalar) {
    case 'Int':
    case 'Float':
      return 'number';
    case 'ID':
    case 'String':
      return 'string';
    case 'Boolean':
      return 'boolean';
    default:
      return 'any';
  }
}

export function makeExact(type: ObjectTypeAnnotation): ObjectTypeAnnotation {
  type.exact = true;
  return type;
}

export function makeOptional(type: FunctionTypeParam): FunctionTypeParam {
  type.optional = true;
  return type;
}
