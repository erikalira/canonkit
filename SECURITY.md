# Security policy

canonkit installs agent files and, if you opt in, hooks that run on every tool
call in your coding agent. A flaw in what it installs or in how it publishes is
worth reporting privately.

## Supported versions

Only the latest release on npm gets security fixes.

## Reporting a vulnerability

Use GitHub's private reporting: **Security → Report a vulnerability** on
[erikalira/canonkit](https://github.com/erikalira/canonkit/security/advisories/new).
Please do not open a public issue for it.

Useful to include: the canonkit version (`npx canonkit --version`), your runtime
(Claude Code, Codex, OpenCode or Copilot), what you did, and what you expected.

This is a small project maintained by one person, so replies are best effort.
You will get an acknowledgement, and a fix or a decision on the report once it
has been looked into.

## In scope

- the installer and the files it writes (agents, settings, hooks);
- the hook scripts and their gates (git-bypass and secret-write checks);
- the release pipeline: a way to publish, alter or substitute a release without
  the tag, environment approval and provenance described in
  [docs/releasing.md](docs/releasing.md).

## Out of scope

- a gate that does not fire in a runtime where the docs say it is not
  enforced (see the README's runtime table);
- the behavior of the coding agents themselves.

## Verifying a release

Recent releases are published only from CI with npm provenance. Older versions
may predate that setup and carry no provenance. To check one:

```bash
npm i canonkit@X.Y.Z && npm audit signatures
```
