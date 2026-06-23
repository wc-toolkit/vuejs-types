/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateVuejsTypes } from "./type-generator";
import type { VuejsTypesOptions } from "./types";

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
