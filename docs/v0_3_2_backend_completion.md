# Dravix v0.3.2 Backend Completion

## Implemented Features

- Single material analysis via `/predict`
- Candidate material ranking via `/rank`
- Material comparison via `/compare`
- Sensitivity simulation via `/simulate`
- Coating lookup and coating analysis via `/coatings` and `/coatings/analyze`
- Analysis history via `/analysis/recent`, `/analysis/{analysis_id}`, and `/analysis/{analysis_id}/interactive`
- Candidate clustering via `/clusters`
- Dataset export via `/dataset/export`
- Dataset upload via `/dataset/upload`
- Technical datasheet generation via `/tds/{analysis_id}`
- Ranking export via `/export/ranking`
- Report export via `/export/report/{analysis_id}`
- Advisor summary and advisor chat via `/advisor/{analysis_id}` and `/advisor/chat`
- Confidence scoring, OOD flags, sensitivity summaries, response curves, counterfactual suggestions, and experiment recommendations in prediction outputs
- Continuous logging hooks for predict, rank, simulate, compare, and model startup registration when database access is available

## Partially Available Features

- Automatic Supabase DDL execution is best-effort only
- Database-backed features degrade safely if tables are missing
- Advisor uses OpenAI only when `OPENAI_API_KEY` is configured

## Required Environment Variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` for OpenAI-backed advisor responses
- `DRAVIX_MODEL_VERSION` optional model selection override

## Expected Tables

- `analysis_runs`
- `analysis_results`
- `dataset_materials`
- `custom_materials`
- `simulation_logs`
- `model_registry`

## Validation

Run:

```bash
python scripts/test_platform_endpoints.py
```

Compile verification:

```bash
python3 -m compileall api app backend src main.py train_model.py scripts/test_platform_endpoints.py
```

## Frontend Assumptions

The frontend can assume:

- `/predict`, `/rank`, `/simulate`, and `/compare` share the same normalized material input contract
- prediction outputs include analysis metadata, sensitivity summaries, experiment recommendations, counterfactual suggestions, and OOD flags
- interactive analysis data is available at `/analysis/{analysis_id}/interactive`
- advisor answers are grounded in stored analysis data, with fallback behavior when OpenAI is unavailable
- dataset upload and export endpoints are available for platform workflows
