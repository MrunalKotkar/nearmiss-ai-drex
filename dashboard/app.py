"""Local ASRS case browser and live collaborative investigation viewer."""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

import duckdb
import streamlit as st

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from data_pipeline.asrs import DEFAULT_DB, get_case_context, search_cases  # noqa: E402

RUNS = ROOT / "data" / "runs"


def api_json(base: str, path: str, payload: dict | None = None, timeout: int = 5) -> dict:
    body = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(
        base.rstrip("/") + path,
        data=body,
        headers={"Content-Type": "application/json"} if body is not None else {},
        method="POST" if body is not None else "GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            result = json.load(response)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Service returned HTTP {exc.code} for {path}") from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        raise RuntimeError(f"Service unavailable or timed out for {path}: {exc}") from exc
    if not isinstance(result, dict):
        raise RuntimeError(f"Unexpected service response for {path}")
    return result


def show_result(result: dict, cached: bool = False) -> None:
    if cached:
        st.info("Cached prior live run. This result was not generated in the current session.")
    st.subheader("Collaborative investigation")
    st.caption(f"Run {result.get('run_id', 'unknown')} · Status: {result.get('status', 'unknown')} · {result.get('total_duration_seconds', 'unknown')} seconds")
    if result.get("errors"):
        for error in result["errors"]:
            st.error(f"{error.get('agent') or 'Service'}: {error.get('message', 'Unknown error')}")
    if result.get("status") == "complete":
        st.success(f"Next step for human review: {result.get('final_recommended_next_action', 'unavailable')}")
        st.write(f"Review priority: {result.get('review_priority', 'unavailable')}")
    else:
        st.warning("Analysis incomplete. No final recommendation is available.")

    for index, message in enumerate(result.get("agent_trace") or [], 1):
        with st.expander(f"{index}. {message.get('agent', 'Agent')} · round {message.get('round_number', '?')} · {message.get('selected_option', 'no decision')}", expanded=True):
            st.write(message.get("action_summary", ""))
            st.caption(f"Input: {message.get('input_summary', '')}")
            st.write("Decision question:", message.get("decision_question", ""))
            st.write("Allowed options:", message.get("allowed_options", []))
            st.write("Returned scores:", message.get("probabilities", {}))
            st.write("Supporting incidents:", message.get("supporting_incident_ids", []))
            st.write("Uncertainty:", message.get("uncertainty_status", "unknown"))
            for ref in message.get("evidence_refs") or []:
                st.write(f"Source: {ref.get('title', 'Untitled')} · {ref.get('page_or_region') or 'location unavailable'}")
                st.write(ref.get("passage_text", ""))
                st.caption(f"{ref.get('source', '')} · {ref.get('status', '')}")

    if result.get("references"):
        st.subheader("Source passages")
        for ref in result["references"]:
            st.write(f"{ref.get('title', 'Untitled')} · {ref.get('page_or_region') or 'location unavailable'}")
            st.write(ref.get("passage_text", ""))
            st.caption(f"{ref.get('source', '')} · {ref.get('status', '')}")
    st.caption(f"Provider details: {result.get('provider_model_details', {})}")


st.set_page_config(page_title="NearMiss AI", layout="wide")
st.title("NearMiss AI")
st.caption("NASA ASRS incident narratives · human analyst triage · voluntary reports are not independently verified by NASA")

if not DEFAULT_DB.exists():
    st.error("No imported ASRS database found. Run: python -m data_pipeline.asrs import data/asrs_jul2023_jun2024.csv")
    st.stop()

with duckdb.connect(str(DEFAULT_DB), read_only=True) as db:
    count = db.execute("SELECT count(*) FROM incidents").fetchone()[0]
    source_url, sample, _, _ = db.execute("SELECT * FROM source_info").fetchone()
    st.metric("Reports in local export", count)
    st.caption(f"Sample: {sample} · [NASA ASRS source]({source_url})")
    with st.sidebar:
        st.header("Search")
        phrase = st.text_input("Narrative or synopsis phrase")
        category = st.text_input("Coded category contains")
        month = st.text_input("Incident month (YYYY-MM)", value="")
        api_base = st.text_input("Analysis service URL", value="http://127.0.0.1:8000")
    cases = search_cases(db, phrase, month, category, 1000)
    st.write(f"{len(cases)} matching reports shown")
    if not cases:
        st.info("No matching incidents. Adjust the search filters.")
        st.stop()
    options = [row["acn"] for row in cases]
    default_case = "2134849" if "2134849" in options else options[0]
    selected = st.selectbox("Select ASRS ACN", options, index=options.index(default_case), format_func=lambda acn: f"{acn} · {next((r['synopsis'] or '')[:95] for r in cases if r['acn'] == acn)}")
    context = get_case_context(db, selected)
    metadata = context["metadata"]
    st.subheader(f"Incident {selected}")
    st.write({key: value for key, value in metadata.items() if key not in ("supplemental_narrative", "synopsis")})
    st.write("Synopsis:", metadata.get("synopsis") or "Unavailable")
    st.write("Original reporter narrative")
    st.text(context["narrative"])
    if metadata.get("supplemental_narrative"):
        with st.expander("Original supplemental narrative"):
            st.text(metadata["supplemental_narrative"])
    st.subheader("Retrieved historical reports")
    st.caption(context["retrieval_method"])
    for candidate in context["candidate_incidents"]:
        with st.expander(f"ACN {candidate['case_id']} · text match {candidate['retrieval_score']:.3f}"):
            st.text(candidate["narrative"])
    st.caption("Text matches provide historical context; they do not establish causal similarity or accident risk.")
    with st.expander("Report counts by source-coded primary problem"):
        chart = db.execute("SELECT primary_problem, count(*) AS reports FROM incidents GROUP BY 1 ORDER BY 2 DESC LIMIT 12").df()
        st.bar_chart(chart.set_index("primary_problem"))
        st.caption("Counts refer only to this exported month and do not estimate incident prevalence.")

try:
    health = api_json(api_base, "/health")
    st.caption(f"Analysis service: {health.get('status', 'unknown')} · Nace configured: {health.get('nace_configured', False)}")
except RuntimeError as exc:
    st.warning(str(exc))

if st.button("Run collaborative analysis", type="primary"):
    with st.spinner("Waiting for the analysis service and agent decisions…"):
        try:
            result = api_json(api_base, "/analyze", context, timeout=120)
            if result.get("contract_version") != "1.0" or result.get("case_id") != selected:
                raise RuntimeError("Service returned a result for another case or contract version")
            st.session_state["live_result"] = result
            if result.get("status") == "complete" and result.get("agent_trace"):
                RUNS.mkdir(parents=True, exist_ok=True)
                (RUNS / f"{selected}.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
        except (RuntimeError, ValueError, json.JSONDecodeError) as exc:
            st.session_state.pop("live_result", None)
            st.error(f"Analysis could not complete: {exc}")

live = st.session_state.get("live_result")
if live and live.get("case_id") == selected:
    show_result(live)
else:
    cached_file = RUNS / f"{selected}.json"
    if cached_file.exists():
        if st.button("Show cached prior live run"):
            try:
                show_result(json.loads(cached_file.read_text(encoding="utf-8")), cached=True)
            except (ValueError, OSError) as exc:
                st.error(f"Cached run cannot be opened: {exc}")
