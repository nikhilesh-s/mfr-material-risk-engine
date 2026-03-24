# Dravix Database Setup

## Reset And Initialize

The canonical Dravix Supabase schema reset script is:

- [reset_and_init.sql](/Users/niks/Documents/GitHub/mfr-material-risk-engine/backend/db/reset_and_init.sql)

Run it in the Supabase SQL editor or through your Postgres client before deploying the backend:

```sql
\i backend/db/reset_and_init.sql
```

Or paste the file contents into the Supabase SQL editor and execute them.

## Required Environment Variables

The backend now requires these variables at startup:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

If either value is missing, the API will fail during startup.

## Schema Overview

The reset script creates the canonical Dravix tables:

- `materials`
  - material identity and source tracking
- `material_properties`
  - one-to-one numeric descriptor storage for each material
- `analysis_runs`
  - analysis metadata, timestamp, model version, dataset version
- `analysis_results`
  - persisted resistance result summary
- `advisor_insights`
  - stored advisor outputs
- `dataset_materials`
  - uploaded or curated dataset rows for expansion and clustering

## Debugging Steps

1. Confirm Supabase credentials are set in the Render environment.
2. Run [reset_and_init.sql](/Users/niks/Documents/GitHub/mfr-material-risk-engine/backend/db/reset_and_init.sql) against the target Supabase database.
3. Check startup logs for:
   - `Supabase URL detected`
   - `Connecting to Supabase`
   - `Schema verification passed`
4. If startup fails, check `/db/schema-status` after the schema is restored.
5. If `/db/schema-status` reports missing tables, rerun the reset script and verify you are pointing at the correct Supabase project.
