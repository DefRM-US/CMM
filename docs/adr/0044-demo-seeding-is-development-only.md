# Demo Seeding Is Development Only

Sample or demo data seeding should remain a development and demonstration aid, not a core
production workflow. It can help build UI states, run tests, and demo the app, but normal
users should not see sample opportunities unless they intentionally use a demo path.

**Consequences**

- Seed data can live in test fixtures or development helpers.
- Production UI should not depend on sample data workflows.
- Demo opportunities should not shape the domain model.
