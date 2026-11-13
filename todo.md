# TODO

Out-of-scope findings collected during the 3.1.1 change
`security-settings-scope-and-confirmation` (2026-11-13). None blocks 3.1.1.

## Empty-file rule in other JSON readers

- **Where:** `bin/model-discovery.js` (~L299), `bin/model-config.js` (L141).
- **Observation:** both parse JSON files and may not apply the 3.1.1 rule that
  an empty, whitespace-only or BOM-only file reads as `{}` (`readSettingsText`
  in `bin/security.js`). Whether either reads a Claude `settings.json` was not
  checked.
- **Confidence:** low.
- **Next step:** check which files they read; if a user can empty one by hand,
  reuse `readSettingsText`.

## Doctor reads the install receipt twice

- **Where:** `securityDiagnosis` in `bin/cli.js`.
- **Observation:** doctor builds a separate dry-run `InstallManifest` only to
  read the receipt's owned `allowRead` items, which duplicates the later
  `checkTracked` receipt load.
- **Confidence:** low (cosmetic).
- **Next step:** read the receipt once and pass it to both.

## Doctor flags Bash allow rules made redundant by the sandbox

- **Where:** `assessClaude` in `bin/security.js` (the `saved-approvals` check).
- **Observation:** today doctor only counts `permissions.allow` rules. With the
  strict sandbox and `autoAllowBashIfSandboxed: true`, saved `Bash(...)`
  approvals add nothing and keep pre-approving commands if the sandbox is ever
  turned off. Doctor could point them out, without deleting anything (the spec
  forbids touching personal permissions).
- **Confidence:** medium (the idea came up in the exploration; it is optional).
- **Next step:** decide whether it is wanted; if so, open an OpenSpec change for
  `security-diagnostics`.

## Known limitations accepted in 3.1.1 (Gard, cosmetic)

- **NVM_DIR drift:** if `NVM_DIR` differs between install and doctor (or is a
  symlink), the kit-appended nvm item is no longer recognized as kit-owned, and
  the `filesystem-exceptions` WARN comes back as noise. It fails safe.
- **Ctrl-C newline:** after a Ctrl-C during the security review, the terminal
  gets no trailing newline.

## Type checking for the CLI (JSDoc + `checkJs`, no build step)

- **Where:** `bin/`, `package.json`, `scripts/validate.mjs`.
- **Observation:** the CLI (~8.1k lines in `bin/`, `bin/cli.js` alone ~4.4k) has
  no static type checking: no `tsconfig`/`jsconfig`, and almost no JSDoc. A full
  `.ts` migration is not recommended for now: Node does not strip types inside
  `node_modules`, so a published `.ts` package would need a build step and
  `dist/`, and `hooks/` must stay plain JS.
- **Confidence:** medium (recommendation, raised 2026-11-13).
- **Next steps:**
  1. Add `jsconfig.json`/`tsconfig.json` with `checkJs`, `noEmit` and `strict`
     adopted gradually, plus `typescript` as a devDependency (`@types/prompts`
     is already there).
  2. Add `// @ts-check` file by file, starting with the smaller, contract-like
     modules: `model-config`, `install-manifest`, `security`,
     `recommended-models`. Type the core structures with `@typedef` (manifest,
     model config, security settings).
  3. Add an `npm run typecheck` script (`tsc -p . --noEmit`) and include it in
     `validate`/CI.
