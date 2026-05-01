# Member Names on Member Responses

The rebuild should store the potential consortium member name directly on each member
response instead of introducing a separate member table. CMM is a local single-user app,
members have no independent metadata yet, and an opportunity is expected to have dozens
of responses rather than a large shared member directory.

**Consequences**

- Re-import replacement is based on normalized `memberName` within an opportunity.
- Normalized-name matching should suggest a likely existing member, but the user decides
  whether the import creates a new active response or replaces an existing active response.
- Users can choose to replace an existing active response even when the imported member
  name does not exactly match.
- When replacing an existing active response, the default display name remains the
  existing member name; the user can explicitly choose or edit a different name during
  import review.
- A separate member table can be added later if members gain contacts, roles, notes, or
  cross-opportunity analytics.
- The initial persistence model stays focused on opportunities, base requirements, member
  responses, and response rows.
