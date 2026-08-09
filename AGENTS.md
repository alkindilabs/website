# Repository Instructions

[CONTRIBUTING.md](CONTRIBUTING.md) is the single authoritative contract
for working in this repository: core separation (which file owns what),
required rules, JavaScript and CSS practices, verification, deployment,
and workflow. Read it before changing anything and follow it exactly;
nothing in it is restated here.

## Agent-specific notes

- `CLAUDE.md` is a symlink to this file; both names load the same
  instructions.
- This root file applies to the whole repository by default. If the repo
  grows, subdirectories may add `AGENTS.md` or `AGENTS.override.md` only
  when that subtree genuinely needs narrower local rules. Nested
  instruction files should refine local behavior, not exist for one-off
  tasks or temporary notes. When a nested instruction file exists for
  the files being edited, follow the most specific applicable
  instructions without ignoring the repo-wide contract.
- Before claiming any change done, run the Verification section of
  CONTRIBUTING.md and confirm the Required Rules that apply to the
  touched files — the dictionary cache-version bump is the one most
  often missed.
