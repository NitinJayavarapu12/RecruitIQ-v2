import { useState, useRef, useEffect } from "react";
import JDUploader from "./components/JDUploader";
import ResumeUploader from "./components/ResumeUploader";
import ConfigInputs from "./components/ConfigInputs";
import JDReviewPanel from "./components/JDReviewPanel";
import ProgressPanel from "./components/ProgressPanel";
import ResultsPanel from "./components/ResultsPanel";
import {
  analyzeJD,
  refineSkills,
  startScreening,
  subscribeToProgress,
} from "./api/screenerAPI";

export default function App() {
  // Step 1 state
  const [jdFile, setJdFile]         = useState(null);
  const [resumeFiles, setResumeFiles] = useState([]);
  const [topN, setTopN]             = useState(25);

  // Step 2 state
  const [jdRequirements, setJdRequirements] = useState(null);
  const [primarySkills, setPrimarySkills]   = useState([]);
  const [secondarySkills, setSecondarySkills] = useState([]);
  const [jdText, setJdText]       = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefining, setIsRefining]   = useState(false);

  // Step 3/4 state
  const [step, setStep]           = useState(1);
  const [jobId, setJobId]         = useState(null);
  const [jobState, setJobState]   = useState(null);
  const [errorMsg, setErrorMsg]   = useState("");

  const esRef = useRef(null);
  useEffect(() => () => esRef.current?.close(), []);

  // ── Step 1 → 2: Analyze JD ──────────────────────────────────────────────
  const handleAnalyzeJD = async () => {
    if (!jdFile || resumeFiles.length === 0) return;
    setIsAnalyzing(true);
    setErrorMsg("");
    try {
      const data = await analyzeJD(jdFile);
      setJdRequirements(data);
      setPrimarySkills(data.primary_skills || []);
      setSecondarySkills(data.secondary_skills || []);
      setJdText(data.jd_text || "");
      setStep(2);
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || err.message || "Failed to analyze JD.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Step 2: Re-run AI for better skills ──────────────────────────────────
  const handleRefineSkills = async () => {
    if (!jdText) return;
    setIsRefining(true);
    try {
      const data = await refineSkills(jdText, "find more specific technical skills");
      setJdRequirements(data);
      setPrimarySkills(data.primary_skills || []);
      setSecondarySkills(data.secondary_skills || []);
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || err.message || "Failed to refine skills.");
    } finally {
      setIsRefining(false);
    }
  };

  // ── Step 2 → 3: Start Screening ──────────────────────────────────────────
  const handleStartScreening = async () => {
    setErrorMsg("");
    esRef.current?.close();
    setStep(3);
    setJobState(null);

    try {
      const { job_id } = await startScreening(
        jdFile, resumeFiles, topN, primarySkills, secondarySkills, jdText
      );
      setJobId(job_id);

      const es = subscribeToProgress(job_id, (data) => {
        setJobState(data);
        if (data.status === "complete") {
          setStep(4);
          es.close();
        } else if (data.status === "error") {
          setErrorMsg(data.error || "Unknown error during screening.");
          setStep(4);
          es.close();
        }
      });
      esRef.current = es;
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || err.message || "Failed to start screening.");
      setStep(4);
    }
  };

  // ── Reset to Step 1 ──────────────────────────────────────────────────────
  const handleReset = () => {
    esRef.current?.close();
    setStep(1);
    setJdFile(null);
    setResumeFiles([]);
    setTopN(25);
    setJdRequirements(null);
    setPrimarySkills([]);
    setSecondarySkills([]);
    setJdText("");
    setJobId(null);
    setJobState(null);
    setErrorMsg("");
  };

  const results = jobState?.results ?? [];
  const isScreeningActive = step === 3;

  const canNavigateTo = (s) => {
    if (isScreeningActive) return false;
    if (s === step) return false;
    if (s === 1) return true;
    if (s === 2) return !!jdRequirements;
    if (s === 3) return false; // only reached automatically
    if (s === 4) return jobState?.status === "complete";
    return false;
  };

  return (
    <div className="min-h-screen bg-cream font-body">

      {/* ── Header ──────────────────────────────────────────────────────── */}
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

          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {[
              [1, "Upload"],
              [2, "Review"],
              [3, "Screening"],
              [4, "Results"],
            ].map(([s, label]) => {
              const navigable = canNavigateTo(s);
              const active = s === step;
              const done = s < step;
              return (
                <div key={s} className="flex items-center gap-1">
                  <button
                    onClick={() => navigable && setStep(s)}
                    disabled={!navigable}
                    className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all
                      ${navigable ? "cursor-pointer hover:bg-parchment" : "cursor-default"}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                      ${active
                        ? "bg-blue text-white"
                        : done && !isScreeningActive
                          ? "bg-blue/20 text-blue"
                          : isScreeningActive
                            ? "bg-parchment text-muted opacity-40"
                            : navigable
                              ? "bg-parchment text-blue border border-blue/30"
                              : "bg-parchment text-muted"}`}>
                      {done && !isScreeningActive ? "✓" : s}
                    </div>
                    <span className={`text-[10px] font-medium leading-none
                      ${active ? "text-blue" : isScreeningActive ? "text-muted opacity-40" : navigable ? "text-ink" : "text-muted"}`}>
                      {label}
                    </span>
                  </button>
                  {s < 4 && (
                    <div className={`w-6 h-px mb-4 ${done && !isScreeningActive ? "bg-blue/40" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* ── STEP 1: Upload & Configure ────────────────────────────────── */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
            <aside className="space-y-4">
              <div>
                <h2 className="font-display text-2xl text-ink font-semibold leading-tight">
                  Find your best <span className="text-blue">candidates.</span>
                </h2>
                <p className="text-muted text-sm mt-1.5 leading-relaxed">
                  Upload a job description, set your resume folder, and let AI do the screening.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-border shadow-card p-5 space-y-5">
                <JDUploader file={jdFile} onChange={(f) => { setJdFile(f); }} />
                <div className="border-t border-border" />
                <ResumeUploader files={resumeFiles} onChange={setResumeFiles} />
                <div className="border-t border-border" />
                <ConfigInputs topN={topN} onTopNChange={setTopN} />

                {errorMsg && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-600 text-xs">
                    {errorMsg}
                  </div>
                )}

                <button
                  onClick={handleAnalyzeJD}
                  disabled={!jdFile || resumeFiles.length === 0 || isAnalyzing}
                  className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all
                    ${jdFile && resumeFiles.length > 0 && !isAnalyzing
                      ? "bg-blue text-white hover:bg-blue/90 shadow-sm cursor-pointer"
                      : "bg-parchment text-muted cursor-not-allowed border border-border opacity-60"}`}
                >
                  {isAnalyzing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Analyzing JD...
                    </span>
                  ) : "Analyze JD →"}
                </button>
              </div>

              <div className="bg-white rounded-xl border border-border shadow-card p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">How it works</p>
                <div className="space-y-3">
                  {[
                    ["1", "Analyze JD", "AI extracts skills & requirements"],
                    ["2", "Review Skills", "Edit and approve the skill list"],
                    ["3", "AI Screening", "Claude scores every resume"],
                    ["4", "Results", "Download ranked candidates + Excel"],
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

            <section className="min-h-96 flex items-center justify-center bg-white rounded-xl border border-border shadow-card">
              <div className="text-center">
                <div className="w-14 h-14 rounded-xl bg-parchment flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-ink/50 font-medium text-sm">Upload a JD to get started</p>
                <p className="text-muted text-xs mt-1">Screening results will appear after the workflow completes</p>
              </div>
            </section>
          </div>
        )}

        {/* ── STEP 2: JD Skills Review ──────────────────────────────────── */}
        {step === 2 && (
          <JDReviewPanel
            requirements={jdRequirements}
            primarySkills={primarySkills}
            secondarySkills={secondarySkills}
            onPrimaryChange={setPrimarySkills}
            onSecondaryChange={setSecondarySkills}
            isRefining={isRefining}
            errorMsg={errorMsg}
            onBack={() => { setStep(1); setErrorMsg(""); }}
            onRefine={handleRefineSkills}
            onConfirm={handleStartScreening}
          />
        )}

        {/* ── STEP 3: Screening Progress ────────────────────────────────── */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="text-center mb-6">
              <h2 className="font-display text-2xl text-ink font-semibold">Screening in progress...</h2>
              <p className="text-muted text-sm mt-1">Please wait — AI is evaluating each resume against your JD.</p>
            </div>
            {jobState ? (
              <ProgressPanel jobState={jobState} />
            ) : (
              <div className="bg-white rounded-xl border border-border shadow-card p-8 text-center">
                <svg className="w-5 h-5 animate-spin text-blue mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <p className="text-muted text-sm">Connecting to screening service...</p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Results ───────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            {errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 font-semibold text-sm">Screening Error</p>
                </div>
                <p className="text-red-600 text-sm">{errorMsg}</p>
              </div>
            )}
            <ResultsPanel
              results={results}
              jobId={jobId}
              onReset={handleReset}
            />
          </div>
        )}
      </main>
    </div>
  );
}
