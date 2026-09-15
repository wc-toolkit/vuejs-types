# @wc-toolkit/vuejs-types

## 1.0.3

### Patch Changes

- 2517b9f: Keep Vue type generation from mutating the source Custom Elements Manifest.
- 2517b9f: Add a `cem-generator` plugin for generating Vue.js types from the finalized CEM.

## 1.0.2

### Patch Changes

- a072041: Add a `cem-generator` plugin for generating Vue.js types from the finalized CEM.

## 1.0.1

### Patch Changes

- c4fbf2f: Fix the generated `.d.ts` for strongly typed events whose detail is a named type (e.g. `CustomEvent<MyDetail>`). The detail type is now imported alongside the element so the generated type alias resolves. A single named identifier is recovered from `CustomEvent<...>` wrappers; unions, nested generics, inline objects and primitives are left as-is. Events with bare `CustomEvent`/`Event` types are unaffected.

## 1.0.0

### Major Changes

- b4f5bb3: Package creation
