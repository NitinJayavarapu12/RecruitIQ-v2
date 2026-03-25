export default function ConfigInputs({ topN, onTopNChange }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-widest text-muted mb-2">
        Number of Top Candidates
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <input
          type="number"
          min={1}
          max={400}
          value={topN}
          onChange={(e) => onTopNChange(Number(e.target.value))}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border text-ink text-sm
            bg-white focus:outline-none focus:border-blue/60 focus:ring-1 focus:ring-blue/20
            transition-all duration-150"
        />
      </div>
      <div className="flex gap-2 mt-2">
        {[10, 25, 50, 100].map((val) => (
          <button
            key={val}
            onClick={() => onTopNChange(val)}
            className={`text-xs px-2.5 py-1 rounded-md border transition-all duration-150
              ${topN === val
                ? "text-blue border-blue/50 bg-blue/10"
                : "text-muted border-border hover:border-muted"}`}
          >
            Top {val}
          </button>
        ))}
      </div>
    </div>
  );
}
