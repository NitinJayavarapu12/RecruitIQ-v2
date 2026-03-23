import { useState, useRef, useEffect } from "react";
import JDUploader from "./components/JDUploader";
import ConfigInputs from "./components/ConfigInputs";
import ProgressPanel from "./components/ProgressPanel";
import ResultsPanel from "./components/ResultsPanel";
import { startScreening, subscribeToProgress } from "./api/screenerAPI";

const IDLE = "idle";
const RUNNING = "running";
const COMPLETE = "complete";
const ERROR = "error";

export default function App() {
  const [jdFile, setJdFile] = useState(null);
  const [folderPath, setFolderPath] = useState("");
  const [topN, setTopN] = useState(50);

  const [appStatus, setAppStatus] = useState(IDLE);
  const [jobId, setJobId] = useState(null);
  const [jobState, setJobState] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const esRef = useRef(null);

  useEffect(() => { return () => esRef.current?.close(); }, []);

  const canRun = jdFile && folderPath.trim().length > 0;
  const isRunning = appStatus === RUNNING;
  const results = jobState?.results ?? [];

  const handleRun = async () => {
    if (!canRun) return;
    setAppStatus(RUNNING);
    setJobState(null);
    setErrorMsg("");
    esRef.current?.close();

    try {
      const { job_id } = await startScreening(jdFile, folderPath, topN);
      setJobId(job_id);

      const es = subscribeToProgress(job_id, (data) => {
        setJobState(data);
        if (data.status === COMPLETE) { setAppStatus(COMPLETE); es.close(); }
        else if (data.status === ERROR) { setAppStatus(ERROR); setErrorMsg(data.error || "Unknown error"); es.close(); }
      });
      esRef.current = es;
    } catch (err) {
      setAppStatus(ERROR);
      setErrorMsg(err?.response?.data?.detail || err.message || "Failed to connect to backend.");
    }
  };

  const handleReset = () => {
    esRef.current?.close();
    setAppStatus(IDLE);
    setJobId(null);
    setJobState(null);
    setErrorMsg("");
  };

  return (
    <div className="min-h-screen bg-cream font-body">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-blue flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-ink text-lg leading-none font-semibold">RecruitIQ</h1>
              <p className="text-muted text-xs">AI-Powered Resume Screener</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-muted text-xs hidden sm:block">Powered by Claude</span>
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">

          {/* ── LEFT — Config panel ─────────────────────────────── */}
          <aside className="space-y-4">
            {/* Title */}
            <div>
              <h2 className="font-display text-2xl text-ink font-semibold leading-tight">
                Find your best <span className="text-blue">candidates.</span>
              </h2>
              <p className="text-muted text-sm mt-1.5 leading-relaxed">
                Upload a job description, set your folder path, and let AI do the screening.
              </p>
            </div>

            {/* Form card */}
            <div className="bg-white rounded-xl border border-border shadow-card p-5 space-y-5">
              <JDUploader file={jdFile} onChange={setJdFile} />
              <div className="border-t border-border" />
              <ConfigInputs
                folderPath={folderPath}
                onFolderChange={setFolderPath}
                topN={topN}
                onTopNChange={setTopN}
              />

              {/* Run button */}
              <button
                onClick={
                  isRunning ? undefined
                  : appStatus === COMPLETE || appStatus === ERROR ? handleReset
                  : handleRun
                }
                disabled={!canRun && appStatus === IDLE}
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all duration-150
                  ${isRunning
                    ? "bg-blue/10 text-blue cursor-not-allowed border border-blue/20"
                    : appStatus === COMPLETE || appStatus === ERROR
                    ? "bg-parchment text-muted hover:text-ink hover:bg-border cursor-pointer border border-border"
                    : canRun
                    ? "bg-blue text-white hover:bg-blue/90 shadow-sm cursor-pointer"
                    : "bg-parchment text-muted cursor-not-allowed border border-border opacity-60"
                  }`}
              >
                {isRunning ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Screening...
                  </span>
                ) : appStatus === COMPLETE || appStatus === ERROR
                  ? "↺ Start New Screening"
                  : "▶  Run Screening"}
              </button>
            </div>

            {/* How it works */}
            <div className="bg-white rounded-xl border border-border shadow-card p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">How it works</p>
              <div className="space-y-3">
                {[
                  ["1", "Keyword match", "Scores all PDFs against JD keywords"],
                  ["2", "AI filter", "Claude re-ranks with contextual scoring"],
                  ["3", "Export", "Saves filtered resumes + Excel report"],
                ].map(([num, title, desc]) => (
                  <div key={num} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-light text-blue text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {num}
                    </span>
                    <div>
                      <p className="text-ink text-xs font-semibold">{title}</p>
                      <p className="text-muted text-xs">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* ── RIGHT — Results area ────────────────────────────── */}
          <section className="min-h-[480px]">

            {/* Idle state */}
            {appStatus === IDLE && (
              <div className="flex flex-col items-center justify-center h-full min-h-96 bg-white rounded-xl border border-border shadow-card">
                <div className="w-14 h-14 rounded-xl bg-parchment flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-ink/50 font-medium text-sm">Results will appear here</p>
                <p className="text-muted text-xs mt-1">Configure the options and click Run Screening</p>
              </div>
            )}

            {/* Running */}
            {isRunning && jobState && (
              <div className="space-y-4">
                <ProgressPanel jobState={jobState} />
              </div>
            )}

            {/* Error */}
            {appStatus === ERROR && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 font-semibold text-sm">Screening Failed</p>
                </div>
                <p className="text-red-600 text-sm">{errorMsg}</p>
              </div>
            )}

            {/* Results */}
            {appStatus === COMPLETE && (
              <ResultsPanel
                results={results}
                jobId={jobId}
                filteredFolder={jobState?.filtered_folder}
                isEmpty={results.length === 0}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}