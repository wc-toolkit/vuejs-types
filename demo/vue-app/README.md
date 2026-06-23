# Vue demo app (testing @wc-toolkit/vuejs-types)

This Vite + Vue + TypeScript app demonstrates using a **non-Vue custom element** with Vue template type-checking.

## What it does

- Registers the demo element at runtime: `demo/basic/src/my-component.js`
- Includes the generated Vue typings: `demo/vue-app/src/custom-elements.generated.d.ts` (generated from `demo/basic/custom-elements.json`)
- Configures Vite Vue plugin `compilerOptions.isCustomElement` so Vue doesn’t try to resolve `my-component` as a Vue component.

## Run it

From the repo root:

```bash
pnpm run build
node demo/basic/generate-vue-app-types.js

cd demo/vue-app
pnpm install
pnpm dev
```

Then open the printed URL and you should see the web component render.

This demo enables `vueCompilerOptions.strictTemplates` so `vue-tsc` will fail if the custom element typings are not picked up.

If VS Code autocomplete doesn’t update immediately, run **“TypeScript: Restart TS server”** and ensure the **Vue (Official)** / **Volar** extension is enabled.
