import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type * as cem from "custom-elements-manifest";
import { generateVuejsTypes } from "../type-generator";

type ExtendedClassField = cem.ClassField & {
  parsedType?: cem.Type;
};

type ExtendedCustomElement = cem.CustomElement & {
  members?: ExtendedClassField[];
};

type ExtendedJavaScriptModule = cem.JavaScriptModule & {
  declarations?: ExtendedCustomElement[];
};

type ExtendedPackage = cem.Package & {
  modules: ExtendedJavaScriptModule[];
};

const jsDocManifest = {
  schemaVersion: "1.0.0",
  readme: "",
  modules: [
    {
      kind: "javascript-module",
      path: "src/button.js",
      declarations: [
        {
          kind: "class",
          name: "Button",
          tagName: "x-button",
          customElement: true,
          attributes: [
            {
              name: "text",
              fieldName: "text",
              description: "Button text",
              type: {
                text: "string",
              },
            },
          ],
          members: [
            {
              kind: "field",
              name: "text",
              description: "Button text",
              type: {
                text: "string",
              },
            },
            {
              kind: "field",
              name: "variant",
              description: "Button variant",
              type: {
                text: '"primary" | "secondary"',
              },
            },
          ],
        },
      ],
      exports: [
        {
          kind: "js",
          name: "Button",
          declaration: {
            name: "Button",
            module: "src/button.js",
          },
        },
        {
          kind: "custom-element-definition",
          name: "x-button",
          declaration: {
            name: "Button",
            module: "src/button.js",
          },
        },
      ],
    },
  ],
} satisfies cem.Package;

const namedTypeManifest = {
  schemaVersion: "1.0.0",
  readme: "",
  modules: [
    {
      kind: "javascript-module",
      path: "src/button.js",
      declarations: [
        {
          kind: "class",
          name: "Button",
          tagName: "x-button",
          customElement: true,
          members: [
            {
              kind: "field",
              name: "variant",
              description: "Button variant",
              type: {
                text: "ButtonVariant | undefined",
                references: [
                  {
                    name: "ButtonVariant",
                    module: "src/button.js",
                  },
                ],
              },
            },
            {
              kind: "field",
              name: "size",
              description: "Button size",
              type: {
                text: "ButtonSize",
                references: [
                  {
                    name: "ButtonSize",
                    module: "src/button-types.js",
                  },
                ],
              },
            },
          ],
        },
      ],
      exports: [
        {
          kind: "js",
          name: "Button",
          declaration: {
            name: "Button",
            module: "src/button.js",
          },
        },
      ],
    },
  ],
} satisfies cem.Package;

const parsedTypeManifest: ExtendedPackage = {
  ...jsDocManifest,
  modules: [
    {
      ...jsDocManifest.modules[0],
      declarations: [
        {
          ...jsDocManifest.modules[0].declarations![0],
          members: [
            {
              kind: "field",
              name: "variant",
              description: "Button variant",
              type: {
                text: "ButtonVariant",
                references: [
                  {
                    name: "ButtonVariant",
                    module: "src/button.js",
                  },
                ],
              },
              parsedType: {
                text: '"primary" | "secondary"',
              },
            },
          ],
        },
      ],
    },
  ],
};

describe("generateVuejsTypes (Vue output)", () => {
  it("emits Vue GlobalComponents augmentation and no JSX-framework modules", () => {
    const manifestPath = path.join(
      process.cwd(),
      "demo/basic/custom-elements.json",
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    const out = generateVuejsTypes(manifest as cem.Package, {
      // avoid writing files during tests
      fileName: undefined,
      outdir: "./",
      stronglyTypedEvents: true,
    });

    expect(out).toContain('declare module "vue"');
    expect(out).toContain("interface GlobalComponents");
    expect(out).toContain("$props");
    expect(out).toContain("$emit");

    // demo component should surface props/events from the manifest
    expect(out).toContain("export type MyComponentVueProps");
    expect(out).toContain('"title"?:');
    expect(out).toContain('"count"?:');
    expect(out).toContain('"disabled"?:');
    expect(out).toContain('"variant"?:');
    expect(out).toContain("export type MyComponentVueEvents");
    expect(out).toContain('"count-change"');

    // should be Vue-only (no React/JSX framework module augmentation)
    expect(out).not.toContain("declare module 'react'");
    expect(out).not.toContain('declare module "solid-js"');
    expect(out).not.toContain("namespace JSX");
  });

  it("keeps component property references by default", () => {
    const template = generateVuejsTypes(jsDocManifest, {
      fileName: undefined,
    });

    expect(template).toContain(`"text"?: Button['text'];`);
    expect(template).toContain(`"variant"?: Button['variant'];`);
  });

  it("uses manifest prop types when useCemTypes is enabled", () => {
    const template = generateVuejsTypes(jsDocManifest, {
      fileName: undefined,
      useCemTypes: true,
    });

    expect(template).toContain('"text"?: string;');
    expect(template).toContain('"variant"?: "primary" | "secondary";');
  });

  it("uses the configured CEM type source when typesSrc is provided", () => {
    const template = generateVuejsTypes(parsedTypeManifest, {
      fileName: undefined,
      useCemTypes: true,
      typesSrc: "parsedType",
    });

    expect(template).toContain('"variant"?: "primary" | "secondary";');
    expect(template).not.toContain('"variant"?: ButtonVariant;');
  });

  it("imports named CEM type references when useCemTypes is enabled", () => {
    const template = generateVuejsTypes(namedTypeManifest, {
      fileName: undefined,
      useCemTypes: true,
    });

    expect(template).toContain(
      'import type { Button, ButtonVariant } from "src/button.js";',
    );
    expect(template).toContain(
      'import type { ButtonSize } from "src/button-types.js";',
    );
    expect(template).toContain('"variant"?: ButtonVariant | undefined;');
    expect(template).toContain('"size"?: ButtonSize;');
  });
});
