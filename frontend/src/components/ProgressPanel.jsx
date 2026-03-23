export default function ProgressPanel({ jobState }) {
  const { status, phase, progress, total, current_file } = jobState;
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;
  const isComplete = status === "complete";
  const isError = status === "error";

  return (
    <div className="rounded-lg border border-border bg-white p-5 shadow-card space-y-3">
      {/* Status row */}
      <div className="flex items-center gap-2.5">
        <div className={`w-2 h-2 rounded-full flex-shrink-0
          ${isComplete ? "bg-green-500" : isError ? "bg-red-500" : "bg-blue animate-pulse"}`}
        />
        <p className="text-ink text-sm font-medium">{phase || "Processing..."}</p>
      </div>

      {/* Progress bar */}
      {!isComplete && !isError && total > 0 && (
        <div>
          <div className="flex justify-between text-xs text-muted mb-1.5">
            <span>
              {progress < total
                ? `Processing resume ${progress} of ${total}`
                : `Claude is analysing ${total} matched resume${total !== 1 ? "s" : ""}...`}
            </span>
            <span className="text-blue font-semibold">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-parchment overflow-hidden">
            <div
              className="h-full rounded-full bg-blue progress-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
          {current_file && progress < total && (
            <p className="text-xs text-muted mt-1 truncate">→ {current_file}</p>
          )}
        </div>
      )}

      {/* Indeterminate bar for initial phase */}
      {!isComplete && !isError && total === 0 && (
        <div className="h-1.5 rounded-full bg-parchment overflow-hidden">
          <div className="h-full w-1/3 rounded-full shimmer" />
        </div>
      )}
    </div>
  );
}