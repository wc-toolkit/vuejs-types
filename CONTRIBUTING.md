# CONTRIBUTING

This file explains how the project works, how to run it locally, and how to contribute — from both a developer and an automated-agent perspective.

## Who this is for

- Component library authors who want to generate Vue typings for their custom elements.
- Maintainers and contributors working on the generator itself.
- Automated agents/scripts that run generation, CI checks, or create PRs.

## How it works (high level)

- The package reads a Custom Elements Manifest (CEM / custom-elements.json) and generates a `.d.ts` file that augments Vue's template types (GlobalComponents, HTMLAttributes) so Volar and `vue-tsc` provide autocomplete and type-checking.
- Two primary integrations:
  - API: `generateVuejsTypes(manifest, options)` — call from a build script.
  - Plugin: `vuejsTypesPlugin({ ... })` — used by the Custom Elements Manifest Analyzer pipeline.

## Running locally (developer)

1. Install dependencies

```bash
pnpm install
```

2. Build

```bash
pnpm run build
```

3. Run the generator against the example manifest

```bash
node scripts/generate-types.js
```

The generated types will appear under `./dist/types` (or as configured).

4. Run tests (if available)

```bash
pnpm test
```

## Contributing workflow (human developer)

1. Open an issue describing the bug or feature.
2. Create a small focused branch: `git checkout -b <your-username>/fix-meaningful-name`.
3. Make changes, add tests where applicable.
4. Run the build and tests locally.
5. Push the branch and open a PR. In the PR description:
   - Explain the problem and your solution.
   - Include a short reproduction or steps to verify.
6. Address review feedback; when approved the maintainer will merge.

### Commit message guidance

- Keep subject ≤ 72 chars.
- Use present-tense verbs: "Fix typo in README".
- Include a short body if extra context is needed.

## Contributing workflow (automated agents / scripts)

Agents that create PRs should follow these rules:

- Run the full build (`pnpm run build`) and tests (`pnpm test`) before opening a PR.
- Keep PRs small and focused; one logical change per PR.
- Include a clear PR title and body describing what the agent changed and why.
- If an agent updates generated types, include the source CEM reference and the command used.

## Testing and CI

- CI should run `pnpm install`, `pnpm run build`, and `pnpm test`.
- If a PR updates the build artifacts (generated types), CI should verify the generated output matches expectations.

## Local development notes

- Use `pnpm` (preferred) to match repository conventions.
- The generator is TypeScript-based — a typical edit -> build -> run loop helps validate changes.

## Developer tips

- When changing type generation, add a small example CEM and expected generated `.d.ts` to tests.
- For breaking changes, bump the package version following semver and document migration steps in the changelog.

## Changesets

We use Changesets to track and describe releases. Contributors (human or automated) should add a changeset when a PR changes the public API, package behavior, or build artifacts (including generated types).

Quick steps:

1. Add a changeset describing the change and desired release type:

```bash
# interactive (recommended if available)
pnpm changeset
# or
npx changeset
```

2. In the interactive prompt, provide a short summary and select the release type (patch/minor/major).
3. Commit the generated changeset file under `.changeset/` in the PR.

Guidelines:

- Add a changeset for any change consumers must know about (API shape, typings, or breaking behavior).
- Keep changesets focused — one logical change per changeset when possible.
- If an automated agent updates generated types, include the source CEM reference and the command used in the changeset summary.

CI will use changesets to produce releases; do not merge PRs that change public-facing behavior without an accompanying changeset.

## Maintainers

- Review PRs for clarity and correctness; ensure CI passes and tests cover the change.
- Keep docs (README, CONTRIBUTING) aligned with implementation and CI scripts.

Thank you for contributing!
