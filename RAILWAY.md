# Railway Deployment (Phase 2)

Start command:

```
uvicorn api.main:app --host 0.0.0.0 --port $PORT
```

Notes:
- The API trains once at startup and serves inference from memory.
- No per-request retraining.
