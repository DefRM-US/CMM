# CMM Architecture Rebuild Plan

This is the consolidated local plan for rebuilding CMM's Electron architecture. It is the
input for a later PRD pass and issue breakdown; it is not a final ticket list.

Read this with:

- [CONTEXT.md](../../CONTEXT.md) for domain language.
- [docs/adr](../adr/) for decisions and tradeoffs resolved during planning.

## Product Model

CMM is a local-first desktop app for teams pursuing defense procurement opportunities.
For each opportunity, users maintain one government-derived base capability matrix,
export it as an Excel workbook, send it to potential consortium members, import returned
member responses, and compare those responses side by side.

Canonical terms:

- **Procurement Opportunity** or **Opportunity**: the contract pursuit.
- **Base Capability Matrix**: the authoritative requirements for one opportunity.
- **Requirement**: an item in the base capability matrix.
- **Potential Consortium Member**: an organization being evaluated for the consortium.
- **Member Response**: a completed capability matrix returned by a potential consortium
  member.
- **Opportunity Comparison**: the side-by-side comparison of active member responses.
- **Consortium Coverage**: how selected consortium members collectively cover each
  requirement.

Important product rules:

- One opportunity has exactly one base capability matrix.
- One potential consortium member has at most one active member response per opportunity.
- Previous submissions are retained as archived member responses.
- Active member responses have one evaluation state: `candidate`, `selected`, or
  `hidden`.
- Candidate and selected responses appear in the main comparison; hidden responses remain
  active but are excluded from the main comparison and coverage.
- Consortium coverage is computed from selected member responses only.
- Requirements do not have weights or priorities; CMM should not rank members or compute
  aggregate fit scores in the rebuild.

## Rebuild Strategy

Use a mostly big-bang architecture rebuild, staged by macro vertical slices. The app has
not launched, so do not carry prototype storage, React Native Web compatibility, generic
`core` dumping-ground structure, or legacy JSON migration forward.

Before replacing behavior, add focused characterization tests for critical prototype
behavior:

- Requirement numbering and outline editing.
- Workbook export and parse round trip.
- Import review decisions for mismatches and invalid scores.
- Active versus archived member responses.
- Persistence across relaunch.

The later issue breakdown should be smaller than the macro slices below.

Macro sequence:

1. Foundation: package structure, TypeScript config, contracts, SQLite migrations, app
   shell.
2. Opportunity and base matrix editing: opportunity lifecycle, flat requirement outline,
   autosave, revision conflicts.
3. Workbook export: protected CMM-authored workbook with hidden IDs and metadata.
4. Member response import and one-at-a-time review.
5. Opportunity comparison, response evaluation states, and consortium coverage.
6. Member response detail, previous submission comparison, hidden responses, and archived
   opportunities.
7. Packaging hardening, cross-platform checks, local logging, and broader e2e coverage.

## Target Architecture

Use this boundary:

```text
Renderer UI
  -> typed IPC client
Preload bridge
  -> narrow contextBridge API
Electron main
  -> application services
Application services
  -> domain rules + repositories + workbook/file adapters
```

Renderer code manages UI state and draft editing state. Electron main owns privileged
operations: dialogs, filesystem access, workbook IO, SQLite, and local logging.

Hard rules:

- No renderer imports Node, Electron, SQLite, filesystem, or workbook file IO.
- No preload exposure of `ipcRenderer`, raw channel names, or generic `invoke`.
- No package imports another package's `src` by relative path.
- No domain code imports React, Electron, SQLite, filesystem, ExcelJS, or Zod.
- No CMM-specific business components in `@cmm/ui`.
- No legacy JSON migration package.
- No React Native or React Native Web in the rebuild.

## Initial Packages

Use product-scoped packages.

```text
apps/
  desktop/                  Electron app

packages/
  domain/                   Pure TypeScript domain rules
  application/              Use-case services and ports
  contracts/                IPC DTOs and runtime schemas
  workbook/                 ExcelJS build/parse from buffers
  persistence-sqlite/       better-sqlite3 schema, migrations, repositories
  ui/                       Generic React DOM primitives and theme tokens
  typescript-config/        Shared TypeScript config
```

Do not create `@cmm/tooling` initially. Add it later only if boundary checks, shared
Vitest presets, or maintenance scripts become substantial.

Expected package names:

- `@cmm/domain`
- `@cmm/application`
- `@cmm/contracts`
- `@cmm/workbook`
- `@cmm/persistence-sqlite`
- `@cmm/ui`
- `@cmm/typescript-config`
- `@cmm/desktop` or `@app/desktop`; prefer `@cmm/desktop` if the rebuild renames the app.

Dependency direction:

```text
apps/desktop/main
  -> @cmm/application
  -> @cmm/persistence-sqlite
  -> @cmm/workbook
  -> @cmm/contracts

apps/desktop/preload
  -> @cmm/contracts

apps/desktop/renderer
  -> @cmm/contracts
  -> @cmm/ui
  -> @cmm/domain types only when useful

@cmm/application
  -> @cmm/domain

@cmm/persistence-sqlite
  -> @cmm/application ports
  -> @cmm/domain

@cmm/workbook
  -> @cmm/domain types or DTO-shaped input only
```

## Domain Package

`@cmm/domain` is pure TypeScript. It owns domain types, pure operations, and validation
results. It does not depend on Zod or adapter libraries.

Initial domain modules:

```text
packages/domain/src/
  opportunity/
  requirement/
  base-matrix/
  member-response/
  import-review/
  opportunity-comparison/
  consortium-coverage/
  shared/
```

Core types:

```ts
type Opportunity = {
  id: OpportunityId;
  name: string;
  solicitationNumber: string | null;
  issuingAgency: string | null;
  description: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  lastOpenedAt: IsoDateTime | null;
  archivedAt: IsoDateTime | null;
};

type Requirement = {
  id: RequirementId;
  text: string;
  level: number;
  position: number;
  retiredAt: IsoDateTime | null;
};

type MemberResponseEvaluationState = 'candidate' | 'selected' | 'hidden';

type MemberResponse = {
  id: MemberResponseId;
  opportunityId: OpportunityId;
  memberName: string;
  sourceFilename: string | null;
  workbookTitle: string | null;
  importedAt: IsoDateTime;
  archivedAt: IsoDateTime | null;
  evaluationState: MemberResponseEvaluationState | null;
};

type CapabilityScore = 0 | 1 | 2 | 3;
```

Requirement rules:

- Requirements are a flat ordered outline with `level` and `position`.
- Requirement numbers are computed display labels, not durable identity.
- Editing text, reordering, indenting, or outdenting preserves requirement identity.
- Removing a requirement retires it; retired requirements stay in the ordered outline and
  are hidden by default.
- Hard-deleting retired requirements that are referenced by response rows requires an
  impact-aware cleanup flow.

Important pure functions:

```ts
computeRequirementNumbers(rows)
insertRequirementAfter(rows, targetId)
indentRequirementSubtree(rows, targetId)
outdentRequirementSubtree(rows, targetId)
retireRequirementSubtree(rows, targetId)
normalizeRequirementPositions(rows)
validateBaseMatrixForExport(rows, options)
buildImportReviewPlan(baseRequirements, parsedWorkbook)
resolveImportReview(reviewPlan, userDecisions)
buildOpportunityComparison(input)
computeConsortiumCoverage(input)
```

Score and response row rules:

- The only valid capability scores are `0`, `1`, `2`, and `3`.
- Past performance references and response comments are free-form plain text with line
  breaks preserved.
- Rich spreadsheet formatting does not need to be preserved.
- Import review can map, ignore, fix invalid score, or keep unmatched rows.
- Import review does not create new requirements.

## Application Services

`@cmm/application` exposes use-case services, not CRUD APIs. Repositories are internal
ports.

Initial services:

```text
OpportunityService
BaseMatrixService
CapabilityExportService
MemberResponseImportService
OpportunityComparisonService
MemberResponseDetailService
```

Representative use cases:

```ts
createOpportunity(input)
listActiveOpportunities()
listArchivedOpportunities()
openOpportunity(input)
archiveOpportunity(input)
restoreOpportunity(input)
hardDeleteArchivedOpportunity(input)

getBaseMatrix(input)
saveBaseMatrix(input)
validateBaseMatrixForExport(input)

exportBaseCapabilityMatrix(input)
selectAndParseMemberResponseWorkbooks(input)
buildImportReview(input)
saveReviewedMemberResponse(input)

getOpportunityComparison(input)
setMemberResponseEvaluationState(input)
getMemberResponseDetail(input)
compareMemberResponseVersions(input)
```

Service behavior:

- Base matrix saves are revision-guarded. Stale saves return a conflict.
- Autosave conflicts are resolved by the user; do not auto-merge.
- Export, import, opportunity switch, archive, restore, hard delete, and app close flush
  dirty base matrix edits first when possible.
- If a flush fails or conflicts, block the action and let the user retry, discard local
  edits, or stay on the current opportunity.
- Importing a replacement response keeps candidate or selected state, but a hidden
  response becomes candidate so the fresh submission is reviewed again.

Use typed application errors and map them to safe IPC error DTOs. Expected error classes
include:

- `NotFound`
- `ValidationFailed`
- `SaveConflict`
- `WrongOpportunityWorkbook`
- `NoUsableResponseRows`
- `ImportReviewRequired`

Final user-facing copy belongs in the renderer.

## IPC Contracts

`@cmm/contracts` owns IPC DTOs and runtime schemas. Use Zod or an equivalent schema
validator at the IPC boundary.

Contracts should define:

- Channel name.
- Input schema.
- Output schema.
- Derived TypeScript types.

Renderer usage should look like:

```ts
await cmmApi.opportunities.create(input);
await cmmApi.baseMatrix.save(input);
await cmmApi.memberResponses.selectAndParseWorkbooks(input);
await cmmApi.memberResponses.saveReviewedResponse(input);
await cmmApi.comparison.getOpportunityComparison(input);
```

Do not expose:

- `ipcRenderer`
- raw channel names
- generic `invoke(channel, payload)`
- arbitrary filesystem paths controlled by the renderer

Add contract tests that verify every declared channel has a registered main-process
handler.

## Electron Main and Preload

Main process structure:

```text
apps/desktop/src/main/
  bootstrap.ts
  create-app-services.ts
  ipc/
    register-ipc-handlers.ts
    ipc-error.ts
  windows/
    create-main-window.ts
  dialogs/
    electron-file-dialogs.ts
  logging/
    local-logger.ts
```

Preload structure:

```text
apps/desktop/src/preload/
  index.ts
```

Main process owns:

- SQLite database opening and migrations.
- Application service construction.
- IPC handler registration.
- Save/open dialogs.
- Filesystem reads/writes.
- Workbook buffer parsing/building through `@cmm/workbook`.
- Local structured logs in Electron user data.

Preload exposes a narrow `window.cmmApi` generated or derived from contracts.

## Persistence

Use SQLite with `better-sqlite3`, isolated inside `@cmm/persistence-sqlite`. Run SQLite in
the Electron main process. Use numbered SQL migrations from the start.

No prototype JSON migration is required. The app has not launched, and existing prototype
data can be discarded.

Initial schema shape:

```sql
CREATE TABLE opportunities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  solicitation_number TEXT,
  issuing_agency TEXT,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_opened_at TEXT,
  archived_at TEXT
);

CREATE TABLE base_matrix_revisions (
  opportunity_id TEXT PRIMARY KEY,
  revision TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
);

CREATE TABLE requirements (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL,
  text TEXT NOT NULL,
  level INTEGER NOT NULL,
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  retired_at TEXT,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
);

CREATE INDEX idx_requirements_opportunity_position
  ON requirements(opportunity_id, position);

CREATE TABLE member_responses (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  normalized_member_name TEXT NOT NULL,
  source_filename TEXT,
  workbook_title TEXT,
  imported_at TEXT NOT NULL,
  archived_at TEXT,
  replaced_by_response_id TEXT,
  evaluation_state TEXT,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
  FOREIGN KEY (replaced_by_response_id) REFERENCES member_responses(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX idx_member_responses_one_active_per_member
  ON member_responses(opportunity_id, normalized_member_name)
  WHERE archived_at IS NULL;

CREATE INDEX idx_member_responses_opportunity_active
  ON member_responses(opportunity_id, archived_at);

CREATE TABLE member_response_rows (
  id TEXT PRIMARY KEY,
  response_id TEXT NOT NULL,
  review_status TEXT NOT NULL,
  mapped_requirement_id TEXT,
  original_requirement_id TEXT,
  original_requirement_number TEXT,
  original_requirement_text TEXT,
  original_score_text TEXT,
  original_past_performance TEXT,
  original_comments TEXT,
  requirement_number_snapshot TEXT,
  requirement_text_snapshot TEXT,
  score INTEGER,
  past_performance TEXT,
  comments TEXT,
  review_note TEXT,
  FOREIGN KEY (response_id) REFERENCES member_responses(id) ON DELETE CASCADE,
  FOREIGN KEY (mapped_requirement_id) REFERENCES requirements(id) ON DELETE SET NULL
);

CREATE INDEX idx_member_response_rows_response
  ON member_response_rows(response_id);

CREATE INDEX idx_member_response_rows_requirement
  ON member_response_rows(mapped_requirement_id);
```

Notes:

- `evaluation_state` is meaningful only for active responses.
- `review_status` should cover at least `mapped`, `ignored`, and `unmatched`.
- Store original parsed values and final reviewed values because CMM does not retain the
  original workbook file.
- Enable SQLite foreign keys and cascade explicit hard deletes.
- Normal workflows archive opportunities, retire requirements, and archive previous
  submissions rather than hard-deleting.

Out of scope for the rebuild:

- App-level database encryption.
- Backup and restore workflows.
- Remote telemetry.
- Global potential consortium member directory.

## Workbook Package

Use ExcelJS in `@cmm/workbook`. The package works with buffers, not file paths.

Initial public API:

```ts
buildBaseCapabilityMatrixWorkbook(input): Uint8Array
parseMemberResponseWorkbook(buffer, options): ParsedMemberResponseWorkbook
```

Workbook export requirements:

- Include hidden CMM metadata: workbook format version, opportunity ID, export timestamp,
  and stable requirement IDs.
- Include a protected opportunity title/solicitation header.
- Include an editable potential consortium member name field, blank or generic on export.
- Include a concise protected score legend/instructions area.
- Protect structural columns: requirement number, requirement text, hidden IDs, and
  opportunity metadata.
- Leave response fields editable: score, past performance reference, comments, and member
  name.
- Use score validation/dropdowns for `0`, `1`, `2`, and `3`.
- Use conditional score formatting and frozen panes where useful.
- Exclude blank requirements by default, but allow explicit include after warning.
- Exclude retired requirements by default, but allow explicit include.

Workbook import requirements:

- Optimize for CMM-authored workbooks.
- Use hidden requirement IDs when intact.
- Fall back to number/text matching when IDs or structure are damaged.
- Do not infer arbitrary spreadsheets from scratch.
- If a workbook has no usable response rows, block import.
- If hidden opportunity ID belongs to another local opportunity, warn and suggest the
  matching opportunity when known.
- If opportunity ID mismatches the current opportunity, block by default and require an
  explicit override plus usable requirement matches to continue.
- Prefer workbook member name, fall back to filename, then require user confirmation.

Golden tests should cover:

- Generated workbook opens through ExcelJS.
- Hidden metadata and requirement IDs exist.
- Protected structural cells exist.
- Score validation and conditional formatting exist.
- Parser reads generated workbook.
- Parser handles edited/damaged CMM workbooks through review.
- Parser reports wrong opportunity and no usable rows clearly.
- Export/import round trip.

## Renderer

Use normal React DOM. Do not carry forward React Native Web or the compatibility shim.

Renderer structure:

```text
apps/desktop/src/renderer/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
```

Use lightweight layer rules:

- Pages compose widgets and contain minimal workflow logic.
- Widgets are large visible regions.
- Features own user actions and local workflow state.
- Entities contain small domain-specific renderers and view models.
- Shared renderer code stays generic to the renderer.
- Imports flow downward.

Suggested feature/widget areas:

```text
pages/opportunity-workspace/

widgets/opportunity-sidebar/
widgets/workspace-header/
widgets/base-matrix-panel/
widgets/opportunity-comparison-panel/
widgets/member-response-detail/

features/create-opportunity/
features/archive-opportunity/
features/edit-base-matrix/
features/export-base-matrix/
features/import-member-responses/
features/compare-opportunity/
features/manage-member-response-state/

entities/opportunity/
entities/requirement/
entities/member-response/
```

State choices:

- Use TanStack Query for IPC-backed server-state.
- Keep base matrix draft state local to `edit-base-matrix`.
- Use autosave with visible status and manual flush.
- Use a custom typed reducer for import review.
- Use TanStack Table for opportunity comparison.
- Keep the requirements editor custom.

Opportunity comparison behavior:

- Candidate responses are visible by default.
- Selected responses are visible and visually marked.
- Hidden responses are excluded from the main grid but accessible through a hidden
  responses section/filter.
- Compact comparison mode focuses on scores.
- Summary comparison mode shows scores with brief past performance/comment indicators.
- Full text belongs in member response detail.
- Basic filtering is in scope.
- Member response columns can be hidden through the hidden response state.
- Per-requirement coverage shows best selected score as primary; breakdown appears on
  hover or detail.
- If no selected member covers a requirement, coverage is `0`.

Member response detail behavior:

- Shows full free-form past performance and comments.
- Shows ignored rows and unmatched rows.
- Provides previous submission comparison against the active response for that member.
- Does not mix archived previous submissions into the main opportunity comparison.

## UI and Design

Preserve the current color scheme and hard-edged operational feel. Redesign layout and
component structure around the rebuilt workflows.

Design direction:

- Dense, operational, work-focused UI.
- No landing-page or marketing surface.
- Use generated UI mockups only as selected design references under `docs/design/`.
- Do not use generated mockups as production assets.
- `@cmm/ui` contains generic React DOM primitives and theme tokens only.
- CMM-specific components stay in renderer features/widgets/entities.

Accessibility and keyboard baseline:

- Base matrix editor supports Enter insert, Tab indent, Shift+Tab outdent, and
  spreadsheet-like navigation where practical.
- Import review and opportunity comparison support keyboard access for core actions.
- Modals and drawers handle focus and Escape.
- Score controls are accessible form controls.
- Dense tables preserve visible focus states.

## Desktop Scope

CMM remains a single-user local Electron desktop app.

In scope:

- Local SQLite data in the standard Electron user data directory.
- Cross-platform-safe code paths.
- macOS-first validation during rebuild.
- Packaging-compatible dependency choices.
- Local structured main-process logging.

Out of scope for the rebuild:

- Cloud sync.
- Accounts or tenancy.
- Shared database or multi-user conflict resolution.
- App-data backup/restore.
- Remote telemetry/error reporting.
- Internationalization infrastructure.
- File attachments.
- Storing original returned Excel files.
- Windows/Linux packaging validation before product behavior stabilizes.

## Testing Strategy

Keep tests fast and package-focused.

Unit tests:

- `@cmm/domain`: requirement numbering, edit operations, retirement, export validation,
  import review planning, opportunity comparison, consortium coverage.
- `@cmm/application`: opportunity lifecycle, base matrix revision conflicts, export flush
  behavior, import review save behavior, response replacement/evaluation state.
- `@cmm/workbook`: build, parse, damaged workbook fallback, wrong opportunity, invalid
  score, round trip.

Integration tests:

- `@cmm/persistence-sqlite`: migrations, repositories, cascades, partial unique active
  response constraint.
- `@cmm/contracts` or desktop tests: every contract has a handler; IPC validates input and
  output.

Desktop/e2e tests:

- Create opportunity, edit base matrix, relaunch, verify persistence.
- Keyboard requirement editing.
- Export workbook and parse it back.
- Import one member response.
- Import mismatched response and review rows.
- Replace response from same member and verify previous submission retained.
- Toggle candidate/selected/hidden and verify coverage.
- Archive/restore opportunity and verify read-only archived state.
- Open member response detail and compare previous submission.

Run focused package checks first, then broader workspace checks when shared behavior is
touched.

## Documentation and Agent Guidance

This plan should feed the later PRD and issue breakdown. Do not turn the macro phases into
single large issues. Break work into small vertical slices when using issue-generation
skills.

Maintain:

- `CONTEXT.md`: domain language only.
- `docs/adr/`: durable decisions and tradeoffs.
- `docs/architecture/rebuild-plan.md`: consolidated target plan.
- `AGENTS.md`: concise operational guide pointing to the above docs.

Create more architecture docs only when implementation needs separate references, such as:

- `docs/architecture/dependency-boundaries.md`
- `docs/architecture/electron-ipc.md`
- `docs/architecture/persistence.md`
- `docs/architecture/workbook-format.md`
