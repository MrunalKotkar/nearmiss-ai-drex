# NearMiss AI — Two-Person Independent Implementation Plan

**Hackathon:** Drexathon, November 14, 2026  
**Primary track:** Swarm Intelligence  
**Fallback track:** Apex Predator, only if an optional Drex-versus-OpenAI benchmark produces credible measured results  
**Demo:** Local laptop  
**Builder A:** You — Codex  
**Builder B:** Teammate — Claude Code  
**Principal technologies:** Nace Drex, Nace Perception/NDI, Python, FastAPI, DuckDB, Streamlit  
**Deliverable:** A working multi-agent aviation-incident investigation prototype with an inspectable collaboration trace and cited source evidence  
**Document rule:** This plan intentionally contains no implementation code. Its contracts and steps are behavioral specifications for coding agents.

---

## 1. Executive decision

Build **NearMiss AI: a cooperative, evidence-grounded aviation incident investigation assistant**. Given an incident narrative from the NASA Aviation Safety Reporting System (ASRS), several specialized agents examine historical context and aviation guidance, debate ambiguities, and jointly recommend **what a human safety analyst should investigate next**.

The central innovation for this hackathon is not another classifier. It is a **transparent multi-agent decision process** where Nace Drex selects each agent's bounded decisions and NDI supplies source-located safety guidance. Each agent's contribution affects a shared case state, and disagreement may trigger a targeted second round of evidence review.

**Demo success statement:** "Our agents independently evaluate a real incident, exchange structured findings, challenge weak evidence, and reach an auditable investigation recommendation with Drex decisions grounded in NDI documents."

**Strict boundaries:** No prediction of accident probability; no operational aviation decisions; no claim that NASA ASRS reports have been independently verified. The result is **analyst triage**, not a safety determination.

## 2. Product scope and novelty

### Problem

Aviation incident narratives describe complex interactions among people, procedures, and operating conditions. Looking at one report alone may obscure recurring circumstances. Related procedural guidance lives in separate PDFs. A safety analyst needs a defensible **next investigative step**, not merely a summary.

### User experience

1. Open a local dashboard containing a real ASRS incident sample and searchable cases.
2. Select an incident with a narrative, date and available metadata.
3. Start a **Collaborative Investigation**.
4. Watch agents take turns: pattern analysis, evidence challenge, investigation recommendation, coordinator resolution.
5. See each agent's input, Drex-selected option, probability distribution, references to other incidents or NDI-parsed source passages, and the shared-state update.
6. See final recommendation: **review a matched historical cluster**, **request additional context**, **refer for human specialist review**, or **no specific pattern identified**.
7. Optionally reveal comparison results against OpenAI for the same bounded decision, if the benchmark module is ready.

### Novelty claims we can responsibly make

- **Coordinated decisions rather than a single classification:** distinct agents produce intermediate judgments that change later judgments.
- **Evidence challenge:** an evidence agent can dispute a pattern agent's claim and cause reconsideration.
- **Grounded cross-document context:** NDI turns aviation procedural PDFs into traceable supporting passages for the decision process.
- **Observable decision trace:** judges can inspect option probabilities and the exchange that led to escalation.
- **Scalable data architecture:** DuckDB searches a large historical archive, while Drex evaluates selected cases instead of blindly processing every record.

**Avoid claiming:** the first AI aviation safety tool, verified accident prediction, guaranteed LLM superiority, or validated causal inference.

---

## 3. Architecture: what belongs where

### Runtime data flow

**ASRS CSV → DuckDB data layer → selected incident + similar historical incidents → multi-agent orchestrator → Drex decisions**

**Public safety PDFs → NDI Parse/Extract/Ground (one-time ingestion) → cached source passages → evidence agent and coordinator**

**Multi-agent results → FastAPI response → local Streamlit dashboard**

### Division of responsibilities by component

| Component | Owner | Purpose |
|---|---|---|
| ASRS acquisition and CSV validation | A / Codex | Prepare genuine incident records and stable IDs |
| DuckDB and historical case retrieval | A / Codex | Filter incidents and select comparable historical cases |
| Streamlit UI / demo story | A / Codex | Browse cases, launch analysis, show collaboration, citations, final result |
| Local API boundary and request validation | B / Claude Code | Accept a case package; return an investigation trace |
| NDI document processing and citation cache | B / Claude Code | Parse relevant PDFs, extract/ground source evidence, reuse results |
| Drex decision client and question definitions | B / Claude Code | Evaluate typed questions and record real probabilities |
| Multi-agent coordination | B / Claude Code | Pattern, Evidence, Investigation and Coordinator agent rounds |
| Integration smoke tests and final pitch | Both | Validate end-to-end evidence, decisions and collaborative behavior |
| OpenAI benchmark | A if time remains, with B providing common decision interface | Optional secondary evidence; not part of the critical path |

**Balanced workload:** A owns substantial engineering in data retrieval, dashboard, user journey and optional evaluation. B owns the Nace integrations, API, and multi-agent engine. Both can independently complete and locally test their entire side against mocks.

### Deliberately avoid

- Custom model training or fine-tuning.
- New database services, AWS deployment or cloud frontend hosting.
- A vector database unless DuckDB/lexical retrieval proves insufficient.
- Live NDI parsing for every incident; preprocess/cite PDFs once.
- Integrating the Intern harness into the MVP. It is optional and unrelated to demonstrating actual swarm coordination.
- Making the application depend on an unverified DuckDB extension: Python + DuckDB + Nace API is sufficient.

---

## 4. Collaboration design: make it a real swarm

**Each agent must use Drex for its discretionary decision.** Deterministic Python logic can move data, retrieve candidates, apply safety rules and manage workflow state, but it should not secretly replace the agents' decision calls.

### Agent P — Pattern Agent

**Receives:** current narrative, relevant metadata, and a small fixed set of historical candidate narratives or summaries from DuckDB.  
**Asks Drex:** Which of the supported precursor families best matches the evidence? Is there enough signal to suggest a historical pattern?  
**Returns:** proposed pattern family; candidate historical report IDs; match assessment and probability distribution; uncertainty note.  
**Does not:** assert causal explanation or accident likelihood.

Suggested initial taxonomy, refined after inspecting the actual dataset: **communication/coordination**, **runway/surface operations**, **procedural deviation**, **other**, **insufficient evidence**. Do not use an unvalidated ASRS label as ground truth for a different task.

### Agent E — Evidence Agent

**Receives:** incident, Pattern Agent claim, and NDI-derived passages from appropriate guidance PDFs.  
**Asks Drex:** Does the supplied evidence support the pattern claim, conflict with it, or leave it unresolved? Is a crucial source missing?  
**Returns:** evidence stance; source document/page/passage IDs; a challenge to the pattern claim if warranted; a request for a narrower source if needed.  
**Does not:** fabricate quotes or cite a Drex score as documentary evidence.

### Agent I — Investigation Agent

**Receives:** case, Pattern Agent candidate, Evidence Agent challenge/support, and uncertainty status.  
**Asks Drex:** Which investigation next step is warranted? What is the **human review priority**, not predicted accident severity?  
**Returns:** one of `investigate_cluster`, `request_context`, `specialist_review`, `no_pattern_identified`; routine/elevated/urgent **review** priority; probabilities; short evidence-linked rationale assembled by application logic.

### Agent C — Coordinator Agent

**Receives:** all three previous structured messages and the available citations.  
**Asks Drex:** Should the recommendation be accepted, amended, or returned for targeted re-evaluation? Which evidence conflict most needs resolution?  
**Returns:** final proposed next action and a decision trace.  
**Must demonstrate collaboration:** if Evidence and Pattern Agents disagree materially or evidence is missing, the Coordinator requests a second Evidence/Pattern pass with a targeted question, then revisits the recommendation. Cap this at **one additional round** for latency and stability.

### Shared-state protocol

After each call, append a message to the common investigation trace containing: source agent, input summary, its question, allowed choices, selected choice, returned probabilities, references, and what changed in shared state. The next agent consumes **the previous agents' findings**, rather than independently rereading the original incident alone.

**Swarm proof:** A case where Pattern proposes one hazard family, Evidence challenges it from a NDI-cited passage, and Coordinator triggers a revised conclusion. Record actual Drex outputs; choose an appropriate live test case without preprogramming model judgments.

### Decision policy

- Missing source references or incomplete NDI results cannot be represented as verified support.
- Uncertain/conflicting outputs route to human review or a targeted second pass.
- Treat Drex probabilities as decision scores, not measured ground-truth probabilities or explanations.
- If an external API fails, show **incomplete / cannot decide**, not a fake success.
- Human analyst remains responsible for any consequential interpretation.

---

## 5. Shared contracts — agree on these before coding

The two coding agents must agree to **one versioned contract**. Record it in `contracts.md` on the main branch during the first 15 minutes. Both sides implement independently against examples, without importing each other's unfinished code.

### Contract A: CaseContext (A → B)

Required fields and semantics:

| Field | Meaning |
|---|---|
| `case_id` | Stable, unique public ASRS record identifier or deterministic local ID |
| `narrative` | Original de-identified report text, not generated or rewritten |
| `metadata` | Only available fields actually present in the export; null when missing |
| `candidate_incidents` | Small list (e.g., 3–5) of candidate IDs, narratives/excerpts, and retrieval scores |
| `retrieval_method` | How A selected candidates; retrieval score is not a safety risk score |
| `data_source` | NASA ASRS provenance and sample information |

Avoid transmitting thousands of records to Drex. The dashboard and data layer select a **bounded context**.

### Contract B: EvidenceRef (B internal → output to A)

Required fields: document ID/title, original URL or local authorized filename, page/region when available, passage text, extraction or grounding status, and the relevant case/agent claim. A citation is displayable only if the source was actually parsed/located.

### Contract C: AgentMessage (B → A)

Required fields: agent name, round number, decision question, allowed options, selected option, probability distribution, supporting incident IDs, `EvidenceRef` list, uncertainty/conflict status, duration, and human-readable action summary.

### Contract D: InvestigationResult (B → A)

Required fields: `case_id`, run ID, status, agent trace in order, initial and revised claims if any, final recommended next action, review priority, references, total time, provider/model details and errors if present. **The dashboard must never synthesize a missing agent result.**

### Contract E: Local API boundary

- **Health**: returns server readiness and whether Nace credentials are configured, without exposing secrets.
- **Analyze incident**: accepts `CaseContext`; returns one `InvestigationResult` with trace.
- **Evidence status**: indicates whether NDI document ingestion and grounding are ready.
- Optional **benchmark results**: reads stored real benchmark results rather than making unsolicited API calls.

For a hackathon, one synchronous request that can take a little time is acceptable; make the UI show an in-progress state and a meaningful timeout/error. No database sharing is needed across components: **A sends selected cases to B through the API**.

### Files and repo ownership

| Folder / artifact | Owner | Rule |
|---|---|---|
| `data/` and dataset manifest | A | Raw/processed datasets excluded from Git if large; commit small permitted fixtures |
| `data_pipeline/` | A | CSV validation, DuckDB, candidate retrieval |
| `dashboard/` | A | Local UI, visualization, explanation and case selection |
| `service/` | B | FastAPI boundary and validations |
| `agents/` | B | Drex agent definitions, coordinator and trace |
| `evidence/` | B | NDI, citation cache and prepared public PDF sources |
| `tests/fixtures/` | Split by owner | Share two contract-compatible fixture examples early |
| `contracts.md` | Frozen jointly | Changes require both people to approve |
| `evaluation/` | A, optional | OpenAI baseline and metric reporting |

Do not have both coding agents modify the same files. Use separate Git branches and merge their work only after both mock-based tests pass.

---

## 6. Builder A — your independent Codex workstream

### A1. Obtain, inspect, and document ASRS data

- Official database: https://asrs.arc.nasa.gov/search/database.html
- ASRS exports are capped at **10,000 incident records per CSV download**, and actual available fields depend on the selected export. Start with a **small 200–1,000-case subset** to make the MVP reliable; expand only after the pipeline works.
- Prefer a **single narrow hazard family**, initially communication/coordination or runway/surface operations; determine which has usable narratives and metadata after inspecting exports.
- Preserve original narratives, IDs, dataset provenance and any expert-coded fields; report missingness and inconsistent labels.
- Do not infer accident probability from report frequency: reports are voluntary and not verified by NASA.

**Deliverables:** documented dataset, reproducible import steps, clear field mapping, sample corpus stats, 3–5 compelling cases, small shareable fixtures.

### A2. DuckDB and retrieval layer

- Import normalized reports into DuckDB on the local laptop.
- Provide search/filter by hazard phrase, report date and available coding categories.
- Retrieve 3–5 relevant historical cases for each selected incident using simple full-text/keyword matching and metadata filters. Avoid leaking the selected incident into its own neighbors.
- Add a visible **retrieval method** note; matching text is supporting context, not evidence of causal similarity.

**Deliverables:** a reliable case-to-context adapter that produces `CaseContext` and works without any live Nace calls.

### A3. Streamlit local demo

- Incident browser with corpus-size indicator and case selector.
- On selection, show incident narrative, relevant historical examples and a **Run collaborative analysis** action.
- Present the chronological agent dialogue and final recommendation using `InvestigationResult`.
- Separate source passages from agent judgments; show actual NDI document title/page and errors/uncertainty clearly.
- Display a modest aggregate chart (such as historical report counts by available category) **without implying true accident prevalence**.
- Keep a preselected demo case and cached prior successful run for recovery; clearly label cached results as such.

**Deliverables:** usable local interface that first operates with mock `InvestigationResult` fixtures and later calls B's live API.

### A4. Testing and optional benchmarking

- Test missing narrative, duplicate IDs, empty candidate lists, and response timeout displays.
- If the swarm MVP is complete and time remains: build a **separate** OpenAI baseline using the *same incident/evidence/choices* as one Drex agent decision. Record raw model responses, timestamps, cost and ground-truth provenance.
- Begin with 20–50 cases; do not promise 500 cases or a model win.

**Done when:** your UI and data layer work end-to-end using the agreed mock fixtures even with B's branch unavailable.

---

## 7. Builder B — teammate's independent Claude Code workstream

### B1. Nace accounts and basic connectivity

- Use a Nace API key provided privately by the authorized account holder; never put keys into source control, screenshots, PRs, agent prompts or demo logs.
- Validate one live Drex call with a bounded `choice` question.
- Validate one real NDI Parse job from a small public PDF, including waiting for its result and recording source provenance.
- Confirm model, limits, failure-handling and the shared Nace balance. Each account's credit balance is separate.

**Deliverables:** verified live Nace decision and PDF-processing paths, but no dependency on Builder A's dataset yet.

### B2. Evidence ingestion (NDI / Perception)

- Start with **one or two** relevant public guidance PDFs aligned with the selected hazard family, then expand to 3–5 only if stable.
- Parse once; reuse returned parse artifacts or cached extracted passages rather than reprocessing the same PDF for each incident.
- Extract targeted procedural statements or definitions, and use **Ground** when applicable to locate them in the original PDF.
- Maintain `EvidenceRef` provenance and reject unsupported/fabricated citations.
- Expose a readiness/status result so A's dashboard knows whether evidence is available.

**Deliverables:** real NDI job output, source references, and a reusable evidence cache; never pretend NDI parsed the ASRS CSV if it did not.

### B3. Drex decision adapters and agents

- Define exact question wording and bounded choices for Pattern, Evidence, Investigation and Coordinator Agents.
- Construct each agent's input from the current case plus previous agents' structured findings.
- Record actual Drex probabilities and agent timings in `AgentMessage`.
- Handle missing evidence, no qualifying pattern, low-confidence disagreement, API failure, and inconsistent output types.
- Use a policy layer for explicit escalation requirements; keep decision inference and policy separate.

**Deliverables:** the four-agent decision engine using fixture `CaseContext` values, independently of A's DuckDB.

### B4. Real collaboration and API

- Implement one complete first-round sequence: Pattern → Evidence → Investigation → Coordinator.
- If Coordinator detects a material disagreement or missing evidence, perform one targeted challenge/re-evaluation and update the final proposal.
- Preserve the entire message sequence for UI inspection; avoid independent agents that never influence each other.
- Implement the agreed local FastAPI surface and return contract-compatible outputs.
- Build one successful case and one uncertain/challenged case using real Drex calls.

**Done when:** B can send a fixture incident to the local API and receive a real multi-agent trace, cited NDI material and a valid final recommendation, without A's UI.

---

## 8. Nace coding-agent skills and MCP setup

**Critical distinction:** These tools help **Codex and Claude Code develop or explore Nace**. They are not automatically the deployed application's runtime. The runtime should call Drex and Perception through a documented SDK or API so the demo is reproducible.

### Official agent skills

Nace ships two skills with its CLI:

| Skill | Purpose | Best use in our project |
|---|---|---|
| `drex-workspace` | Create, upload, ingest, inspect and select a Nace Workspace | B sets up searchable public aviation PDFs if workspace search is useful |
| `drex-search` | Locate, read, query and cite workspace information via Nace CLI navigation tools | B validates exact passages and citations; A can inspect source coverage |

**Important:** `drex-search` is a **document navigation skill**, not the Drex decision-model interface. Both skills work best after a workspace has been created and ingested.

**Installation behavior for A (Codex):** Install the current Nace CLI, sign in locally with an authorized key, add Nace's local MCP server to Codex, and install the Nace agent skills for Codex. Restart the coding agent session so new skills are loaded.

**Installation behavior for B (Claude Code):** Install the current Nace CLI, sign in locally, add Nace's local MCP server to Claude Code, and install the Nace skills for Claude Code. Restart the session.

Links: [Agent skills](https://console.nace.ai/docs/developer-tools/agent-skill) · [Nace CLI](https://console.nace.ai/docs/developer-tools/cli)

### Choose **local MCP** for development

- Local server: `nace-mcp`, started by the coding agent over stdio; it can access Drex decisions, document-processing jobs, workspaces, search and local-file-related workflows.
- Choose it for B's work because the project explicitly needs NDI documents, ingestion jobs and evidence lookup.
- A may use it to explore the same public documents but should keep dataset ingestion in ordinary Python/DuckDB.
- Do not assume two machines share the same locally saved Nace workspace selection; record any workspace ID explicitly and use authorized access.

Local MCP reference: https://console.nace.ai/docs/developer-tools/mcp

### Remote MCP is an **optional convenience**, not a replacement for local MCP

- Nace's hosted remote MCP endpoint is `https://console.nace.ai/mcp`.
- It currently exposes Drex `decide` and `list_models`, **not NDI document-processing tools**.
- It is useful for quickly checking Drex questions from either coding agent without local installation, but does not cover this project's PDF ingestion requirements.
- Use a secret environment variable or supported secure header for the key; avoid adding actual key values to committed project config or URL query strings.

Remote MCP reference: https://console.nace.ai/docs/developer-tools/hosted-mcp

### Workspaces — optional optimization

If B finds the relevant PDFs difficult to retrieve from a simple cached passage list, create **one Nace Workspace** for those PDFs and use `drex-workspace` and `drex-search`. Use NDI Parse/Extract/Ground explicitly in the actual pipeline to demonstrate the sponsor integration. Do **not** introduce Workspaces merely to accumulate sponsor features.

### Intern harness — stretch only

Nace Intern (https://github.com/nace-ai/intern) can supervise a separate general-purpose LLM investigator, but is **not** required for multi-agent collaboration. Add it only after the core swarm and NDI citation flow are complete.

---

## 9. Four-hour hackathon execution schedule

**Timebox:** approximately 11:00 AM to the organizer's **3:00 PM hard submission deadline**. Shift the following elapsed times to match the actual start.

| Elapsed | A / Codex | B / Claude Code | Joint milestone |
|---|---|---|---|
| **0:00–0:15** | Create repo, source manifest, tiny case fixture and draft `contracts.md` | Confirm Nace credentials and live Drex/NDI access | **Freeze interface names and field meanings by minute 15** |
| **0:15–1:00** | Download/filter ASRS sample, DuckDB ingestion, retrieval | One real PDF parsed, source passages cached; question definitions | Each branch operates independently with fixtures |
| **1:00–1:45** | Streamlit case browser and mock trace UI | Four Drex agents and structured messages | First complete UI mock / first backend live trace |
| **1:45–2:20** | UI polish, two selected demo cases, retrieval quality checks | Coordinator challenge round, API error handling, NDI references | First integration with real `CaseContext` and real NDI/Drex |
| **2:20–2:50** | Demo storyline and data validation | Fix grounding/citation and agent-flow bugs | **Freeze features; execute a full dry run** |
| **2:50–3:30** | Add optional 20–50-case OpenAI benchmark **only if safe**; otherwise improve UI | Improve observable collaboration and uncertainty handling | Produce screenshots/logs and record actual measured results |
| **3:30–3:50** | Final demonstration and submission artifacts | Final smoke test, credentials/secrets check | Finish submission early |
| **3:50–4:00** | Submission buffer | Submission buffer | **Submit before 3:00 PM; no new features** |

**Important:** The elapsed 3:30–4:00 window is part of the 11:00 AM–3:00 PM build period. If the hackathon is already underway, compress the first two phases and prioritize a live end-to-end swarm over optional features.

### Hard stop rules

- **By 60 minutes:** A has a usable incident fixture; B has a real Drex call and at least one NDI Parse result.
- **By 110 minutes:** 4 agent decisions are logged for one test case, and the UI displays a full fixture result.
- **By 140 minutes:** integrated incident run complete; if not, remove the second challenge round before removing NDI or Drex.
- **At 150 minutes:** no new dependencies, new platforms or additional datasets.
- **Benchmark only after:** one end-to-end case, one genuine multi-agent interaction, and one real NDI citation are functioning.

---

## 10. Optional OpenAI benchmarking module (Apex Predator pivot)

The benchmark must remain **independent of the swarm MVP**. It is a fair comparison of **one clearly defined bounded decision**, not an apples-to-oranges comparison of four Drex agents versus one GPT summary.

1. Choose a single agent decision, preferably `pattern_type` or `next_action`, with predefined alternatives.
2. Build a labeled set of 20–50 incident cases using ASRS expert codes **only if** they align to the exact target label; otherwise clearly label a small independent set.
3. Give Drex and OpenAI the same incident text, same retrieved history, same NDI evidence, and identical allowed response options.
4. Collect actual decisions, model-only latency, cost, agreement with suitable labels, invalid responses, and escalation rate.
5. Separate NDI preprocessing from both models' decision latency. Report sample size and limitations.
6. Include a basic SQL/rules baseline if trivial heuristics might solve the chosen task.
7. Only consider Apex Predator when the data shows a real, defensible improvement. If results are mixed or inconclusive, stay with Swarm Intelligence.

OpenAI credentials are **only required for this optional module**, not the main application. Keep its key separate from the Nace key and out of repo files.

**Do not use Drex's asynchronous batch service for the live demo:** its processing window can be much longer than a hackathon session. Use on-demand inference for interactive cases.

---

## 11. Verification and acceptance tests

### Mandatory passing scenarios

**Scenario A — Known-pattern case:** pattern agent proposes a family, evidence agent finds relevant NDI-grounded guidance, investigation agent selects a next action, coordinator accepts or modifies it. UI shows all four real decision calls and citations.

**Scenario B — Disagreement case:** pattern agent and evidence agent disagree or evidence is insufficient. Coordinator explicitly triggers a targeted second pass or escalates to human review. No fake consensus.

**Scenario C — No evidence/API interruption:** NDI source unavailable, Drex fails, or missing fields. The user sees a clear incomplete/uncertain result; the app does not invent probabilities or passages.

### Non-negotiable acceptance criteria

- NASA ASRS records are genuine, traceable, de-identified, and correctly attributed.
- Real NDI processing is demonstrated on at least one relevant PDF.
- **Each of the four agent roles makes at least one real Drex decision.**
- The shared trace demonstrates information transfer between agents; a later agent consumes an earlier decision.
- Citations are tied to actual files/pages or returned document locations.
- The dashboard shows the entire process and a defensible **human investigation next step**.
- No credentials appear in source control, UI recordings or submitted artifacts.
- The app runs locally without a cloud-deployment requirement.
- No fabricated metrics, no accident prediction, and no claim that ASRS data has been validated by NASA.

---

## 12. Demo script outline (5 minutes maximum)

| Demo segment | Approx. duration | What judges see |
|---|---:|---|
| Problem and real dataset | 35 sec | Genuine ASRS incident corpus; recurring safety narratives |
| Show the case and evidence corpus | 35 sec | One incident, neighbors and the PDFs processed by NDI |
| Collaborative agent run | 120 sec | Pattern → Evidence → Investigation → Coordinator with actual Drex choices |
| Challenge / disagreement | 45 sec | One finding changes or triggers a human-review path based on evidence |
| Novelty and value | 35 sec | Why decision coordination and cited evidence improve analyst triage |
| Optional benchmark / close | 10 sec | Real measurements only if module completed |

**Primary track positioning:** Multi-agent Drex collaboration, not a generic retrieval demo. NDI earns the additional document-intelligence value. If benchmarking is absent, do not mention performance wins.

---

## 13. Immediate task instructions for each coding agent

### Codex brief (Builder A)

"Own only data acquisition, DuckDB normalization and historical retrieval, the local Streamlit dashboard, and optional evaluation. Implement the frozen `CaseContext` input and `InvestigationResult` display contract. Use provided fixtures to work independently from the backend. Preserve original ASRS narratives and provenance. Do not modify `service/`, `agents/`, or `evidence/`. Prioritize two compelling demo cases, clear trace visualization and robust error states. No cloud deployment."

### Claude Code brief (Builder B)

"Own the FastAPI incident-analysis endpoint, Nace Drex client, NDI document-ingestion and grounding cache, and four Drex-driven collaborating agents. Consume a frozen `CaseContext` fixture without depending on the live DuckDB pipeline. Produce a complete `InvestigationResult` with a chronological trace, real probability distributions, genuine NDI citations, and an evidence-challenge round when justified. Use the official Nace local MCP and agent skills for development, but call documented SDK/API routes at runtime. Do not modify `data_pipeline/`, `dashboard/`, or `evaluation/`."

**Both:** The first integration artifact is **the contract and two fixtures**, not a partially written API. Send contract changes to the other person explicitly before either coding agent changes its implementation.

---

## 14. Official references

### Nace

- Drex docs and API overview: https://console.nace.ai/docs
- Drex quickstart: https://console.nace.ai/docs/drex/quickstart
- Drex typed questions: https://console.nace.ai/docs/drex/guides/questions
- Perception / NDI overview: https://console.nace.ai/docs/perception/documents
- Parse: https://console.nace.ai/docs/perception/parse
- Extract: https://console.nace.ai/docs/perception/extract
- Ground: https://console.nace.ai/docs/perception/ground
- Local MCP server: https://console.nace.ai/docs/developer-tools/mcp
- Remote MCP server: https://console.nace.ai/docs/developer-tools/hosted-mcp
- Official agent skills: https://console.nace.ai/docs/developer-tools/agent-skill
- Nace CLI: https://console.nace.ai/docs/developer-tools/cli
- Nace Intern harness (optional): https://github.com/nace-ai/intern

### Data

- NASA ASRS database and CSV export: https://asrs.arc.nasa.gov/search/database.html
- ASRS coding taxonomy and data caveats: linked from the database page above

---

## 15. Final priority order

1. Real data, fixed case schema and clear branch ownership.
2. Real NDI ingestion with traceable evidence.
3. Four real Drex-driven agents exchanging findings.
4. Working local dashboard and integrated live case.
5. Demonstrable disagreement / re-evaluation and graceful failures.
6. Optional OpenAI benchmark for a possible Apex Predator entry.
7. Visual polish and non-essential advanced features.

**Definition of done:** A judge can open the local application, select a genuine NASA ASRS incident, see multiple Drex-driven agents collaborate using NDI-sourced evidence, understand why the case requires human investigation, and inspect exactly where the supporting documents came from.
