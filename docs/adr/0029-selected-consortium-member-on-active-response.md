# Selected Consortium Member on Active Response

Selected consortium membership should be stored on the active member response, because
CMM does not model potential consortium members as separate entities in the rebuild. The
active response represents that member within an opportunity, and its evaluation state
determines whether the member is a candidate, selected for coverage, or hidden.

**Consequences**

- `member_responses` should include an evaluation state such as `candidate`, `selected`,
  or `hidden`.
- Selected responses count toward consortium coverage; candidate and hidden responses do
  not.
- Hidden responses are excluded from the main opportunity comparison.
- Replacing an active response for the same member should carry candidate or selected
  state forward, but a hidden response should reset to candidate so the fresh submission
  is reviewed again.
- If CMM later introduces a member table, this flag can move to an opportunity-member
  relationship.
