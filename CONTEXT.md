# CMM Domain

CMM supports teams pursuing defense procurement opportunities by comparing member
responses against a shared government-derived capability matrix.

## Language

**Procurement Opportunity**:
A contract pursuit that has one government-derived base capability matrix and many member responses.
_Also_: Opportunity
_Avoid_: Project, contract, workspace

**Active Opportunity**:
A procurement opportunity shown in the default opportunity list.
_Avoid_: Open project

**Archived Opportunity**:
A procurement opportunity hidden from the default opportunity list but retained for later reference.
_Avoid_: Deleted project, closed contract

**Solicitation Number**:
An optional identifier assigned to a procurement opportunity by the issuing organization.
_Avoid_: Project code

**Issuing Agency**:
The organization that issued the procurement opportunity.
_Avoid_: Customer, client

**Base Capability Matrix**:
The authoritative set of requirements for a procurement opportunity.
_Avoid_: Project matrix, source spreadsheet

**Requirement**:
An individual item in the base capability matrix that potential consortium members respond to.
_Avoid_: Row, question

**Active Requirement**:
A requirement currently shown in the base capability matrix by default.
_Avoid_: Visible row

**Retired Requirement**:
A requirement removed from the default base capability matrix view but retained for historical member response matching.
_Avoid_: Deleted requirement, old row

**Capability Score**:
The fixed 0-3 score a potential consortium member gives for a requirement.
_Avoid_: Rating, grade, configurable score

**Consortium Coverage**:
How well the active member responses collectively cover the requirements in an opportunity.
_Avoid_: Weighted ranking, fit score

**Past Performance Reference**:
Free-form text describing relevant prior work for a requirement.
_Avoid_: Evidence record, project reference object

**Response Comment**:
Free-form explanatory text submitted with a requirement response.
_Avoid_: Note, annotation

**Import Review**:
The user decision step for resolving ambiguous or invalid rows in a returned member response workbook.
_Avoid_: Automatic cleanup, validation error list

**Mapped Response Row**:
A member response row linked to an active or retired requirement.
_Avoid_: Accepted row

**Ignored Response Row**:
A member response row the user deliberately excludes during import review.
_Avoid_: Deleted import row

**Unmatched Response Row**:
A meaningful member response row kept without a safe requirement mapping.
_Avoid_: Orphan row

**Member Response Record**:
The retained imported data for a member response, including original row content, final row status, source filename, timestamps, and active or archived state.
_Avoid_: Audit log, decision event stream

**Opportunity Comparison**:
The side-by-side view of active member responses for one procurement opportunity.
_Avoid_: Comparison matrix, response matrix

**Compact Comparison View**:
An opportunity comparison mode focused on capability scores for quick filtering.
_Avoid_: Score-only matrix

**Summary Comparison View**:
An opportunity comparison mode showing capability scores with brief past performance and comment indicators or summaries.
_Avoid_: Detail view

**Potential Consortium Member**:
An organization being evaluated as a possible participant in the consortium for a procurement opportunity.
_Also_: Consortium Member
_Avoid_: Vendor, company, defense contractor

**Selected Consortium Member**:
A potential consortium member the user marks as counting toward consortium coverage for an opportunity.
_Avoid_: Winner, awarded member

**Hidden Member Response**:
A member response the user excludes from the opportunity comparison and consortium coverage.
_Avoid_: Collapsed column, display-only hidden column

**Candidate Member Response**:
A visible member response that has not been selected for consortium coverage.
_Avoid_: Neutral column

**Member Response**:
A completed capability matrix submitted by a potential consortium member for one procurement opportunity.
_Avoid_: Contractor response, import, workbook, vendor response

**Active Member Response**:
The member response currently used in the opportunity-level comparison for a potential consortium member.
_Avoid_: Latest import, current workbook

**Archived Member Response**:
A previous member response from a potential consortium member retained for manual version comparison or audit.
_Also_: Previous Submission
_Avoid_: Deleted response, old import

## Relationships

- A **Procurement Opportunity** has exactly one **Base Capability Matrix**.
- A **Procurement Opportunity** can be active or archived.
- A **Procurement Opportunity** has a required name and may have a **Solicitation Number**,
  an **Issuing Agency**, and a free-form description.
- A **Base Capability Matrix** contains one or more **Requirements**.
- A **Requirement** can be active or retired.
- A retired requirement remains available for matching historical **Member Responses**.
- Editing requirement text does not create a new **Requirement**.
- Reordering, indenting, or outdenting a requirement does not create a new
  **Requirement**.
- Requirement numbers are computed display labels, not durable requirement identity.
- A **Capability Score** is always one of 0, 1, 2, or 3.
- **Past Performance References** and **Response Comments** are free-form text because
  potential consortium members fill out returned matrices by hand and do not follow a
  standardized evidence format.
- **Past Performance References** and **Response Comments** preserve plain text and line
  breaks, not rich spreadsheet formatting.
- A **Potential Consortium Member** submits zero or one active **Member Response** for a
  **Procurement Opportunity**.
- A **Procurement Opportunity** can have many **Member Responses**.
- CMM identifies a **Potential Consortium Member** by the member name on a **Member Response**.
- A **Potential Consortium Member** has at most one **Active Member Response** per
  **Procurement Opportunity**.
- A new submission from the same **Potential Consortium Member** becomes the **Active Member Response**;
  previous submissions become **Archived Member Responses**.
- When importing a **Member Response**, CMM may suggest an existing member match, but the
  user decides whether the import creates a new active response or replaces an existing
  active response.
- When replacing an existing active **Member Response**, CMM keeps the existing member
  name by default unless the user explicitly chooses a different display name.
- The opportunity comparison view compares active responses across potential consortium members,
  not versions from the same potential consortium member.
- "Previous submission" is the preferred UI label for an **Archived Member Response**.
- A **Potential Consortium Member** can be marked as a **Selected Consortium Member** for
  an opportunity.
- An active **Member Response** has one evaluation state: candidate, selected, or hidden.
- Replacing an active **Member Response** preserves candidate or selected state, but a
  hidden response becomes candidate so the fresh submission is reviewed again.
- Only active **Member Responses** have candidate, selected, or hidden evaluation state;
  archived previous submissions do not count toward evaluation or coverage.
- **Import Review** is required when a returned workbook contains row-level ambiguity or
  invalid row values.
- A returned workbook with no usable response rows is not a valid **Member Response**.
- During **Import Review**, a user can map a row to an active or retired **Requirement**,
  ignore a row, fix an invalid **Capability Score**, or keep a meaningful row unmatched.
- **Import Review** does not create new **Requirements**; base matrix changes happen in
  the **Base Capability Matrix**.
- Users may select multiple returned workbooks for import, but each **Member Response** is
  reviewed one at a time.
- In a multi-file import, each reviewed **Member Response** is saved before moving to the
  next response.
- **Ignored Response Rows** are hidden from the normal opportunity comparison but remain
  visible in the member response detail or audit view.
- **Unmatched Response Rows** are shown outside the normal comparison rows, such as in an
  expandable section for the member response.
- A **Member Response Record** retains enough information to review the import outcome,
  but CMM does not keep a full event log of every import review decision.
- Archived **Member Responses** are compared against the active response for the same
  **Potential Consortium Member** in the member response detail view, not in the normal
  opportunity comparison.
- An **Opportunity Comparison** compares active member responses across potential
  consortium members.
- Candidate member responses are visible in the main opportunity comparison by default.
- Selected member responses are visible and visually marked in the main opportunity
  comparison.
- An **Opportunity Comparison** supports a compact score-focused mode and a summary mode;
  full free-form response text belongs in member response detail.
- An **Opportunity Comparison** supports basic filtering and hiding member responses.
- CMM does not rank potential consortium members or compute aggregate fit scores in the
  rebuild.
- Requirements do not have weights or priorities in the rebuild; the goal is strong
  consortium coverage across every requirement.
- **Consortium Coverage** is computed from selected consortium members, not every visible
  potential consortium member.
- For each requirement, **Consortium Coverage** primarily shows the best selected
  capability score; score breakdowns are available on hover or detail.
- If no selected consortium member covers a requirement, its **Consortium Coverage** is 0.
- Hidden member responses do not count toward **Consortium Coverage**.
- Hidden member responses are still active responses and remain accessible from a hidden
  responses section or filter.
- Exported base capability matrix files are generated artifacts, not durable domain
  records in CMM.
- Blank requirements are excluded from base matrix export by default, but the user can
  explicitly include them after a warning.
- Retired requirements are excluded from base matrix export by default, but the user can
  explicitly include them.
- Exported base capability matrix workbooks include a concise protected header or legend
  area explaining the fixed score scale and editable response fields.
- Hard deletion is an explicit cleanup action from archived or historical views and
  requires confirmation; normal workflows archive opportunities, retire requirements, or
  archive previous member responses.
- Archived opportunities are read-only until restored.
- Restoring an archived opportunity preserves its requirements, member responses, previous
  submissions, and response evaluation states.

## Example Dialogue

> **Dev:** "Can one procurement opportunity have multiple base capability matrices?"
> **Domain expert:** "No. The requirements come from the government, so there is one base capability matrix for the opportunity. Multiple potential consortium members fill out that same matrix."
>
> **Dev:** "When the same potential consortium member sends an updated matrix, do we compare both versions in the main opportunity view?"
> **Domain expert:** "No. The latest submission is active for cross-member comparison, but earlier submissions are kept so a user can manually compare versions when needed."
>
> **Dev:** "If a requirement is removed after responses are imported, should the old answers lose their match?"
> **Domain expert:** "No. Removed requirements are hidden by default, not destroyed, so old responses can still be expanded and reviewed."
>
> **Dev:** "Can each opportunity use its own scoring scale?"
> **Domain expert:** "No. The 0-3 capability scale is standard in this industry; only the explanatory legend text should vary."
>
> **Dev:** "Should past performance be modeled as structured evidence?"
> **Domain expert:** "No. Members fill the spreadsheet out by hand, so references are non-standard free-form text."
>
> **Dev:** "If one row has an invalid score, should the whole returned workbook fail?"
> **Domain expert:** "No. The user should review and decide what happens with each problematic row, unless the workbook has no usable response rows at all."
>
> **Dev:** "Can importing a member's edited workbook create new requirements?"
> **Domain expert:** "No. Review can map, ignore, fix scores, or keep rows unmatched, but the base matrix is edited intentionally elsewhere."

## Flagged Ambiguities

- "Project" currently means **Procurement Opportunity** in the application, but the
  domain language should use **Procurement Opportunity** when discussing the contract pursuit.
- "Opportunity" is the accepted shorthand for **Procurement Opportunity**.
- A **Potential Consortium Member** may be a repeat real-world organization across opportunities,
  but CMM currently identifies members by the name on a **Member Response** rather
  than maintaining a global consortium member directory.
- "Defense contractor" describes many real-world organizations in this space, but CMM's
  product language should use **Potential Consortium Member** because the app evaluates
  possible teammates before the final consortium is selected.
- "Deleting" a **Requirement** means retiring it from the default base matrix view, not
  destroying it.
