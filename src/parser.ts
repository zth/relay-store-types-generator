import {
  Argument,
  FieldValue,
  ObjectFieldsType,
  ParsedSchema,
  TEnum,
  TInterface,
  TObject,
  TUnion,
  TypeContainer
} from './types';
import * as invariant from 'invariant';
import {
  InputValueDefinitionNode,
  ObjectTypeDefinitionNode,
  parse,
  TypeNode
} from 'graphql';

export function parseSchema(rawSchema: string): ParsedSchema {
  const parsedSchema = parse(rawSchema);

  const enumTypes: Array<TEnum> = [];
  const objectTypes: Array<TObject> = [];
  const customScalars: Array<string> = [];
  const rootFields: Array<FieldValue> = [];
  const interfaceTypes: Array<TInterface> = [];
  const unionTypes: Array<TUnion> = [];

  let rootType: TObject;

  const schemaTypes: Array<{
    operation: 'mutation' | 'query' | 'subscription';
    name: string;
  }> = [];

  parsedSchema.definitions.forEach(definition => {
    switch (definition.kind) {
      case 'SchemaDefinition': {
        definition.operationTypes.forEach(ot => {
          schemaTypes.push({
            operation: ot.operation,
            name: ot.type.name.value
          });
        });

        break;
      }
      case 'UnionTypeDefinition': {
        unionTypes.push({
          kind: 'UNION',
          name: definition.name.value,
          typeNames: definition.types.map(type => type.name.value)
        });
        break;
      }
      case 'ScalarTypeDefinition':
        customScalars.push(definition.name.value);
        break;
      case 'EnumTypeDefinition': {
        enumTypes.push({
          kind: 'ENUM',
          name: definition.name.value,
          values: definition.values.map(value => value.name.value)
        });
        break;
      }
      case 'InterfaceTypeDefinition': {
        interfaceTypes.push({ kind: 'INTERFACE', name: definition.name.value });
        break;
      }
      case 'ObjectTypeDefinition':
        {
          /**
           * Sometimes there's no schema definition, in which case we'll need to
           * pick up the definitions here.
           */
          if (definition.name.value === 'Query') {
            schemaTypes.push({
              name: definition.name.value,
              operation: 'query'
            });
          } else if (definition.name.value === 'Mutation') {
            schemaTypes.push({
              name: definition.name.value,
              operation: 'mutation'
            });
          }
        }

        objectTypes.push({
          kind: 'OBJECT_TYPE',
          name: definition.name.value,
          fields: mapFields(definition),
          implementsInterfaces: definition.interfaces.map(
            iface => iface.name.value
          )
        });
        break;
    }
  });

  /**
   * Remove schema operation object types and add them to root fields.
   */

  schemaTypes.forEach(schemaType => {
    if (schemaType.operation === 'subscription') {
      console.warn(
        `Handling of subscription fields not implemented, ignoring for now.`
      );
      return;
    }

    const objType = objectTypes.find(ot => ot.name === schemaType.name);

    if (objType) {
      rootFields.push(...Object.values(objType.fields).filter(Boolean));

      if (schemaType.operation === 'query') {
        rootType = objType;
      }

      /**
       * Remove the mutation specific object type.
       * We keep the query operation object type because we need it
       * for getRoot()
       */
      if (schemaType.operation === 'mutation') {
        objectTypes.splice(
          objectTypes.findIndex(ot => ot.name === schemaType.name),
          1
        );
      }
    }
  });

  invariant(rootType, 'Could not extract root type.');

  return {
    enumTypes,
    objectTypes,
    customScalars,
    rootFields,
    interfaceTypes,
    unionTypes,
    rootType
  };
}

function resolveRelevantArgumentNode(
  field: InputValueDefinitionNode
): Argument {
  return {
    name: field.name.value,
    nullable: field.type.kind !== 'NonNullType',
    type: mapTypeNodeToContainer(field.type)
  };
}

function mapTypeNodeToContainer(type: TypeNode): TypeContainer {
  if (type.kind === 'NonNullType') {
    return type.type.kind === 'ListType'
      ? {
          kind: 'LIST',
          nullable: false,
          inner: mapTypeNodeToContainer(type.type.type)
        }
      : {
          kind: 'TYPE',
          nullable: false,
          typeName: type.type.name.value
        };
  }

  return type.kind === 'ListType'
    ? {
        kind: 'LIST',
        nullable: true,
        inner: mapTypeNodeToContainer(type.type)
      }
    : {
        kind: 'TYPE',
        nullable: true,
        typeName: type.name.value
      };
}

function mapFields(definition: ObjectTypeDefinitionNode): ObjectFieldsType {
  const objectFields: ObjectFieldsType = {};

  definition.fields.forEach(field => {
    objectFields[field.name.value] = {
      name: field.name.value,
      type: mapTypeNodeToContainer(field.type),
      arguments: field.arguments.map(resolveRelevantArgumentNode)
    };
  });

  return objectFields;
}
