# Codex model selection — upcoming release

Codex agents can now use the model and reasoning effort you choose with
`npx canonkit models setup --codex`. The effort menu depends on the selected
model. Run `npx canonkit install --codex` after changing user choices. Run it
from each repository with project choices to create project core agents where
those choices differ from your user defaults. `canonkit add <specialist>` uses
the merged project and user choices.

`models refresh --codex` uses the experimental `codex debug models` catalog.
It can use the network, a local cache or bundled data; a listed model does not
establish account access. `models show` and `doctor` report sources and warn
about unverified or incompatible pairs without starting Codex. They also flag
project core files that have not been installed or no longer match the choices.

Project core files are tracked in the project's install receipt. An existing
same-name file is preserved, as are later edits. `uninstall --project` removes
only receipt-owned files that still match. Global Codex agents continue to use
user choices, and unset fields inherit the session. Existing installations
must reinstall to apply choices.

The [3.0.0 release notes](3.0.0.md) describe that release's security changes;
this note does not change its historical behavior.
