# Releasing canonkit

Publish only through [`.github/workflows/release.yml`](../.github/workflows/release.yml). CI attaches npm provenance identifying the commit and workflow that built the tarball and stores no npm token. The package installs a hook that runs on every tool call. Run `npm deprecate` and `npm dist-tag` from a laptop with 2FA.

## One-time setup (account owner)

### 1. npm and GitHub account security

```sh
# Warning: These settings are outside the repository, cannot be configured from CI, and changes to them are not visible in a diff.
npm owner ls canonkit
```

Enable 2FA on both accounts; confirm the command lists only you.

### 2. Tag ruleset

```sh
# Warning: Do not add a bypass for anyone else or allow tag updates after deployment approval.
```

In Settings → Rules → Rulesets, create a tag ruleset targeting `v*`, restrict creation to you, and block updates and deletions; use your own bypass only if you need to delete a tag.

### 3. GitHub environment

```sh
# Warning: Leave "Allow administrators to bypass" unchecked and "Prevent self-review" off.
```

In Settings → Environments → `npm`, set yourself as required reviewer and deployment branches and tags to selected tags `v*`.

### 4. npm trusted publisher

```sh
# Warning: A new configuration expires unless a publish through it succeeds within 2 days.
```

In canonkit → Settings → Trusted publishing → GitHub Actions, set user `erikalira`, repository `canonkit`, workflow `release.yml`, and environment `npm`; fields are case-sensitive and checked at publish time, so set this up right before a release.

### 5. After the first publish with provenance

```sh
# Warning: Revoke any remaining npm automation tokens.
```

In Settings → Publishing access, select "Require two-factor authentication and disallow tokens"; from then on, a leaked token cannot publish.

### 6. Periodic account checks

```sh
# Warning: Re-check setup steps 2–4 periodically.
```

Enable Private vulnerability reporting in Settings → Code security; [SECURITY.md](../SECURITY.md) directs reporters to use it.

Requirements: npm ≥ 11.5.1, Node ≥ 22.14, and GitHub-hosted runners for publishing ([npm trusted publishers](https://docs.npmjs.com/trusted-publishers)).

## Release

### 1. Prepare and merge a stable version

```sh
# Warning: Stable versions only; the workflow refuses a prerelease because it would be published as latest.
npm version <patch|minor|major> --no-git-tag-version
```

In the same PR, add `docs/release-notes/X.Y.Z.md` with what changed, what breaks, and what to do; start with "Action required", even when it is "none", then commit and merge once CI is green.

For test changes, check that fixtures state their environment assumptions. In [CI run 43913435963](https://github.com/erikalira/canonkit/actions/runs/43913435963), all six OS/Node jobs failed because an OpenSpec menu test assumed the binary was on `PATH`; the installer correctly skips a missing tool. macOS also exposed a security fixture that omitted the recommended read access to `~/.canonkit/models.json`. Keep tests for installed and missing tools distinct, and include platform-specific security recommendations in fixture setup. A local pass with different installed tools does not predict the CI matrix result. Review every job's failing test name before changing product code or rerunning a failed workflow.

### 2. Tag `main` and push

```sh
git fetch origin && git tag vX.Y.Z origin/main && git push origin vX.Y.Z
```

### 3. Review and approve the deployment

```sh
npm ci --ignore-scripts && npm run dashboard:build
npm pack --dry-run --ignore-scripts
```

Wait for the CI matrix and secret scan; the workflow checks that the tag is on `main` and matches `package.json`, but this check runs from the tagged commit's own workflow copy and only catches mistakes. From a clean checkout of the exact tagged commit, review the command's output before approving the `npm` deployment on the Actions run; the publish job's package file list is logged only after approval and cannot serve as the pre-approval review. The tarball ships the compiled dashboard, which is gitignored, so the listing must include `dashboard/dist/index.html`; the build step above produces it locally (`--ignore-scripts` skips `prepack`).

### 4. Confirm the GitHub release

After publish succeeds, the `github-release` job creates the tag's release from `docs/release-notes/X.Y.Z.md`, or from generated notes if that file is missing. Nothing to run by hand; confirm it exists:

```sh
gh release view vX.Y.Z
```

If the job failed, the package is already on npm: re-run the job, or create the release by hand:

```sh
gh release create vX.Y.Z --verify-tag --title vX.Y.Z --notes-file docs/release-notes/X.Y.Z.md
```

This job needs `contents: write`, which the publish job must not hold; the run page summary shows the npm link.

### How the dashboard reaches the tarball

`dashboard/dist` is built, not committed. Three jobs, in order:

1. `build-dashboard` (`contents: read` only: no `id-token`, no environment, no secrets) checks out the tagged commit, runs `npm ci --ignore-scripts` and `vite build`, and uploads only `dashboard/dist` as the `dashboard-dist` artifact (1 day of retention). It outputs the commit SHA and a sha256 over the sorted per-file manifest of `dist`.
2. `publish` installs and builds nothing. It fails unless the SHA equals `$GITHUB_SHA`, downloads the artifact into `dashboard/dist`, fails unless the recomputed manifest hash equals the build job's, and fails unless `npm pack --dry-run --json` lists `dashboard/dist/index.html` and no `node_modules`, `.map` or `.env` file. Then `npm publish --provenance --ignore-scripts`.
3. `github-release` is unchanged.

What this does and does not prove: provenance attests the published bytes and the workflow run that published them, not how `dist` was built. The SHA and hash checks tie `dist` to the commit and to the unprivileged job; they do not stop a compromised devDependency (vite, esbuild, react) from emitting malicious output in the build job. That risk is bounded by pinned versions in `package-lock.json`, `--ignore-scripts`, and the approval step: review the tarball listing (step 3) and, for a release that changes dependencies, the lockfile diff. Never publish from another workflow's artifact or cache, and never add `cache: npm`, an install or a build to the `publish` job.

The two artifact actions are pinned by commit SHA like the rest of the file; update them with the same care as any pin.

## When it fails

### Before publishing: transient runner or network failure

```sh
# Warning: Tests, secret scan, and tag checks run before publishing; nothing has reached npm at that point.
```

Re-run the workflow. A failed `dist matches the build job's manifest hash` or `dist was built from this commit` check means the artifact is not what the build job made: do not bypass it; re-run the whole workflow so `build-dashboard` runs again.

### Before publishing: code problem

```sh
git push --delete origin vX.Y.Z
git tag -d vX.Y.Z
```

Delete the tag only while nothing has been published from it; merge the fix and tag again.

### After publishing: point `latest` to the last good version

```sh
# Warning: A published version number can never be reused, and npm's unpublish policy is narrow.
npm dist-tag add canonkit@<last-good> latest
```

This points `latest` to the last good version so `npx canonkit` stops resolving the bad one; `npm deprecate` alone does not move `latest`.

### Deprecate the bad version

```sh
npm deprecate canonkit@X.Y.Z "<reason>"
```

Run both rollback commands from a laptop with 2FA; running them from CI through trusted publishing requires npm ≥ 11.21.0 (or ≥ 12.2.0) and its own opt-in on npmjs.com.

### Release a fixed version

```sh
npm version <patch|minor|major> --no-git-tag-version
```

## Verificar

```sh
npm view canonkit@X.Y.Z dist.attestations
npm i canonkit@X.Y.Z && npm audit signatures
```

The first command shows a provenance entry, the npmjs.com page shows the "Provenance" badge, and the second command passes in a clean project.

## Problemas conhecidos

E404 from `npm view canonkit@X.Y.Z` or `npx canonkit@X.Y.Z` for a few minutes after publish →

```sh
# Warning: Wait for the registry cache to catch up; check the publish step's Actions log and do not re-run the workflow or re-tag.
npm view canonkit@X.Y.Z
npx canonkit@X.Y.Z
```
