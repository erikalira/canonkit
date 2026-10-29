# Releasing canonkit

canonkit is published only by [`.github/workflows/release.yml`](../.github/workflows/release.yml),
never from a laptop. The package installs a hook that runs on every tool call;
publishing from CI attaches npm provenance (which commit and workflow built the
tarball) and leaves no npm token anywhere to steal. The exceptions are
`npm deprecate` and `npm dist-tag`: they change no code and need your 2FA, so they
run from a laptop (see Rollback).

## Release

Releases are stable versions only. The workflow refuses a prerelease version,
because it would be published as `latest`.

1. Bump the version in a PR: `npm version <patch|minor|major> --no-git-tag-version`.
   Commit it and merge it once CI is green.
2. Tag what is now on `main` and push the tag:
   `git fetch origin && git tag vX.Y.Z origin/main && git push origin vX.Y.Z`.
3. Wait for the CI matrix and the secret scan. Then approve the `npm` deployment
   on the Actions run, after reading the `npm pack --dry-run` file list.
4. Check the published release:
   - `npm view canonkit@X.Y.Z dist.attestations` shows a provenance entry, and
     the npmjs.com page shows the "Provenance" badge;
   - in a clean project, `npm i canonkit@X.Y.Z && npm audit signatures` passes.

The workflow also checks that the tag is on `main` and matches `package.json`.
That check only catches mistakes: it runs from the tagged commit's own copy of
the workflow. The tag ruleset and the deployment approval below are what stop
an unauthorised release.

## When it fails

**Before publishing** (tests, secret scan, tag checks), nothing has reached npm:
- A transient failure (runner, network): re-run the workflow.
- A problem in the code: delete the tag (`git push --delete origin vX.Y.Z`,
  `git tag -d vX.Y.Z`), merge the fix, and tag again. Deleting a tag is safe only
  while nothing has been published from it.

**After publishing** something wrong, a version number can never be reused, and
npm's [unpublish policy](https://docs.npmjs.com/policies/unpublish) is narrow.
Roll back like this:
1. Point `latest` back at the last good version so `npx canonkit` stops
   resolving the bad one: `npm dist-tag add canonkit@<last-good> latest`.
   `npm deprecate` alone does not move `latest`.
2. `npm deprecate canonkit@X.Y.Z "<reason>"`.
3. Release a fixed version.

Both commands run from a laptop with 2FA. Running them from CI through trusted
publishing would need npm ≥ 11.21.0 (or ≥ 12.2.0) and its own opt-in on npmjs.com.

## One-time setup (account owner)

These steps happen outside the repository and can't be done from CI.

1. **2FA** on the npm account and on the GitHub account. Confirm that
   `npm owner ls canonkit` lists only you.
2. **Tag ruleset.** Settings → Rules → Rulesets → new tag ruleset targeting
   `v*`: restrict creation to you, block updates and deletions, and add no
   bypass for anyone else. Blocking updates also stops a tag from being moved
   after the deployment was approved. If you ever need to delete a tag (see
   When it fails), use your own bypass.
3. **GitHub environment.** Settings → Environments → `npm`:
   - required reviewer = you;
   - deployment branches and tags = selected tags `v*`;
   - leave "Allow administrators to bypass" unchecked.

   With one maintainer, the approval is a confirmation step, not a second
   person. Leave "Prevent self-review" off, because with it on no one could
   approve the run.
4. **Trusted publisher on npmjs.com.** canonkit → Settings → Trusted publishing →
   GitHub Actions: user `erikalira`, repository `agent-team-config`, workflow
   `release.yml`, environment `npm`. Every field is case-sensitive, and npm only
   checks them at publish time. A new trusted-publisher config expires unless a
   publish through it succeeds within 2 days, so set it up right before a release.
5. **After the first publish with provenance:** Settings → Publishing access →
   "Require two-factor authentication and disallow tokens", then revoke any npm
   automation tokens that are left. From then on a leaked token cannot publish.

Requirements this setup relies on: npm ≥ 11.5.1 and Node ≥ 22.14, and only
GitHub-hosted runners can publish
([npm docs](https://docs.npmjs.com/trusted-publishers)).
