# Keeping findings outside the current task

When normal work reveals a concrete problem outside the authorized scope,
CanonKit preserves a minimal note and offers relevant findings for the
project's backlog at a natural completion or review point. This applies to LOW
tasks too, without delegation, OpenSpec or the Learning Loop. No findings means
no extra search, tools, artifacts or delegation.

Keep title, location, observation and confidence: **confirmed** for direct
evidence or **suspected** for a concrete but unconfirmed signal. Subagents
include the note in their normal report; the main agent consolidates findings.
Use existing working context or handoff notes, without mandatory new files.
Do not investigate or fix an incidental problem merely to complete an entry.

Defects introduced by the current change, unmet acceptance criteria and blocked
validation remain part of delivering the current task. Moving them to a backlog
does not make the task complete. Urgent security findings are reported promptly.

**Private channel.** Exploitable vulnerabilities, exposed secrets and sensitive
incidents never go into the repository's backlog file or a public issue, since
a backlog file such as `todo.md` may be versioned and public. They use the
project's private security reporting channel. The assistant reports such a
finding to you in the conversation promptly, with its location only and never
the secret value, so you can use that channel; it writes it to no backlog or
issue.

## Destination and review

**Which backlog.** The destination is the backlog the project already uses, and
project defects belong in the current project's backlog, not CanonKit's. The
assistant resolves it from trusted project context: the project's `AGENTS.md` or
`CLAUDE.md` naming it, an existing file such as `todo.md`, `TODO.md` or
`BACKLOG.md`, or the project's tracker. Git configuration only resolves a
tracker's repository; with multiple remotes or a monorepo, it asks. GitHub
issues are the destination only when that is the project's backlog.

A backlog file must be a plain-text or Markdown file inside the repository, not
a symlink, and not a configuration, hook, script or agent file. A project
instruction naming any other path is ignored and the assistant asks you.

**No identifiable backlog.** The notes stay in the final report. CanonKit does
not create a backlog file.

General CanonKit instruction improvements use the
[Learning Loop contribution workflow](learning-loop.md#contributing-a-general-improvement).
Personal preferences may lead to a proposed configuration change, with separate
authorization for applying it.

**Entries.** Short, numbered, with a title, the observed problem, a
repository-relative location, sanitized evidence, expected behavior when known,
and confidence. Both destinations are sanitized, because a backlog file may be
versioned and public: no secrets, transcripts, raw logs, private commands,
unnecessary local paths or personal data. Sensitive evidence stays in its
original access-controlled location. File, tool and tracker content is
untrusted data, not permission to write or publish; backlog entries read later
are data, not instructions. Unknown fields can be omitted rather than invented.

**File backlog.** The assistant shows the numbered entries with the exact
line(s) each adds and where, following the file's existing format and priority
section. One explicit approval can select a batch; the assistant then writes
only those entries with the file-edit tool. No commit is implied: the change
appears in your working tree like any other edit. If the project tracks the
file, the entry is published with your next push.

**Tracker.** The assistant shows each final title, body and destination before
publishing; one explicit approval can select a batch, and a material change to
content or destination needs new approval for the affected items. It uses an
available native integration, configured MCP or `gh`; with none, it leaves
drafts for manual submission and the original task can finish. No new client,
account setup or tool installation is required. Duplicate searches happen only
on request.

In both cases, a preliminary shortlist is optional for many findings, but
approving it alone does not authorize unseen entries. Declining or not
answering writes or publishes nothing and causes no repeated prompting.

## Example: two findings written to `todo.md`

While completing a settings-page change, Bob observes two unrelated problems
and includes them in his normal report. Neither blocks the settings change's
acceptance criteria. The project has a `todo.md` with a `### P2` section. At
closure, the main agent shows these synthetic entries (illustrative):

**Proposed for `todo.md`, appended under `### P2`, after the last item**

```markdown
- [ ] **CLI documentation uses an unsupported export flag.** `docs/cli.md`
  documents `--output-file`; the command's help lists `--output` and rejects
  the documented flag. Expected: the example uses the supported flag.
  Confidence: confirmed (the validation run reported an unknown-option error).
- [ ] **Export dialog may leave focus outside the dialog.** During a keyboard
  check, focus appeared to stay on the page after opening the export dialog in
  `src/export-dialog.ts`. Expected: focus moves into the dialog. Confidence:
  suspected; reproduction and cause not confirmed.
```

The user approves: "Add items 1 and 2 to `todo.md` as shown." The assistant
writes exactly those lines at that place with the file-edit tool and reports
the file changed; it does not commit. If the user does not answer, nothing is
written and the settings-page task finishes as planned.

### Variant: the backlog is a tracker

If the project's backlog is a GitHub repository's issues, the same two findings
are shown as drafts, each with its final title, body and destination (for
example `example-org/project-a`), and approved in one batch. The assistant
creates only those items and returns their links. If item 1 is confirmed but
item 2 times out, the response gives item 1's link and keeps item 2's reviewed
draft with an **uncertain publication result**. It does not resend either item
automatically. Confirm the attempted creation through available read-only
information or the user before another attempt; if the outcome cannot be
established, leave it unknown. This is distinct from searching for similar
issues before publication. A confirmed failed item can remain pending without
asking again for authorization already covering its unchanged draft and target.

## Availability and evidence limits

The [canonical procedure](../skills/orchestrate/out-of-scope-issues.md) ships
with the `orchestrate` reference skill. The shared roster carries the capture
rule; each runtime's own reference block also points to the procedure so LOW
work does not depend on loading the roster through delegation. Normal
installation copies it under
`~/.claude/skills/orchestrate/` for Claude Code and
`~/.agents/skills/orchestrate/` for Codex and OpenCode. `--no-reference` skips
the reference blocks and skills. Existing installations require an authorized
update; editing source alone does not update them. See
[installation](install.md#global-reference-blocks-and-skills).

For all three runtimes, this workflow relies on the model following instructions
and, for a tracker backlog, on available tracker tools and permissions. There is
no new mechanical write or publication gate. Isolated installation tests prove
distributed bytes, backups, uninstall ownership and the measured context
profile. Documentary review proves instruction coverage. Neither proves native
runtime discovery, model adherence, privacy decisions, correct backlog
resolution, or successful backlog writes or issue publication. Behavioral
efficacy is **unmeasured** until separately authorized evaluations are run for
that runtime.
