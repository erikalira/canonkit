# Follow-up: scope terminology in maintenance commands

The guided install now names configuration scope as **user** and **project**.
In a follow-up change, align the remaining maintenance surfaces with those
terms:

- `doctor`: group findings by user and project scope.
- `uninstall`: make user-level and project-level removal explicit in prompts
  and summaries.
- `models`: use user/project consistently in setup, show and diagnostics.
- Security diagnostics: report project policy as not configured for the current
  project and keep user-level coverage distinct.

This is a follow-up planning note. It does not change the current command
behavior or authorize writes outside the normal install and uninstall flows.
