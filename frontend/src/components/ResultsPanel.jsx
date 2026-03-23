import { downloadExcel } from "../api/screenerAPI";

export default function ResultsPanel({ results, jobId, filteredFolder, isEmpty }) {
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-parchment flex items-center justify-center">
          <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-ink/60 font-medium text-sm">No candidates matched the threshold</p>
        <p className="text-muted text-xs">Try lowering the minimum score and re-running</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-ink">
            {results.length} Candidate{results.length !== 1 ? "s" : ""} Found
          </h2>
          {filteredFolder && (
            <p className="text-xs text-muted mt-0.5">
              Saved to <span className="text-blue font-medium font-mono text-xs">{filteredFolder}</span>
            </p>
          )}
        </div>

        {jobId && (
          <button
            onClick={() => downloadExcel(jobId)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue text-white
              text-xs font-semibold hover:bg-blue/90 transition-colors duration-150 shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Excel
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden shadow-card bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-parchment border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted w-8">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Matched Skills</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Work Experience</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.map((result, i) => (
                <tr key={result.filename} className="result-row">
                  {/* Rank */}
                  <td className="px-4 py-3 text-muted text-xs font-medium">{i + 1}</td>

                  {/* Name */}
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink text-sm">{result.name || "—"}</p>
                    <p className="text-muted text-xs mt-0.5 truncate max-w-[140px]">{result.filename}</p>
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3 text-ink/80 text-sm whitespace-nowrap">
                    {result.phone || "—"}
                  </td>

                  {/* Skills */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                      {(() => {
                        const skills = [...(result.primary_skills || []), ...(result.secondary_skills || [])];
                        return skills.length > 0 ? (
                          <>
                            {skills.slice(0, 6).map((skill) => (
                              <span
                                key={skill}
                                className="text-xs px-2 py-0.5 rounded-md bg-blue-light text-blue font-medium border border-blue-mid/50"
                              >
                                {skill}
                              </span>
                            ))}
                            {skills.length > 6 && (
                              <span className="text-xs text-muted px-1">+{skills.length - 6}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        );
                      })()}
                    </div>
                  </td>

                  {/* Work Experience */}
                  <td className="px-4 py-3 max-w-[260px]">
                    <p className="text-ink/80 text-xs leading-relaxed line-clamp-3">
                      {result.latest_employment || "—"}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}