"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, BookOpen, ChevronRight, CircleAlert, Clock3, Compass, FileSearch, Headphones, Layers3, MapPin, Plane, Radio, Radar, RefreshCw, Search, ShieldCheck, Signal } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CaseSummary = { acn: string; report_month: string; synopsis: string | null; anomaly: string | null; primary_problem: string | null; communication_breakdown: string | null };
type Candidate = { case_id: string; narrative: string; retrieval_score: number };
type CaseContext = { contract_version: string; case_id: string; narrative: string; metadata: Record<string, string | null>; candidate_incidents: Candidate[]; retrieval_method: string; data_source: { name: string; url: string; sample: string } };
type EvidenceRef = { document_id: string; title: string; source: string; page_or_region: string | null; passage_text: string; status: string; relevant_claim: string };
type AgentMessage = { agent: string; round_number: number; input_summary: string; decision_question: string; allowed_options: string[]; selected_option: string; probabilities: Record<string, number>; supporting_incident_ids: string[]; evidence_refs: EvidenceRef[]; uncertainty_status: string; duration_seconds: number; action_summary: string };
type InvestigationResult = { contract_version: string; case_id: string; run_id: string; status: "complete" | "incomplete"; agent_trace: AgentMessage[]; initial_claim: unknown; revised_claim: unknown; final_recommended_next_action: string | null; review_priority: string | null; references: EvidenceRef[]; total_duration_seconds: number; provider_model_details: Record<string, string>; errors: { code: string; message: string; agent: string | null }[] };
type Stats = { records: number; sample: string; source_url: string; primary_problems: { name: string; count: number }[] };

async function readJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail ?? `Request failed (${response.status})`);
  return body as T;
}

const roleIcons = { pattern: Radar, evidence: BookOpen, investigation: FileSearch, coordinator: Compass };
const roleNames = { pattern: "Pattern analyst", evidence: "Evidence reviewer", investigation: "Investigation planner", coordinator: "Coordinator" };
const label = (text: string | null | undefined) => text ? text.replaceAll("_", " ") : "Unavailable";

function Eyebrow({ children }: { children: React.ReactNode }) { return <span className="eyebrow">{children}</span>; }
function StatusDot({ online }: { online: boolean }) { return <span className={`status-dot ${online ? "online" : "offline"}`} aria-hidden="true" />; }

function Trace({ result, cached }: { result: InvestigationResult; cached: boolean }) {
  return <div className="space-y-5">
    {cached && <Alert className="border-amber-300/30 bg-amber-400/10 text-amber-100"><Clock3 className="size-4" /><AlertTitle>Prior live run</AlertTitle><AlertDescription>This result was saved from an earlier service response.</AlertDescription></Alert>}
    {result.status === "complete" ? <div className="recommendation-panel"><ShieldCheck className="size-8 shrink-0 text-sky-300" /><div><Eyebrow>Human review recommendation</Eyebrow><h3 className="mt-2 text-2xl font-semibold capitalize text-white">{label(result.final_recommended_next_action)}</h3><p className="mt-1 text-sm text-slate-300">Priority: <span className="capitalize text-sky-200">{label(result.review_priority)}</span> · Human analyst judgment remains required.</p></div></div> : <Alert className="border-amber-300/30 bg-amber-400/10 text-amber-100"><CircleAlert className="size-4" /><AlertTitle>Analysis incomplete</AlertTitle><AlertDescription>No final recommendation is available.</AlertDescription></Alert>}
    {result.errors?.map((error, i) => <Alert key={i} variant="destructive"><CircleAlert className="size-4" /><AlertTitle>{error.agent ? `${label(error.agent)} error` : "Service error"}</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>)}
    <div className="flex justify-between gap-2 font-mono text-[11px] text-slate-400"><span>RUN {result.run_id}</span><span>{result.total_duration_seconds?.toFixed(1)}s · {result.agent_trace?.length ?? 0} decisions</span></div>
    <div className="trace-list">{result.agent_trace?.map((message, i) => { const Icon = roleIcons[message.agent as keyof typeof roleIcons] ?? Activity; return <div className="trace-item" key={`${message.agent}-${message.round_number}-${i}`}><div className="trace-marker"><Icon className="size-4" /></div><Card className="surface-card"><CardHeader className="border-b border-slate-700/60 pb-4"><div className="flex items-center justify-between gap-3"><div><CardTitle className="text-base text-white">{roleNames[message.agent as keyof typeof roleNames] ?? label(message.agent)}</CardTitle><p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-slate-400">Round {message.round_number} · {message.duration_seconds?.toFixed(1)}s</p></div><Badge className="border-sky-400/25 bg-sky-400/10 text-sky-200 capitalize">{label(message.selected_option)}</Badge></div></CardHeader><CardContent className="space-y-4 pt-4"><p className="text-sm leading-relaxed text-slate-200">{message.action_summary}</p><div className="rounded-lg border border-slate-700/60 bg-[#0b172a] p-3"><div className="micro-label">Decision question</div><p className="mt-2 text-xs leading-relaxed text-slate-300">{message.decision_question}</p></div><div className="space-y-2"><div className="micro-label">Returned decision scores</div>{Object.entries(message.probabilities ?? {}).sort((a,b) => b[1]-a[1]).map(([choice, score]) => <div className="flex items-center gap-3 text-xs" key={choice}><span className="w-32 truncate capitalize text-slate-300 sm:w-44">{label(choice)}</span><div className="h-1.5 flex-1 rounded-full bg-slate-700"><div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.max(0, Math.min(score, 1)) * 100}%` }} /></div><span className="w-11 text-right font-mono text-slate-300">{(score * 100).toFixed(0)}%</span></div>)}</div><p className="text-xs text-slate-400">Uncertainty: {label(message.uncertainty_status)} · Referenced ACNs: {message.supporting_incident_ids?.join(", ") || "none"}</p>{message.evidence_refs?.map((ref, j) => <p className="text-xs text-sky-200" key={j}><BookOpen className="mr-1 inline size-3" />{ref.title} · {ref.page_or_region || "location unavailable"}</p>)}</CardContent></Card></div>; })}</div>
    {result.references?.length > 0 && <Card className="surface-card"><CardHeader><CardTitle className="text-base text-white">Source passages</CardTitle></CardHeader><CardContent className="space-y-3">{result.references.map((ref, i) => <div className="rounded-lg border border-slate-700 p-4" key={i}><p className="text-sm font-semibold text-white">{ref.title} · {ref.page_or_region || "location unavailable"}</p><p className="mt-2 text-sm leading-relaxed text-slate-300">{ref.passage_text}</p><p className="mt-2 break-all font-mono text-[10px] text-slate-500">{ref.source} · {ref.status}</p></div>)}</CardContent></Card>}
    <p className="text-[11px] text-slate-500">Drex scores are decision scores, not accident probabilities. Source passages appear only when returned by the analysis service.</p>
  </div>;
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [selected, setSelected] = useState("2134849");
  const [context, setContext] = useState<CaseContext | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [analysisOnline, setAnalysisOnline] = useState(false);
  const [evidenceReady, setEvidenceReady] = useState(false);
  const [loadingCases, setLoadingCases] = useState(true);
  const [loadingContext, setLoadingContext] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [cached, setCached] = useState(false);
  const [activeTab, setActiveTab] = useState("brief");

  const refreshHealth = useCallback(async () => {
    try { const value = await readJSON<{status: string}>("/api/analysis-health"); setAnalysisOnline(value.status === "ready"); } catch { setAnalysisOnline(false); }
    try { const value = await readJSON<{status: string}>("/api/evidence-status"); setEvidenceReady(value.status === "ready"); } catch { setEvidenceReady(false); }
  }, []);

  useEffect(() => { readJSON<Stats>("/api/data/stats").then(setStats).catch((e) => setError(e.message)); refreshHealth(); }, [refreshHealth]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoadingCases(true);
      const params = new URLSearchParams({ phrase: query, category, month: "2024-06", limit: "1000" });
      readJSON<{cases: CaseSummary[]}>(`/api/data/cases?${params}`, { signal: controller.signal })
        .then((value) => { setCases(value.cases); setError(null); if (value.cases.length) setSelected((current) => value.cases.some((item) => item.acn === current) ? current : value.cases[0].acn); })
        .catch((e) => { if (e.name !== "AbortError") setError(e.message); })
        .finally(() => setLoadingCases(false));
    }, 220);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, category]);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setLoadingContext(true); setContext(null); setResult(null); setCached(false); setAnalysisError(null);
    readJSON<CaseContext>(`/api/data/cases/${selected}/context`, { signal: controller.signal })
      .then((value) => { setContext(value); setError(null); })
      .catch((e) => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => setLoadingContext(false));
    return () => controller.abort();
  }, [selected]);

  const selectedSummary = useMemo(() => cases.find((item) => item.acn === selected), [cases, selected]);
  const displayedCases = useMemo(() => {
    const featured = cases.find((item) => item.acn === "2134849");
    return featured ? [featured, ...cases.filter((item) => item.acn !== featured.acn)] : cases;
  }, [cases]);
  async function runAnalysis() {
    if (!context) return;
    setAnalyzing(true); setAnalysisError(null); setResult(null); setCached(false); setActiveTab("analysis");
    try {
      const value = await readJSON<InvestigationResult>("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(context) });
      if (value.contract_version !== "1.0" || value.case_id !== context.case_id || !Array.isArray(value.agent_trace)) throw new Error("Analysis service returned a mismatched result");
      setResult(value);
      if (value.status === "complete" && value.agent_trace.length > 0) localStorage.setItem(`nearmiss:run:${context.case_id}`, JSON.stringify(value));
    } catch (e) { setAnalysisError(e instanceof Error ? e.message : "Analysis failed"); }
    finally { setAnalyzing(false); refreshHealth(); }
  }
  function loadCached() {
    try {
      const value = JSON.parse(localStorage.getItem(`nearmiss:run:${selected}`) || "null") as InvestigationResult | null;
      if (!value || value.case_id !== selected || value.contract_version !== "1.0" || !Array.isArray(value.agent_trace)) throw new Error("No valid prior live run found for this case");
      setResult(value); setCached(true); setAnalysisError(null); setActiveTab("analysis");
    } catch (e) { setAnalysisError(e instanceof Error ? e.message : "Could not load saved run"); setActiveTab("analysis"); }
  }

  return <div className="app-shell">
    <header className="topbar"><div className="brand-lockup"><span className="brand-mark"><Plane className="size-5 -rotate-45" /></span><div><span className="brand-name">NearMiss<span>AI</span></span><span className="brand-subtitle">AVIATION SAFETY INTELLIGENCE</span></div></div><span className="hidden font-mono text-[10px] tracking-[.24em] text-slate-400 lg:inline">OPERATIONS DESK / ASRS ARCHIVE</span><Badge className="border-emerald-300/30 bg-emerald-400/10 font-mono text-[10px] tracking-wider text-emerald-200"><StatusDot online={!!stats} /> {stats ? "DATA ONLINE" : "DATA LOADING"}</Badge></header>
    <div className="dashboard-grid">
      <aside className="sidebar-panel"><div className="mb-6 flex items-center justify-between"><Eyebrow>Case directory</Eyebrow><FileSearch className="size-4 text-sky-300" /></div><div className="search-box"><Search className="size-4 text-slate-400" /><Input aria-label="Search narratives and synopses" className="border-0 bg-transparent p-0 text-sm text-white shadow-none focus-visible:ring-0" placeholder="Search report text..." value={query} onChange={(e) => setQuery(e.target.value)} /></div><div className="mt-3 flex gap-2"><Button size="sm" variant={category === "" ? "default" : "outline"} className="filter-button" onClick={() => setCategory("")}>All reports</Button><Button size="sm" variant={category === "Communication" ? "default" : "outline"} className="filter-button" onClick={() => setCategory("Communication")}>Communication</Button></div><div className="mt-7 flex items-end justify-between border-b border-slate-700/70 pb-3"><div><div className="micro-label">June 2024 / records</div><div className="mt-1 text-3xl font-semibold tabular-nums text-white">{loadingCases ? "—" : cases.length}</div></div><span className="text-xs text-slate-400">of {stats?.records ?? "—"} in archive</span></div><ScrollArea className="case-scroll mt-3"><div className="space-y-1.5 pb-3">{loadingCases && [1,2,3].map((i) => <Skeleton key={i} className="h-24 bg-slate-700/50" />)}{!loadingCases && cases.length === 0 && <p className="p-4 text-sm text-slate-400">No reports match the filters.</p>}{displayedCases.map((item) => <button type="button" onClick={() => { setSelected(item.acn); setActiveTab("brief"); }} key={item.acn} className={`case-row ${item.acn === selected ? "active" : ""}`}><div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-semibold tracking-wider text-sky-200">ACN {item.acn}</span><ChevronRight className="size-3.5 text-slate-500" /></div><p className="mt-2 line-clamp-2 text-left text-xs leading-relaxed text-slate-300">{item.synopsis || "No synopsis available"}</p><div className="mt-2 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500">{item.primary_problem || "Uncoded"}</div></button>)}</div></ScrollArea><div className="sidebar-foot"><ShieldCheck className="size-4 shrink-0 text-sky-300" /><span>De-identified ASRS reports. NASA does not independently verify submissions.</span></div></aside>
      <main className="main-panel"><section className="hero-panel"><div className="hero-grid" aria-hidden="true" /><div className="radar-graphic" aria-hidden="true"><div className="radar-ring radar-ring-one" /><div className="radar-ring radar-ring-two" /><div className="radar-ring radar-ring-three" /><div className="radar-cross radar-cross-h" /><div className="radar-cross radar-cross-v" /><div className="radar-sweep" /><span className="radar-blip" /></div><div className="relative z-10 max-w-xl"><div className="flex items-center gap-2"><span className="hero-pulse" /><Eyebrow>Investigation workspace</Eyebrow></div><h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">Every incident has<br /><span className="text-sky-300">a deeper signal.</span></h1><p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-300">Explore real aviation safety narratives, compare related reports, and follow the evidence behind each collaborative investigation.</p><div className="mt-6 flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-widest text-slate-400"><span className="flex items-center gap-1.5"><Signal className="size-3.5 text-sky-300" /> {stats?.records ?? "—"} reports loaded</span><span className="flex items-center gap-1.5"><Radio className="size-3.5 text-sky-300" /> June 2024 export</span></div></div></section>
        <div className="content-padding">{error && <Alert className="mb-5 border-red-400/30 bg-red-400/10 text-red-100"><CircleAlert className="size-4" /><AlertTitle>Data service issue</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}<div className="section-heading"><div><Eyebrow>Active report</Eyebrow><h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">{selected ? `Incident ${selected}` : "Select an incident"}</h2></div><div className="flex items-center gap-2"><Badge className="border-sky-300/25 bg-sky-300/10 text-sky-200">ASRS SOURCE</Badge><span className="font-mono text-[11px] text-slate-400">{selectedSummary?.report_month || "2024-06"}</span></div></div>
        {loadingContext ? <div className="grid gap-5 lg:grid-cols-3"><Skeleton className="h-80 bg-slate-700/30 lg:col-span-2" /><Skeleton className="h-80 bg-slate-700/30" /></div> : context ? <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-5"><TabsList className="h-auto w-full justify-start rounded-none border-b border-slate-700/80 bg-transparent p-0"><TabsTrigger value="brief" className="tab-trigger">Case brief</TabsTrigger><TabsTrigger value="analysis" className="tab-trigger">Agent analysis {result?.agent_trace?.length ? <span className="ml-1.5 rounded bg-sky-400/15 px-1.5 text-[10px] text-sky-200">{result.agent_trace.length}</span> : null}</TabsTrigger><TabsTrigger value="corpus" className="tab-trigger">Corpus signals</TabsTrigger></TabsList>
          <TabsContent value="brief" className="mt-0"><div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(290px,1fr)]"><div className="space-y-5"><Card className="surface-card"><CardHeader className="pb-2"><div className="flex items-center gap-2 text-sky-300"><Headphones className="size-4" /><Eyebrow>Reporter narrative</Eyebrow></div><CardTitle className="mt-2 text-lg leading-snug text-white">{context.metadata.synopsis || selectedSummary?.synopsis || "Original ASRS report"}</CardTitle></CardHeader><CardContent><Separator className="mb-5 bg-slate-700/70" /><p className="narrative-text whitespace-pre-wrap">{context.narrative}</p>{context.metadata.supplemental_narrative && <details className="mt-5 rounded-lg border border-slate-700/70 p-4"><summary className="cursor-pointer text-sm font-medium text-sky-200">Read supplemental reporter narrative</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{context.metadata.supplemental_narrative}</p></details>}</CardContent></Card><Card className="surface-card"><CardHeader><div className="flex items-center justify-between gap-3"><div><Eyebrow>Historical context</Eyebrow><CardTitle className="mt-2 text-lg text-white">Related reports</CardTitle></div><Badge className="border-slate-600 bg-slate-700/40 font-mono text-slate-200">{context.candidate_incidents.length} MATCHES</Badge></div></CardHeader><CardContent className="space-y-3">{context.candidate_incidents.map((candidate) => <details className="candidate-card" key={candidate.case_id}><summary className="flex cursor-pointer list-none items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="candidate-icon"><Layers3 className="size-4" /></span><span className="font-mono text-sm font-medium text-white">ACN {candidate.case_id}</span></div><span className="font-mono text-xs text-sky-300">MATCH {Math.round(candidate.retrieval_score * 100)}%</span></summary><p className="mt-4 border-t border-slate-700/60 pt-4 text-sm leading-7 text-slate-300">{candidate.narrative}</p></details>)}{context.candidate_incidents.length === 0 && <p className="text-sm text-slate-400">No historical neighbors found.</p>}<p className="pt-2 text-[11px] leading-relaxed text-slate-500">{context.retrieval_method}</p></CardContent></Card></div><div className="space-y-5"><Card className="surface-card"><CardHeader><Eyebrow>Case telemetry</Eyebrow><CardTitle className="mt-2 text-lg text-white">Report details</CardTitle></CardHeader><CardContent>{[["Primary problem",context.metadata.primary_problem],["Anomaly",context.metadata.anomaly],["Flight phase",context.metadata.flight_phase],["Location",context.metadata.locale],["Communication",context.metadata.communication_breakdown],["Human factors",context.metadata.human_factors],["Local time",context.metadata.local_time]].map(([key,value]) => <div className="detail-row" key={key}><span>{key}</span><span className="max-w-[58%] text-right text-slate-100">{value || "Not reported"}</span></div>)}</CardContent></Card><Card className="border-sky-400/25 bg-gradient-to-br from-[#173351] to-[#10233e] text-white"><CardContent className="space-y-4 pt-6"><div className="flex items-center justify-between"><span className="rounded-xl border border-sky-300/25 bg-sky-400/10 p-3"><Radar className="size-6 text-sky-300" /></span><StatusDot online={analysisOnline} /></div><div><Eyebrow>Collaborative analysis</Eyebrow><h3 className="mt-2 text-xl font-semibold">Investigate this case</h3><p className="mt-2 text-sm leading-relaxed text-slate-300">Send this report and its text-matched incidents to the live agent service.</p></div><Button className="w-full bg-sky-400 font-semibold text-[#06213a] hover:bg-sky-300" onClick={runAnalysis} disabled={analyzing || !analysisOnline}>{analyzing ? "Analyzing…" : analysisOnline ? "Run collaborative analysis" : "Analysis service offline"}<ArrowRight className="ml-2 size-4" /></Button>{!analysisOnline && <p className="text-xs text-amber-200">The case browser is ready. Live decisions appear when Builder B’s service starts.</p>}{analysisOnline && <p className="text-xs text-slate-300">Evidence service: {evidenceReady ? "ready" : "not ready"}</p>}<Button variant="link" className="h-auto px-0 text-xs text-sky-300" onClick={loadCached}>Open a prior live run</Button><Button variant="ghost" size="sm" className="text-slate-300" onClick={refreshHealth}><RefreshCw className="mr-1 size-3" />Refresh status</Button></CardContent></Card><div className="flex items-start gap-3 rounded-lg border border-slate-700/60 bg-[#111d31] p-4 text-xs leading-relaxed text-slate-400"><MapPin className="mt-0.5 size-4 shrink-0 text-sky-300" /><span>Voluntary, de-identified reports. Text similarity and report counts do not measure accident risk.</span></div></div></div></TabsContent>
          <TabsContent value="analysis" className="mt-0"><div className="mx-auto max-w-3xl">{analyzing ? <Card className="surface-card"><CardContent className="flex flex-col items-center gap-5 py-16 text-center"><Radar className="size-10 animate-pulse text-sky-300" /><h3 className="text-xl font-semibold text-white">Agents are reviewing the case</h3><p className="max-w-md text-sm text-slate-400">Waiting for live decisions. This may take up to two minutes.</p></CardContent></Card> : result ? <Trace result={result} cached={cached} /> : <Card className="surface-card"><CardContent className="flex flex-col items-center gap-4 py-16 text-center"><Radar className="size-10 text-sky-300" /><h3 className="text-xl font-semibold text-white">No analysis run yet</h3><p className="max-w-md text-sm text-slate-400">Only actual service responses appear here. Run the analysis from the case brief when the agent service is online.</p>{analysisError && <Alert className="mt-3 max-w-lg border-red-400/30 bg-red-400/10 text-red-100"><CircleAlert className="size-4" /><AlertTitle>Analysis unavailable</AlertTitle><AlertDescription>{analysisError}</AlertDescription></Alert>}</CardContent></Card>}</div></TabsContent>
          <TabsContent value="corpus" className="mt-0"><Card className="surface-card"><CardHeader><Eyebrow>June 2024 archive</Eyebrow><CardTitle className="mt-2 text-xl text-white">Source-coded primary problems</CardTitle><p className="text-sm text-slate-400">Counts in this export only. They do not estimate incident prevalence.</p></CardHeader><CardContent className="space-y-5">{stats?.primary_problems.slice(0, 8).map((item) => <div key={item.name} className="grid grid-cols-[minmax(100px,180px)_1fr_38px] items-center gap-4 text-sm"><span className="truncate text-slate-300">{item.name}</span><div className="h-2 rounded-full bg-slate-700/80"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-300" style={{ width: `${(item.count / (stats.primary_problems[0]?.count || 1)) * 100}%` }} /></div><span className="text-right font-mono text-sky-200">{item.count}</span></div>)}<Separator className="bg-slate-700" /><p className="text-xs leading-relaxed text-slate-400">Source: <a className="text-sky-300 underline underline-offset-4" href={stats?.source_url} target="_blank" rel="noreferrer">NASA ASRS Database Online</a>. {stats?.sample}</p></CardContent></Card></TabsContent>
        </Tabs> : <Card className="surface-card"><CardContent className="py-12 text-sm text-slate-400">Select a report to load its original narrative.</CardContent></Card>}</div></main>
    </div><footer className="footer-bar"><span>NEARMISS AI / ANALYST TRIAGE</span><span>DATA: NASA ASRS · LOCAL DEMO</span><span>HUMAN REVIEW REQUIRED</span></footer>
  </div>;
}
