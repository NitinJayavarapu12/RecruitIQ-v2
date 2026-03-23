export default function ConfigInputs({ folderPath, onFolderChange, topN, onTopNChange }) {
  return (
    <div className="space-y-5">
      {/* Resume folder path */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-widest text-muted mb-2">
          Resume Folder Path
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
          </div>
          <input
            type="text"
            value={folderPath}
            onChange={(e) => onFolderChange(e.target.value)}
            placeholder="/Users/you/resumes"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-card border border-border
  text-cream placeholder-muted text-sm
  focus:outline-none focus:bg-card focus:border-teal/60 focus:ring-1 focus:ring-teal/30
  transition-all duration-150 [color-scheme:dark]"
style={{ color: '#F0EDE8', backgroundColor: '#1A2236' }}
          />
        </div>
        <p className="text-muted text-xs mt-1.5">
          Top resumes will be saved to <span className="text-teal/80">/filtered</span> inside this folder
        </p>
      </div>

      {/* Top N input */}
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
            max={500}
            value={topN}
            onChange={(e) => onTopNChange(Number(e.target.value))}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-card border border-border
  text-cream placeholder-muted text-sm
  focus:outline-none focus:border-teal/60 focus:ring-1 focus:ring-teal/30
  transition-all duration-150 [color-scheme:dark]"
style={{ color: '#F0EDE8' }}
          />
        </div>
        <p className="text-muted text-xs mt-1.5">
          Top candidates selected by keyword match score
        </p>

        {/* Quick select buttons */}
        <div className="flex gap-2 mt-2">
          {[10, 25, 50, 100].map((val) => (
            <button
              key={val}
              onClick={() => onTopNChange(val)}
              className={`text-xs px-2.5 py-1 rounded-md border transition-all duration-150
                ${topN === val
                  ? "text-teal border-teal/50 bg-teal/10"
                  : "text-muted border-border hover:border-muted"
                }`}
            >
              Top {val}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}