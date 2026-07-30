import fs from "fs";
import path from "path";
import { VuejsTypesOptions } from "./types";
import {
  Component,
  getAllComponents,
  getComponentPublicProperties,
  getCustomEventDetailTypes,
  getMemberDescription,
  toPascalCase,
} from "@wc-toolkit/cem-utilities";
import type * as cem from "custom-elements-manifest";
import { Logger } from "./logger";
import prettier from "@prettier/sync";

const DEFAULT_OPTIONS: VuejsTypesOptions = {
  fileName: "custom-element-vuejs.d.ts",
  outdir: "./",
  exclude: [],
  prefix: "",
  suffix: "",
};

const KNOWN_FILE_EXTENSIONS = [
  ".d.ts",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
];

function toPosixPath(p: string) {
  return p.split(path.sep).join("/");
}

function ensureRelativeSpecifier(p: string) {
  return p.startsWith(".") ? p : `./${p}`;
}

function normalizeImportPath(importPath: string, options: VuejsTypesOptions) {
  const outDirAbs = path.resolve(options.outdir ?? "./");

  const isAbsPath =
    importPath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(importPath);
  const hasPathSeparators =
    importPath.includes("/") || importPath.includes("\\");
  const hasKnownExt = KNOWN_FILE_EXTENSIONS.some((ext) =>
    importPath.endsWith(ext),
  );

  // Only attempt to rewrite paths that look file-like; keep bare package specifiers
  // like "vue" or "@scope/pkg" as-is.
  const shouldTryFs =
    isAbsPath || importPath.startsWith(".") || hasPathSeparators || hasKnownExt;

  if (!shouldTryFs) {
    return importPath;
  }

  const abs = path.resolve(importPath);

  if (!fs.existsSync(abs)) {
    return importPath;
  }

  try {
    if (!fs.statSync(abs).isFile()) {
      return importPath;
    }
  } catch {
    return importPath;
  }

  const rel = toPosixPath(path.relative(outDirAbs, abs));
  return ensureRelativeSpecifier(rel);
}

/**
 * Generates TypeScript type definitions for custom elements to be used in Vue.js projects.
 *
 * @param manifest - Custom Elements Manifest containing component definitions
 * @param options - Configuration options for type generation
 */
export function generateVuejsTypes(
  manifest: cem.Package,
  options: VuejsTypesOptions = {},
) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const log = new Logger(mergedOptions.debug);

  if (mergedOptions.skip) {
    log.yellow("[vuejs-types] - Skipped");
    return;
  }

  if (!manifest || !manifest.modules || manifest.modules.length === 0) {
    log.red("[vuejs-types] - No modules found in the manifest.");
    return;
  }

  if (!mergedOptions.outdir) {
    log.red("[vuejs-types] - No output directory specified.");
    return;
  }

  log.log("[vuejs-types] - Generating types...");
  const template = getTypeTemplate(manifest, mergedOptions);

  // save file only if a filename is provided
  if (mergedOptions.fileName) {
    createOutDir(mergedOptions.outdir!);
    const outputPath = saveFile(
      mergedOptions.outdir!,
      mergedOptions.fileName!,
      template,
    );
    log.green(`[vuejs-types] - Generated "${outputPath}".`);
  } else {
    log.yellow(
      `[vuejs-types] - File generation skipped because \`fileName\` was not defined.`,
    );
  }

  return template;
}

function getImports(manifest: cem.Package, options: VuejsTypesOptions) {
  const imports = new Map<string, Set<string>>();
  const componentModules = new Map<
    string,
    { modulePath: string; tagName?: string }
  >();

  manifest.modules.forEach((module) => {
    if (
      !module.declarations ||
      !module.declarations.length ||
      !module.declarations.some((d) => (d as cem.CustomElement).customElement)
    ) {
      return;
    }

    module.declarations?.forEach((element) => {
      const component = element as cem.CustomElement;

      if (!component.customElement || !component.name) {
        return;
      }

      componentModules.set(component.name, {
        modulePath: module.path,
        tagName: component.tagName,
      });
    });

    if (options.globalTypePath) {
      module.exports?.forEach((exportDeclaration) => {
        const exportName = exportDeclaration.declaration.name;

        if (!exportName || exportName === "*") {
          return;
        }

        addImport(imports, options.globalTypePath!, exportName);
      });
    } else {
      module.declarations?.forEach((element) => {
        const component = element as cem.CustomElement;

        if (!component.customElement || !component.name) {
          return;
        }

        const importPath = normalizeImportPath(
          getComponentImportPath(
            component.name,
            component.tagName,
            module.path,
            options,
          ),
          options,
        );

        module.exports?.forEach((exportDeclaration) => {
          const exportName = exportDeclaration.declaration.name;

          if (!exportName || exportName === "*") {
            return;
          }

          if (!(options.defaultExport && exportName === component.name)) {
            addImport(imports, importPath, exportName);
          }
        });

        if (options.defaultExport) {
          addImport(imports, importPath, `default as ${component.name}`);
        }
      });
    }
  });

  if (options.useCemTypes) {
    getAllComponents(manifest, options.exclude).forEach((component) => {
      if (!component.name) {
        return;
      }

      const componentModule = componentModules.get(component.name);

      if (!componentModule) {
        return;
      }

      getComponentProps(component).forEach((prop) => {
        const propType = getResolvedPropType(prop, options);

        propType?.references?.forEach((reference) => {
          if (!reference.name || reference.name === "default") {
            return;
          }

          const importPath = getTypeImportPath(
            reference,
            componentModule.modulePath,
            component,
            options,
          );

          if (!importPath) {
            return;
          }

          addImport(imports, importPath, reference.name);
        });
      });
    });
  }

  // Import event detail types referenced by CustomEvent<Detail> patterns
  getAllComponents(manifest, options.exclude).forEach((component) => {
    if (!component.name || !component.events) return;

    const componentModule = componentModules.get(component.name);
    if (!componentModule) return;

    const detailTypes = getEventDetailImportTypes(component);
    if (detailTypes.length === 0) return;

    const importPath = options.globalTypePath
      ? normalizeImportPath(options.globalTypePath, options)
      : normalizeImportPath(
          getComponentImportPath(
            component.name,
            component.tagName,
            componentModule.modulePath,
            options,
          ),
          options,
        );

    detailTypes.forEach((typeName) => {
      addImport(imports, importPath, typeName);
    });
  });

  return Array.from(imports.entries())
    .map(
      ([importPath, exportNames]) =>
        `import type { ${Array.from(exportNames).join(", ")} } from "${importPath}";`,
    )
    .join("\n");
}

function getTypeTemplate(manifest: cem.Package, options: VuejsTypesOptions) {
  const components = getAllComponents(manifest, options.exclude);
  const imports = getImports(manifest, options);

  return `
${imports}
import type { HTMLAttributes, PublicProps, EmitFn, EmitsToProps } from "vue";

/**
  * This file was autogenerated by @wc-toolkit/vuejs-types
${
  options.stronglyTypedEvents
    ? `/**
  * A generic type for strongly typing custom events with their targets
  * @template T - The type of the event target (extends EventTarget)
  * @template D - The type of the detail payload for the custom event
  */
 type TypedEvent<
   T extends EventTarget,
   E = Event
 > = E & {
   target: T;
 };`
    : ""
}

export type EventMap = {
  [event: string]: Event;
};

// Vue's template type-checking reads props from $props and events from $emit.
// See: https://vuejs.org/guide/extras/web-components.html#non-vue-web-components-and-typescript
export type VueEmitsOptions<T extends EventMap> = {
  [K in keyof T]: (event: T[K]) => void;
};

export type VueEmit<T extends EventMap> = EmitFn<VueEmitsOptions<T>>;

// Helps Volar autocomplete "@event" by providing "onXxx" props.
export type VueOnProps<T extends EventMap> = EmitsToProps<VueEmitsOptions<T>>;

export type DefineCustomElement<
  ElementType extends HTMLElement,
  Props = {},
  Events extends EventMap = {},
> = new () => ElementType & {
  /** @deprecated Do not use the $props property on a Custom Element ref; this is for template prop types only. */
  $props: HTMLAttributes & Props & PublicProps & VueOnProps<Events>${options.allowUnknownProps ? " & Record<string, any>" : ""};

  /** @deprecated Do not use the $emit property on a Custom Element ref; this is for template event types only. */
  $emit: VueEmit<Events>;
};

${components
  ?.map((component: Component) => {
    if (!component.name || !component.tagName) {
      return "";
    }

    const cachedProps =
      getComponentProps(component)?.filter(
        (prop) => !prop.readonly && !prop.static,
      ) || [];

    const strongEventTypes = getStrongEventTypes(component);

    const vueEventsTemplate =
      component.events
        ?.filter((e) => e.name)
        ?.map((event) => {
          const eventType = event.type?.text?.startsWith("{")
            ? `CustomEvent<${event.type.text}>`
            : event.type?.text || "Event";

          const resolvedEventType = getEventTypeName(
            eventType,
            strongEventTypes?.find((x) => x.name === event.name)?.newType ||
              null,
            component.name,
            options.stronglyTypedEvents,
          );

          return `  /** ${getMemberDescription(
            event.description,
            event.deprecated,
          )} */\n  "${event.name}": ${resolvedEventType};`;
        })
        .join("\n") || "";

    return `
${options.stronglyTypedEvents ? getStronglyTypedEvents(component) : ""}

export type ${component.name}VueProps = {
${(() => {
  if (!cachedProps?.length) {
    return "";
  }

  return cachedProps.reduce((acc, prop) => {
    const description = getMemberDescription(prop.description, prop.deprecated);
    const typeInfo = getResolvedPropType(prop, options);
    const type = getPropType(component.name, prop, typeInfo, options);

    const propExists = prop.propName
      ? acc.includes(`  "${prop.propName}"?:`)
      : false;
    const attrExists = prop.attrName
      ? acc.includes(`  "${prop.attrName}"?:`)
      : false;

    let result = acc;

    // Include attribute alias when it differs from the JS property name
    if (prop.attrName && prop.attrName !== prop.propName && !attrExists) {
      result += `  /** ${description} */\n  "${prop.attrName}"?: ${type};\n`;
    }

    // Include the JS property name
    if (prop.propName && !propExists) {
      result += `  /** ${description} */\n  "${prop.propName}"?: ${type};\n`;
    }

    return result;
  }, "");
})()}
};

export type ${component.name}VueEvents = {
${vueEventsTemplate}
};
`;
  })
  .join("\n")}

export type CustomCssProperties = {
${(() => {
  const uniqueCssProperties = new Set<string>();
  const cssPropertiesArray: string[] = [];

  components.forEach((component) => {
    component.cssProperties?.forEach((property) => {
      if (!uniqueCssProperties.has(property.name)) {
        uniqueCssProperties.add(property.name);
        cssPropertiesArray.push(
          `  /** ${getMemberDescription(property.description, property.deprecated)} */
  "${property.name}"?: string;`,
        );
      }
    });
  });

  return cssPropertiesArray.join("\n");
})()}
}

// Vue SFC template type-checking (GlobalComponents) for non-Vue custom elements.
// Note: Some tooling expects this augmentation under "@vue/runtime-core", while
// other docs/examples use "vue". We emit both for compatibility.
export interface WcToolkitVueGlobalComponents {
${components
  .map((component) => {
    if (!component.name || !component.tagName) {
      return "";
    }

    let tagName = component.tagName;
    if (options.tagFormatter) {
      tagName = options.tagFormatter(component.tagName);
    } else if (options.prefix || options.suffix) {
      tagName = `${options.prefix}${component.tagName}${options.suffix}`;
    }

    const componentDoc = component.description
      ? getMemberDescription(
          component.description,
          (component as { deprecated?: boolean | string }).deprecated,
        )
          .replace(/\n/g, " ")
          .replace(/`/g, "'")
      : undefined;

    return componentDoc
      ? `  /** ${componentDoc} */\n  "${tagName}": DefineCustomElement<${component.name}, ${component.name}VueProps, ${component.name}VueEvents>;`
      : `  "${tagName}": DefineCustomElement<${component.name}, ${component.name}VueProps, ${component.name}VueEvents>;`;
  })
  .join("\n")}
}

declare module "@vue/runtime-core" {
  interface GlobalComponents extends WcToolkitVueGlobalComponents {}
}

declare module "@vue/runtime-dom" {
  interface GlobalComponents extends WcToolkitVueGlobalComponents {}

  // Needed for named slots on native elements when using Web Components.
  // Vue templates otherwise reject: <span slot="icon" />
  interface HTMLAttributes {
    slot?: string;
  }
}

declare module "vue" {
  interface GlobalComponents extends WcToolkitVueGlobalComponents {}

  // Some package managers (notably pnpm) may not make "@vue/runtime-dom" directly
  // resolvable from the consuming project, so we also augment via "vue".
  interface HTMLAttributes {
    slot?: string;
  }

  ${options.excludeCssCustomProperties ? "" : "interface CSSProperties extends CustomCssProperties {}"}
}
`;
}

type ComponentProp = {
  attrName?: string;
  propName?: string;
  description?: string;
  deprecated?: boolean | string;
  readonly?: boolean;
  static?: boolean;
  type?: cem.Type;
  attribute?: cem.Attribute;
  property?: cem.ClassField;
};

function addImport(
  imports: Map<string, Set<string>>,
  importPath: string,
  exportName: string,
) {
  const existing = imports.get(importPath);

  if (existing) {
    existing.add(exportName);
    return;
  }

  imports.set(importPath, new Set([exportName]));
}

function getComponentImportPath(
  componentName: string,
  tagName: string | undefined,
  modulePath: string,
  options: VuejsTypesOptions,
) {
  return typeof options.componentTypePath === "function"
    ? options.componentTypePath(componentName, tagName, modulePath)
    : modulePath;
}

function getTypeImportPath(
  reference: cem.TypeReference,
  componentModulePath: string,
  component: Component,
  options: VuejsTypesOptions,
) {
  if (reference.package) {
    return reference.package;
  }

  if (!reference.module) {
    return null;
  }

  if (reference.module === componentModulePath) {
    if (options.globalTypePath) {
      return normalizeImportPath(options.globalTypePath, options);
    }

    if (component.name) {
      return normalizeImportPath(
        getComponentImportPath(
          component.name,
          component.tagName,
          componentModulePath,
          options,
        ),
        options,
      );
    }
  }

  return normalizeImportPath(reference.module, options);
}

function getComponentProps(component: Component): ComponentProp[] {
  const properties = getComponentPublicProperties(
    component,
  ) as unknown as cem.ClassField[];
  const propertyMap = new Map(
    properties.map((property) => [property.name, property]),
  );
  const attributeProps =
    (component.attributes as unknown as cem.Attribute[] | undefined)?.map(
      (attribute) => ({
        attrName: attribute.name,
        propName: attribute.fieldName,
        description: attribute.description,
        deprecated: attribute.deprecated,
        readonly: false,
        static: false,
        type: attribute.type,
        attribute,
        property: attribute.fieldName
          ? propertyMap.get(attribute.fieldName)
          : undefined,
      }),
    ) || [];
  const attributePropNames = new Set(
    attributeProps
      .map((attribute) => attribute.propName)
      .filter((propName): propName is string => Boolean(propName)),
  );
  const propertyOnlyProps = properties
    .filter((property) => !attributePropNames.has(property.name))
    .map((property) => ({
      attrName: undefined,
      propName: property.name,
      description: property.description,
      deprecated: property.deprecated,
      readonly: property.readonly,
      static: property.static,
      type: property.type,
      attribute: undefined,
      property,
    }));

  return [...attributeProps, ...propertyOnlyProps];
}

function getTypeFromSource(
  source: cem.Attribute | cem.ClassField | undefined,
  sourceKey: string,
) {
  const candidate = source
    ? (source as unknown as Record<string, unknown>)[sourceKey]
    : undefined;

  if (
    candidate &&
    typeof candidate === "object" &&
    "text" in candidate &&
    typeof candidate.text === "string"
  ) {
    return candidate as cem.Type;
  }

  return undefined;
}

function getResolvedPropType(prop: ComponentProp, options: VuejsTypesOptions) {
  const sourceKey = options.typesSrc || "type";

  return (
    getTypeFromSource(prop.property, sourceKey) ??
    getTypeFromSource(prop.attribute, sourceKey) ??
    (sourceKey === "type"
      ? undefined
      : getTypeFromSource(prop.property, "type")) ??
    (sourceKey === "type"
      ? undefined
      : getTypeFromSource(prop.attribute, "type")) ??
    prop.type
  );
}

function getPropType(
  componentName: string,
  prop: ComponentProp,
  propType: cem.Type | undefined,
  options: VuejsTypesOptions,
) {
  if (options.useCemTypes) {
    return propType?.text || "unknown";
  }

  return prop.propName ? `${componentName}['${prop.propName}']` : "unknown";
}

function getEventTypeName(
  eventType: string,
  strongEventType: string | null,
  componentName: string = "",
  stronglyTyped?: boolean,
) {
  return stronglyTyped
    ? (strongEventType ?? `${componentName}ElementEvent`)
    : eventType;
}

function getStrongEventTypes(component: Component) {
  const eventTypes = component?.events
    ?.filter((e) => e.name)
    ?.map((event) => ({
      name: event.name,
      type: event?.type?.text,
    }));

  if (!eventTypes) {
    return [];
  }

  return eventTypes
    .filter(
      (eventType) =>
        eventType.type &&
        eventType.type !== "Event" &&
        eventType.type !== "CustomEvent",
    )
    .map((eventType) => {
      return {
        name: eventType.name,
        type: eventType.type.startsWith("{")
          ? `CustomEvent<${eventType.type}>`
          : eventType.type,
        newType: `${component.name}${toPascalCase(eventType.name)}ElementEvent`,
      };
    });
}

function getStronglyTypedEvents(component: Component): string {
  if (!component.events?.length) {
    return "";
  }

  const eventTypes = getStrongEventTypes(component);
  const types: string[] = [
    `/** \`${component.name}\` component event */
     export type ${component.name}ElementEvent<E = Event> = TypedEvent<${component.name}, E>;`,
  ];

  eventTypes.forEach((eventType) => {
    types.push(
      `/** \`${eventType.name}\` event type */
      export type ${eventType.newType} = ${component.name}ElementEvent<${eventType.type}>;`,
    );
  });

  return types.join("\n");
}

function getEventDetailImportTypes(component: Component): string[] {
  const bare = getCustomEventDetailTypes(component);
  const wrapped = (component.events || [])
    .map((event) => {
      const text = event.type?.text?.trim();
      if (!text) return undefined;
      const match = /^CustomEvent<(.+)>$/.exec(text);
      return match?.[1]?.trim();
    })
    .filter(
      (detail): detail is string =>
        detail !== undefined && /^[A-Z][\w$]*$/.test(detail),
    );
  return [...new Set([...bare, ...wrapped])].filter(
    (name) => name !== "CustomEvent" && name !== "Event",
  );
}

function createOutDir(outDir: string) {
  if (outDir !== "./" && !fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
}

function saveFile(outDir: string, fileName: string, contents: string) {
  const outputPath = path.join(outDir, fileName);

  fs.writeFileSync(
    outputPath,
    prettier.format(contents, { parser: "typescript", printWidth: 80 }),
  );

  return outputPath;
}
