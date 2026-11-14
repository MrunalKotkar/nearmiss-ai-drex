# NearMiss AI

Local aviation incident investigation prototype. See the [implementation plan](NearMissAI_Two_Person_Implementation_Plan.md) for the full scope and [shared contract](contracts.md) for the handoff between teammates.

## Team boundaries

| Area | Owner | Purpose |
| --- | --- | --- |
| `data/`, `data_pipeline/`, `dashboard/` | Builder A (Codex) | ASRS data, retrieval, and Streamlit UI |
| `service/`, `agents/`, `evidence/` | Builder B (Claude Code) | FastAPI, Drex agents, and NDI evidence |
| `evaluation/` | Builder A | Optional benchmark, after the core demo works |
| `contracts.md`, `tests/fixtures/` | Shared | Agree on changes before either side relies on them |

Use separate branches for implementation work. The JSON files in `tests/fixtures/` are **synthetic interface examples**, not NASA reports, NDI output, or actual Drex decisions. Replace them with real, traceable data and model results during implementation.

No application dependencies or startup commands are defined yet; each owner can add those with their implementation. Keep API keys in local environment variables and large or sensitive datasets outside Git.
