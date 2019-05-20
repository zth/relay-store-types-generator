export type Argument = {
  name: string;
  nullable: boolean;
  type: TypeContainer;
};

export type TypeContainer =
  | {
      nullable: boolean;
      kind: 'LIST';
      inner: TypeContainer;
    }
  | {
      nullable: boolean;
      kind: 'TYPE';
      typeName: string;
    };

export type FieldValue = {
  name: string;
  type: TypeContainer;
  arguments: Array<Argument>;
};

export type ObjectFieldsType = { [fieldName: string]: FieldValue };
export type ScalarObj = { [scalarName: string]: string };

export type TTypes = TObject | TEnum | TScalar | TUnion | TInterface;

export interface TUnion {
  kind: 'UNION';
  name: string;
  typeNames: Array<string>;
}

export interface TInterface {
  kind: 'INTERFACE';
  name: string;
}

export interface TObject {
  kind: 'OBJECT_TYPE';
  name: string;
  fields: { [fieldName: string]: FieldValue };
  implementsInterfaces: Array<string>;
}

export interface TEnum {
  kind: 'ENUM';
  name: string;
  values: Array<string>;
}

export interface TScalar {
  kind: 'SCALAR';
  name: string;
  type: string;
}

export interface Config {
  schemaPath: string;
  outDir: string;
  customScalars: ScalarObj;
  mode: 'FLOW' | 'TYPESCRIPT';
}

export type ParsedSchema = {
  rootFields: Array<FieldValue>;
  objectTypes: Array<TObject>;
  interfaceTypes: Array<TInterface>;
  unionTypes: Array<TUnion>;
  customScalars: Array<string>;
  enumTypes: Array<TEnum>;
  rootType: TObject;
};

export type MethodTargetContainer<T extends TTypes> = {
  owner: TObject;
  field: FieldValue;
  type: T;
  list: boolean;
};
