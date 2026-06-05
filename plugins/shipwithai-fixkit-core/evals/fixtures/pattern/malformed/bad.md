# Not a ledger

This file has no `---` YAML frontmatter block and therefore no `id`. The miner must fail LOUDLY on
it (throw), never silently skip it — the PR #3 lesson (a parse error is not "no pattern found").
