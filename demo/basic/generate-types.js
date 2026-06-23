import { generateVuejsTypes } from "../../dist/index.js";
import manifest from "./shoelace-cem.json" with { type: "json" };

const types = generateVuejsTypes(manifest, {
  outdir: "./demo/basic/types",
  fileName: "custom-element-vuejs.d.ts",
  tagFormatter: (tagName) => tagName.replace("sl-", "wa-"),
  allowUnknownProps: true,
  defaultExport: false,
  componentDescriptionOptions: {
    descriptionSrc: "summary",
  },
  stronglyTypedEvents: true,
});

// eslint-disable-next-line no-undef
console.log(types);
