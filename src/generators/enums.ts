import { getEnum } from '../typeHelpers';
import * as t from '@babel/types';
import { ParsedSchema } from '../types';

export function generateEnums(parsedSchema: ParsedSchema) {
  return parsedSchema.enumTypes.map(et =>
    getEnum(et.name, et.values.map(val => t.stringLiteralTypeAnnotation(val)))
  );
}
