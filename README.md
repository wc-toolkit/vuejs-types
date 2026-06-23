<div align="center">
  
![workbench with tools, html, css, javascript, and vue logos](https://raw.githubusercontent.com/wc-toolkit/jsx-types/refs/heads/main/assets/wc-toolkit_vuejs.png)

</div>

# WC Toolkit Custom Element VueJS Types Generator

This package generates Vue-specific TypeScript declaration files for your Custom Elements so consuming Vue projects get inline documentation, autocomplete, and type-safe validation when using your components in templates.

Types are generated from a Custom Elements Manifest (CEM) and include documentation for:

- Custom elements (types + docs)
- Attributes & properties (types + docs)
- Events (strongly typed when enabled)
- Methods (docs)
- Slots (docs)
- CSS custom properties & states (docs)

## Usage

Two primary ways to generate types:

1. Programmatically, from a build script
2. As a plugin for the Custom Elements Manifest Analyzer

### Install

```bash
npm i -D @wc-toolkit/vuejs-types
```

### Build pipeline

```ts
import { generateVuejsTypes, VuejsTypesOptions } from "@wc-toolkit/vuejs-types";
import manifest from "./path/to/custom-elements.json";

const options: VuejsTypesOptions = {
  /* see Configuration Options below */
};

generateVuejsTypes(manifest, options);
```

Run the script as part of your build:

```bash
node scripts/generate-types.js
```

### CEM Analyzer plugin

```js
// custom-elements-manifest.config.js
import { vuejsTypesPlugin } from "@wc-toolkit/vuejs-types";

export default {
  plugins: [
    vuejsTypesPlugin({
      outdir: "./dist/types",
      fileName: "custom-elements.vue.d.ts",
    }),
  ],
};
```

## Implementation / Integrating generated types

There are two common ways consumers can include the generated types in their Vue projects.

### Option 1: tsconfig

Add the generated types to `tsconfig.json` so the compiler picks them up automatically:

```json
{
  "compilerOptions": {
    "types": ["path/to/custom-elements.vue.d.ts"]
  }
}
```

### Option 2: Small module file

Create a tiny module under `src/` to ensure the file is part of the TS program (recommended for libraries):

```ts
// src/custom-elements.d.ts
import "../dist/types/custom-elements.vue.d.ts";
export {};
```

### Vue compiler notes

- For Vite + Vue, add `compilerOptions.isCustomElement` so the template compiler treats your custom tags as native custom elements.
- Ensure the generated `.d.ts` is included in the consuming project's TS program (tsconfig `include` or the module file approach above).

## Configuration Options

The Vue generator accepts a `VuejsTypesOptions` object to customize output.

### Common options

| Option              |                      Type |                       Default | What it does                                                  |
| ------------------- | ------------------------: | ----------------------------: | ------------------------------------------------------------- |
| `outdir`            |                  `string` |                        `"./"` | Output directory for the generated `.d.ts`.                   |
| `fileName`          |                  `string` | `"custom-element-vuejs.d.ts"` | Output file name.                                             |
| `exclude`           |                `string[]` |                          `[]` | Exclude components by **class name** from the manifest.       |
| `tagFormatter`      | `(tag: string) => string` |                             — | Rewrite tag names before emitting `GlobalComponents` entries. |
| `prefix` / `suffix` |                  `string` |                          `""` | (Deprecated) Legacy tag rewriting; prefer `tagFormatter`.     |

### Type source & imports

| Option              |                                  Type |  Default | Notes                                                                                                                      |
| ------------------- | ------------------------------------: | -------: | -------------------------------------------------------------------------------------------------------------------------- |
| `useCemTypes`       |                             `boolean` |  `false` | Use types embedded in the CEM instead of `ComponentClass["prop"]`. Helpful for JS components + JSDoc.                      |
| `typesSrc`          |                              `string` | `"type"` | Which CEM field to read when `useCemTypes` is on (e.g. `"type"` vs `"parsedType"`).                                        |
| `componentTypePath` | `(name, tag?, modulePath?) => string` |        — | Override the import path used for component class types. Useful if your CEM module paths don’t match your published paths. |
| `globalTypePath`    |                              `string` |        — | Add a global type import reference used by generated types (advanced).                                                     |
| `defaultExport`     |                             `boolean` |  `false` | If your component classes are default exports, set this so imports are generated correctly.                                |

### Template checking behavior

| Option                       |      Type | Default | Notes                                                                                 |
| ---------------------------- | --------: | ------: | ------------------------------------------------------------------------------------- |
| `stronglyTypedEvents`        | `boolean` | `false` | Improves custom event typing (e.g. event targets, `CustomEvent<detail>` payloads).    |
| `allowUnknownProps`          | `boolean` | `false` | Loosens template checking by allowing extra attributes/props on your custom elements. |
| `excludeCssCustomProperties` | `boolean` | `false` | Skip augmenting `CSSProperties` with CSS custom properties from the manifest.         |

### Docs & troubleshooting

| Option                        |                          Type | Default | Notes                                                                    |
| ----------------------------- | ----------------------------: | ------: | ------------------------------------------------------------------------ |
| `componentDescriptionOptions` | `ComponentDescriptionOptions` |       — | Controls how descriptions are rendered into JSDoc (used for hover docs). |
| `debug`                       |                     `boolean` | `false` | Emit contextual logs while generating.                                   |
| `skip`                        |                     `boolean` | `false` | Skip generation (useful in CI toggles).                                  |
| `overrideCustomEventType`     |                     `boolean` |       — | (Deprecated) Will be removed in a future major version.                  |

See `src/types.ts` for the authoritative option definitions.

## Example complete configuration

```ts
import { generateVuejsTypes } from "@wc-toolkit/vuejs-types";
import manifest from "./custom-elements.json";

generateVuejsTypes(manifest, {
  fileName: "custom-elements.vue.d.ts",
  outdir: "./dist/types",
  stronglyTypedEvents: true,
  useCemTypes: true,
  tagFormatter: (tag) => tag.toLowerCase(),
});
```

## Troubleshooting

- No editor completions: confirm the consuming project's TS program includes the generated `.d.ts` (module file or tsconfig `types`/`include`).
- No hover docs on the tag: ensure your CEM includes a component `description` (it is emitted as JSDoc on the `GlobalComponents` entry).
- Event names clobbered by native events: avoid reusing native DOM event names for custom events.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for developer instructions and guidance for automated agents.
