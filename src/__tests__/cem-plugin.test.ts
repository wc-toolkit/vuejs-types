import { describe, expect, it } from "vitest";
import { vuejsTypesGeneratorPlugin } from "../cem-plugin";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("vuejsTypesGeneratorPlugin", () => {
  it("implements the cem-generator completion hook", () => {
    const plugin = vuejsTypesGeneratorPlugin();

    expect(plugin.name).toBe("@wc-toolkit/vuejs-types:cem-generator");
    expect(plugin.afterGenerate).toEqual(expect.any(Function));
  });

  it("does not mutate the source manifest", () => {
    const outdir = mkdtempSync(join(tmpdir(), "vue-types-test-"));
    const manifest = makeManifest();
    try {
      vuejsTypesGeneratorPlugin({ outdir, skip: true }).afterGenerate(manifest);
      expect(manifest.modules[0].declarations[0]).not.toHaveProperty("modulePath");
      expect(manifest.modules[0].declarations[0]).not.toHaveProperty("definitionPath");
      expect(manifest.modules[0].declarations[0].attributes?.[0]).not.toHaveProperty("propName");
    } finally {
      rmSync(outdir, { recursive: true, force: true });
    }
  });
});

function makeManifest() {
  return {
    schemaVersion: "2.1.0",
    modules: [{ kind: "javascript-module", path: "src/button.ts", declarations: [{ kind: "class", name: "Button", customElement: true, tagName: "x-button", attributes: [{ name: "disabled", type: { text: "boolean" } }], members: [], exports: [] }], exports: [] }],
  };
}
