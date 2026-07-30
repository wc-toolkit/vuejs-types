---
"@wc-toolkit/vuejs-types": patch
---

Fix the generated `.d.ts` for strongly typed events whose detail is a named type (e.g. `CustomEvent<MyDetail>`). The detail type is now imported alongside the element so the generated type alias resolves. A single named identifier is recovered from `CustomEvent<...>` wrappers; unions, nested generics, inline objects and primitives are left as-is. Events with bare `CustomEvent`/`Event` types are unaffected.
