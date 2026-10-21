import { afterAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { generateVuejsTypes } from "../type-generator";

const require = createRequire(import.meta.url);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vue-types-compile-"));

afterAll(() => fs.rmSync(tempDir, { recursive: true, force: true }));

describe("generated Vue declarations compile", () => {
  it("type-checks normal and CSS-only components and event details", () => {
    const srcDir = path.join(tempDir, "src");
    const typesDir = path.join(tempDir, "types");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(typesDir, { recursive: true });
    fs.symlinkSync(
      path.resolve(process.cwd(), "node_modules"),
      path.join(tempDir, "node_modules"),
      "dir",
    );
    fs.writeFileSync(
      path.join(srcDir, "button.ts"),
      `import type { Mode } from "./types";\nexport type ErrorDetail = { message: string };\nexport class Button extends HTMLElement { label = ""; mode?: Mode; }\n`,
    );

    const buttonPath = path.join(srcDir, "button.ts");
    const typesPath = path.join(srcDir, "types.ts");
    const cssPath = path.join(srcDir, "zd-flex.css");
    fs.writeFileSync(typesPath, 'export type Mode = "compact" | "wide";\n');
    const manifest = {
      schemaVersion: "1.0.0",
      readme: "",
      modules: [
        {
          kind: "javascript-module" as const,
          path: buttonPath,
          declarations: [
            {
              kind: "class" as const,
              name: "Button",
              tagName: "x-button",
              customElement: true,
              members: [
                {
                  kind: "field" as const,
                  name: "mode",
                  type: {
                    text: "Mode",
                    references: [{ name: "Mode", module: typesPath }],
                  },
                },
              ],
              events: [
                { name: "error", type: { text: "CustomEvent<ErrorDetail>" } },
              ],
            },
          ],
          exports: [
            {
              kind: "js" as const,
              name: "Button",
              declaration: { name: "Button", module: buttonPath },
            },
          ],
        },
        {
          kind: "javascript-module" as const,
          path: typesPath,
          declarations: [],
          exports: [
            {
              kind: "js" as const,
              name: "Mode",
              declaration: { name: "Mode", module: typesPath },
            },
          ],
        },
        {
          kind: "javascript-module" as const,
          path: cssPath,
          declarations: [
            {
              kind: "class" as const,
              name: "Layout",
              tagName: "zd-flex",
              customElement: true,
              attributes: [
                { name: "direction", type: { text: "row | column" } },
              ],
            },
          ],
          exports: [],
        },
      ],
    };
    const generated = generateVuejsTypes(manifest, {
      fileName: undefined,
      outdir: typesDir,
      useCemTypes: true,
    });
    fs.writeFileSync(path.join(typesDir, "generated.d.ts"), generated!);
    fs.writeFileSync(
      path.join(tempDir, "consumer.ts"),
      `import type { ButtonVueEvents, ButtonVueProps, ZdFlexVueProps } from "./types/generated";\nimport type { ErrorDetail } from "./src/button";\nimport type { Mode } from "./src/types";\nconst layout: ZdFlexVueProps = { direction: "row" };\nconst detail: ButtonVueEvents["error"] = new CustomEvent<ErrorDetail>("error");\nconst mode: ButtonVueProps["mode"] = "compact" satisfies Mode;\n`,
    );
    fs.writeFileSync(
      path.join(tempDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ESNext",
          module: "ESNext",
          moduleResolution: "bundler",
          strict: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: ["consumer.ts", "types/**/*.d.ts", "src/**/*.ts"],
      }),
    );

    const tscPath = path.resolve(
      path.dirname(require.resolve("typescript")),
      "../bin/tsc",
    );
    expect(() =>
      execFileSync(
        process.execPath,
        [tscPath, "--noEmit", "--project", "tsconfig.json"],
        {
          cwd: tempDir,
          stdio: "pipe",
        },
      ),
    ).not.toThrow();
  });
});
