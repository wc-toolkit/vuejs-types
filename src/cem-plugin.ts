/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateVuejsTypes } from "./type-generator";
import type { VuejsTypesOptions } from "./types";
import type { Plugin } from "@wc-toolkit/cem-generator";
import type { Package } from "custom-elements-manifest";

/**
 * Plugin to generate Vue.js types for web components based on a custom elements manifest.
 *
 * @param options - Configuration options for the Vue.js types plugin
 * @returns
 */
export function vuejsTypesPlugin(options: VuejsTypesOptions = {}) {
  return {
    name: "@wc-toolkit/vuejs-types",
    packageLinkPhase({ customElementsManifest }: any) {
      generateVuejsTypes(customElementsManifest, options);
    },
  };
}

/** Plugin for @wc-toolkit/cem-generator that generates Vue.js types from the finalized CEM. */
export function vuejsTypesGeneratorPlugin(
  options: VuejsTypesOptions = {},
): Plugin {
  return {
    name: "@wc-toolkit/vuejs-types:cem-generator",
    afterGenerate(manifest: Package) {
      generateVuejsTypes(manifest, options);
    },
  };
}
