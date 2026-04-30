# Domain Docs

How engineering skills should consume this repo's domain documentation when exploring or
changing the codebase.

## Layout

This repo uses a single-context domain layout:

```text
/
├── CONTEXT.md
├── docs/
│   └── adr/
└── apps/
    └── desktop/
```

Although the code is arranged as a monorepo, the product context is currently one
Electron desktop application. Treat the root `CONTEXT.md` as the shared glossary and
domain reference when it exists.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, if it exists.
- **`docs/adr/`**, if it exists. Read ADRs that touch the area you are about to work in.

If these files do not exist, proceed silently. Do not flag their absence or suggest
creating them upfront. Producer workflows such as `grill-with-docs` can create them when
terms or decisions need to be recorded.

## Use the glossary's vocabulary

When output names a domain concept in an issue title, refactor proposal, hypothesis, or
test name, use the term as defined in `CONTEXT.md`. Avoid drifting to synonyms the
glossary explicitly rejects.

If the concept you need is not in the glossary yet, either reconsider whether the term is
needed or note the gap for a future documentation pass.

## Flag ADR conflicts

If output contradicts an existing ADR, surface it explicitly instead of silently
overriding the decision.
