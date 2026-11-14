# NearMiss AI

Local aviation incident investigation prototype. See the [implementation plan](NearMissAI_Two_Person_Implementation_Plan.md) for the full scope and [shared contract](contracts.md) for the handoff between teammates.

## Team boundaries

| Area | Owner | Purpose |
| --- | --- | --- |
| `data/`, `data_pipeline/`, `dashboard/` | Builder A (Codex) | ASRS data, retrieval, and Streamlit UI |
| `service/`, `agents/`, `evidence/` | Builder B (Claude Code) | FastAPI, Drex agents, and NDI evidence |
| `evaluation/` | Builder A | Optional benchmark, after the core demo works |
| `contracts.md`, `tests/fixtures/` | Shared | Agree on changes before either side relies on them |

Use separate branches for implementation work. The `asrs_case_*.json` files in `tests/fixtures/` are real NASA ASRS case contexts. The older `*_mock.json` files are synthetic interface examples and must never be presented as real reports, NDI output, or Drex decisions.

## Builder A: local run

The official June 2024 ASRS CSV was downloaded and imported locally; its provenance and export recipe are in [the data manifest](data/manifest.md). Raw data and DuckDB files are excluded from Git. To reproduce on another machine, export the CSV from NASA as described there and save it to `data/asrs_june_2024.csv`.

Use Python 3.11–3.14 (DuckDB wheels may lag the newest Python release):

```sh
python3.14 -m venv .venv14
.venv14/bin/pip install -r requirements-a.txt
.venv14/bin/python -m data_pipeline.asrs import data/asrs_june_2024.csv
.venv14/bin/streamlit run dashboard/app.py
```

The dashboard sends a real `CaseContext` to Builder B's local `POST /analyze` endpoint and displays only returned real results. It also works as a case browser before the service is running, showing an explicit service warning. No API key is needed for Builder A. Keep Builder B's Nace key in local environment variables, never in source control.
