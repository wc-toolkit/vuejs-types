import { generateVuejsTypes } from "../../dist/index.js";
import manifest from "./custom-elements.json" with { type: "json" };

generateVuejsTypes(manifest, {
  // Important: Volar/vue-tsc expects GlobalComponents augmentations to live within
  // the Vue project. Generating into demo/vue-app/src makes template type-checking
  // and autocomplete work reliably.
  outdir: "./demo/vue-app/src",
  fileName: "custom-elements.generated.d.ts",
  stronglyTypedEvents: true,
  componentTypePath: (_componentName, _tagName, modulePath) => {
    // Manifest paths are relative to demo/basic/; adjust them for the Vue app.
    if (modulePath.startsWith("./")) {
      return `../../basic/${modulePath.slice(2)}`;
    }
    return modulePath;
  },
});
