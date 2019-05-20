# relay-store-types-generator

_EXPERIMENTAL, USE AT OWN RISK_

Generate types for the Relay store from your GraphQL schema. More type safety for your Relay store with zero runtime cost and almost zero code cost.

_Currently only generates Flow types, TypeScript mode coming soon_.

## The idea

When you write queries, mutations and fragments, Relay generates types for you that you can use to use the data Relay gives
you in a type-safe way. Relay also lets you manually interact with its store through `updaters` after mutations, `commitLocalUpdate` and so on. But, when interacting with the store you're left with a generalized API with general types.

This package generates types for Relay's store tailored to your specific GraphQL schema, so that your interaction with the store can be
fully type safe, just like interacting with the data Relay gives you.

### Example

Imagine the following schema:

```graphql
schema {
  query: Query
}

type Query {
  bestFriend: User
}

type User {
  firstName: String!
  age: Int!
}
```

Instead of doing this:

```javascript
commitLocalUpdate(environment, store => {
  const root = store.getRoot(); // Gets you a RecordProxy
  const bestFriend = root.getLinkedRecord('bestFriend'); // Also gets you a RecordProxy, but nullable
  if (bestFriend) {
    const age = bestFriend.getValue('agee'); // This is allowed even though it's misspelled
    bestFriend.setValue(123, 'firstName'); // This is allowed as well, even though firstName is supposed to be a string
  }
});
```

...cast your store to `Store$RecordSourceSelectorProxy` like this:

```javascript
import type { Store$RecordSourceSelectorProxy } from '../path/to/generated/relay-store-types.js.flow';

// Cast to typed version of the store from the generated type file
commitLocalUpdate(environment, (store: Store$RecordSourceSelectorProxy) => {
  const root = store.getRoot(); // Gets you a RecordProxy$Query with a shape corresponding to your root query
  const bestFriend = root.getLinkedRecord('bestFriend'); // Returns a ?RecordProxy$User since this is a user
  if (bestFriend) {
    const age = bestFriend.getValue('agee'); // This will not be allowed since there's no getValue method for "agee" on RecordProxy$User
    bestFriend.setValue(123, 'firstName'); // This won't be allowed either, because the method that accepts "firstName" as key expects the value to be ?string
  }
});
```

## Usage

```
yarn add --dev relay-store-types-generator

./node_moduels/.bin/relay-store-types-generator --flow --schema ./path/to/schema.graphql --out-dir ./path/to/output/dir --custom-scalars-path ./path/to/file/exporting/custom/scalars

# You can add it to package.json
...
"scripts": {
    "generate:relay-store-types": "relay-store-types-generator --flow --schema ./path/to/schema.graphql --out-dir ./path/to/output/dir --custom-scalars-path ./path/to/file/exporting/custom/scalars"
...

# ...and then run like
yarn generate:relay-store-types
```

```
relay-store-types-generator

Options:
  --schema [path]               Path to schema.graphql
  --custom-scalars-path [path]  Path to file exporting custom scalars.
  --out-dir [path]              Path to directory to output type file.
  --flow                        Output Flow types.
  --typescript                  Output TypeScript types.
  -h, --help                    output usage information
```

Preferably set this up to run after whatever you use to persist the introspection of your GraphQL schema. That way you always have a fresh version.

## FAQ

### What if I start using this and find it's not for me, do I need to do a lot of invasive changes to my code to get this to work?

Not at all! That's a primary feature. Wherever you interact with the Relay store and want to do so in a type-safe way, just cast the store to the
generated store type, like `(store: Store$RecordSourceSelectorProxy) => ...`. Want to go back? Remove the cast and work with the store as usual!

### What about my custom scalars, have you forgot about them?

I'm hurt you even ask! You can pass a path to a file exporting your custom scalars. Example:

```
relay-store-types-generator --flow --schema ./schema.graphql --out-dir ./types --custom-scalars-path ./src/customScalars.js

# customScalars.js
module.exports = {
  "Datetime": "string",
  "Cursor": "string",
  "BigInt": "number",
  "Flag": "boolean"
};
```

### There's _lots_ of types generated... Can I reduce the size some way?

Currently no, but I have a few ideas for how to reduce the size of the generated types.
However, ultimately, generating types for a large GraphQL schema will always result in lots of types,
since the number of combinations of keys/types/methods and so on the types need to cover are large.

## TODO

- [ ] TypeScript mode
- [ ] Type `args` for every field
- [ ] Type `filters` for connections
- [ ] Optimize amount of generated code
- [ ] Handle subscriptions (?)
- [ ] Parse extensions in schema
