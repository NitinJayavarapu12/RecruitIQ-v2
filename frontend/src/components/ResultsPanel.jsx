import { useState } from "react";
import { downloadExcel } from "../api/screenerAPI";

// ── Tier color helper ─────────────────────────────────────────────────────────

function tierColor(tier = "") {
  if (tier.includes("Excellent")) return "bg-green-100 text-green-800 border-green-200";
  if (tier.includes("Strong"))    return "bg-blue/10 text-blue border-blue/20";
  if (tier.includes("Good"))      return "bg-amber-50 text-amber-700 border-amber-200";
  if (tier.includes("Partial"))   return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-red-50 text-red-700 border-red-200";
}

// ── Score badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score }) {
  const s = Number(score) || 0;
  const color =
    s >= 90 ? "bg-green-600 text-white" :
    s >= 75 ? "bg-green-400 text-white" :
    s >= 60 ? "bg-amber-400 text-white" :
    s >= 45 ? "bg-orange-500 text-white" :
              "bg-red-500 text-white";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${color}`}>
      {Math.round(s)}
    </span>
  );
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCards({ results }) {
  const total     = results.length;
  const excellent = results.filter(r => (r.tier || "").includes("Excellent")).length;
  const strong    = results.filter(r => (r.tier || "").includes("Strong")).length;
  const avgScore  = total
    ? Math.round(results.reduce((s, r) => s + (Number(r.final_score) || 0), 0) / total)
    : 0;

  const cards = [
    { label: "Total Screened", value: total,     color: "text-ink" },
    { label: "Excellent Match", value: excellent, color: "text-green-700" },
    { label: "Strong Match",    value: strong,    color: "text-blue" },
    { label: "Avg Score",       value: `${avgScore}`, color: "text-amber-700" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(({ label, value, color }) => (
        <div key={label} className="bg-white rounded-xl border border-border shadow-card p-4 text-center">
          <p className={`font-display font-bold text-2xl ${color}`}>{value}</p>
          <p className="text-muted text-xs mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Tooltip for missing skills ─────────────────────────────────────────────────

function MissingSkillsTooltip({ missing }) {
  const [show, setShow] = useState(false);
  if (!missing || missing.length === 0) return <span className="text-muted text-xs">None</span>;

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-xs text-red-500 underline decoration-dashed cursor-help"
      >
        {missing.length} missing
      </button>
      {show && (
        <div className="absolute z-10 bottom-full left-0 mb-1 w-48 bg-white border border-border rounded-lg shadow-soft p-2">
          <p className="text-xs font-semibold text-muted mb-1">Missing Skills:</p>
          <p className="text-xs text-ink">{missing.join(", ")}</p>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ResultsPanel({ results, jobId, filteredFolder, onReset }) {
  if (!results || results.length === 0) {
    return (
      <div className="space-y-4 fade-in">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">No Candidates Found</h2>
          {onReset && (
            <button
              onClick={onReset}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-border text-muted hover:text-ink hover:bg-parchment transition-all"
            >
              ↺ Start New Screening
            </button>
          )}
        </div>
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-border shadow-card text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-parchment flex items-center justify-center">
            <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-ink/60 font-medium text-sm">No candidates matched the criteria</p>
          <p className="text-muted text-xs">Try adjusting your JD skills or increasing Top N</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 fade-in">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-ink">
            {results.length} Candidate{results.length !== 1 ? "s" : ""} Found
          </h2>
          {filteredFolder && (
            <p className="text-xs text-muted mt-0.5">
              Saved to <span className="text-blue font-medium font-mono">{filteredFolder}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {jobId && (
            <button
              onClick={() => downloadExcel(jobId)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue text-white
                text-xs font-semibold hover:bg-blue/90 transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Excel
            </button>
          )}
          {onReset && (
            <button
              onClick={onReset}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-border text-muted hover:text-ink hover:bg-parchment transition-all"
            >
              ↺ New Screening
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <SummaryCards results={results} />

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden shadow-card bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-parchment border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted w-8">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Candidate</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Experience</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Matched Skills</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Missing</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Score</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.map((result, i) => {
                const matchedSkills = Array.isArray(result.matched_skills)
                  ? result.matched_skills
                  : [];
                const missingSkills = Array.isArray(result.missing_skills)
                  ? result.missing_skills
                  : [];
                const company = result.current_company || result.latest_employment || "—";
                const years   = result.years_of_experience || "—";
                const flag    = result.experience_flag || "";

                return (
                  <tr key={result.filename || i} className="result-row">
                    {/* Rank */}
                    <td className="px-4 py-3 text-muted text-xs font-medium">{i + 1}</td>

                    {/* Candidate */}
                    <td className="px-4 py-3 min-w-[160px]">
                      <p className="font-semibold text-ink text-sm">{result.name || "—"}</p>
                      <p className="text-muted text-xs mt-0.5">{result.phone || "—"}</p>
                      {result.email && result.email !== "N/A" && (
                        <p className="text-muted text-xs truncate max-w-[150px]">{result.email}</p>
                      )}
                    </td>

                    {/* Experience */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-ink text-sm font-medium">{years} yrs</span>
                      {flag && <span className="ml-1 text-sm">{flag}</span>}
                    </td>

                    {/* Company */}
                    <td className="px-4 py-3 max-w-[140px]">
                      <p className="text-ink/80 text-xs leading-relaxed line-clamp-2">{company}</p>
                    </td>

                    {/* Matched Skills */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {matchedSkills.length > 0 ? (
                          <>
                            {matchedSkills.slice(0, 5).map((skill) => (
                              <span
                                key={skill}
                                className="text-xs px-2 py-0.5 rounded-md bg-blue-light text-blue font-medium border border-blue-mid/50"
                              >
                                {skill}
                              </span>
                            ))}
                            {matchedSkills.length > 5 && (
                              <span className="text-xs text-muted">+{matchedSkills.length - 5}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </div>
                    </td>

                    {/* Missing Skills */}
                    <td className="px-4 py-3">
                      <MissingSkillsTooltip missing={missingSkills} />
                    </td>

                    {/* Score */}
                    <td className="px-4 py-3 text-center">
                      <ScoreBadge score={result.final_score ?? result.score} />
                    </td>

                    {/* Tier */}
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium whitespace-nowrap ${tierColor(result.tier)}`}>
                        {result.tier || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
