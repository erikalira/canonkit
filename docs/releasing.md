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

### 2. Tag `main` and push

```sh
git fetch origin && git tag vX.Y.Z origin/main && git push origin vX.Y.Z
```

### 3. Review and approve the deployment

```sh
npm pack --dry-run --ignore-scripts
```

Wait for the CI matrix and secret scan; the workflow checks that the tag is on `main` and matches `package.json`, but this check runs from the tagged commit's own workflow copy and only catches mistakes. From a clean checkout of the exact tagged commit, review the command's output before approving the `npm` deployment on the Actions run; the publish job's package file list is logged only after approval and cannot serve as the pre-approval review.

### 4. Create the GitHub release

```sh
# Warning: If this job fails, the package is already on npm.
gh release create vX.Y.Z --notes-file docs/release-notes/X.Y.Z.md
```

After publish succeeds, the `github-release` job creates the tag's release using `docs/release-notes/X.Y.Z.md`, or generated notes if that file is missing; if the job fails, re-run it or run the command above by hand. This job needs `contents: write`, which the publish job must not hold; the run page summary shows the npm link.

## When it fails

### Before publishing: transient runner or network failure

```sh
# Warning: Tests, secret scan, and tag checks run before publishing; nothing has reached npm at that point.
```

Re-run the workflow.

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
