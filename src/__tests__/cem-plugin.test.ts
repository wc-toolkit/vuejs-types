import { describe, expect, it } from "vitest";
import { vuejsTypesGeneratorPlugin } from "../cem-plugin";

describe("vuejsTypesGeneratorPlugin", () => {
  it("implements the cem-generator completion hook", () => {
    const plugin = vuejsTypesGeneratorPlugin();

    expect(plugin.name).toBe("@wc-toolkit/vuejs-types:cem-generator");
    expect(plugin.afterGenerate).toEqual(expect.any(Function));
  });
});
