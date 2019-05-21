import { Argument } from '../types';
import * as t from '@babel/types';

export function makeArgsObj(
  // @ts-ignore
  args: Array<Argument>
) {
  // TODO: Fix this, right now we're just making it an optional any
  const definition = t.functionTypeParam(
    t.identifier('args'),
    t.nullableTypeAnnotation(t.anyTypeAnnotation())
  );
  definition.optional = true;
  return definition;
}
