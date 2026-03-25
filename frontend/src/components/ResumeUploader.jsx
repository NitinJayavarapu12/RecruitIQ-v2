import { useState, useRef } from "react";

const MAX_FILES = 400;
const SUPPORTED_EXTS = [".pdf", ".docx", ".doc"];

function isSupported(filename) {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return SUPPORTED_EXTS.includes(ext);
}

export default function ResumeUploader({ files, onChange }) {
  const [dragging, setDragging]   = useState(false);
  const [mode, setMode]           = useState("files"); // "files" | "folder"
  const fileInputRef   = useRef();
  const folderInputRef = useRef();

  const addFiles = (incoming) => {
    const valid = Array.from(incoming).filter((f) => isSupported(f.name));
    if (valid.length === 0) return;
    const merged = [...files];
    const existingNames = new Set(files.map((f) => f.name));
    for (const f of valid) {
      if (!existingNames.has(f.name)) {
        merged.push(f);
        existingNames.add(f.name);
      }
    }
    onChange(merged.slice(0, MAX_FILES));
  };

  const removeFile = (name) => onChange(files.filter((f) => f.name !== name));
  const clearAll   = () => onChange([]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleZoneClick = () => {
    if (mode === "folder") folderInputRef.current?.click();
    else fileInputRef.current?.click();
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const sizeMB    = (totalSize / (1024 * 1024)).toFixed(1);

  return (
    <div>
      {/* Label + toggle */}
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-semibold uppercase tracking-widest text-muted">
          Resumes
        </label>
        <div className="flex items-center gap-1 bg-parchment rounded-lg p-0.5 border border-border">
          <button
            onClick={() => setMode("files")}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all
              ${mode === "files" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            Select Files
          </button>
          <button
            onClick={() => setMode("folder")}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all
              ${mode === "folder" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            Select Folder
          </button>
        </div>
      </div>

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        multiple
        onChange={(e) => addFiles(e.target.files)}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore — webkitdirectory is non-standard but widely supported
        webkitdirectory=""
        multiple
        onChange={(e) => addFiles(e.target.files)}
        className="hidden"
      />

      {/* Drop zone */}
      <div
        className={`rounded-lg border-2 border-dashed cursor-pointer transition-all duration-150
          ${dragging ? "border-blue bg-blue-light/60" : "border-border hover:border-blue/50 hover:bg-blue-light/40"}
          ${files.length > 0 ? "border-blue/40 bg-blue-light/30" : "bg-white"}`}
        onClick={handleZoneClick}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center py-5 px-4 text-center">
          {files.length > 0 ? (
            <>
              <div className="w-8 h-8 rounded-full bg-blue/10 flex items-center justify-center mb-2">
                <svg className="w-4 h-4 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-blue font-semibold text-sm">
                {files.length} resume{files.length !== 1 ? "s" : ""} selected
              </p>
              <p className="text-muted text-xs mt-0.5">
                {sizeMB} MB total · Click to {mode === "folder" ? "change folder" : "add more"}
              </p>
              {files.length >= MAX_FILES && (
                <p className="text-amber-600 text-xs mt-1 font-medium">Maximum {MAX_FILES} files reached</p>
              )}
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-parchment flex items-center justify-center mb-2">
                {mode === "folder" ? (
                  <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                )}
              </div>
              {mode === "folder" ? (
                <>
                  <p className="text-ink/70 text-sm font-medium">Click to select a folder</p>
                  <p className="text-muted text-xs mt-0.5">PDF and DOCX files will be picked up automatically</p>
                </>
              ) : (
                <>
                  <p className="text-ink/70 text-sm font-medium">Drop resumes here</p>
                  <p className="text-muted text-xs mt-0.5">PDF, DOCX · Multiple files · Up to {MAX_FILES} · Click to browse</p>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* File list + clear */}
      {files.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted">{files.length} file{files.length !== 1 ? "s" : ""}</p>
            <button onClick={clearAll} className="text-xs text-muted hover:text-red-500 transition-colors">
              Clear all
            </button>
          </div>
          <div className="max-h-36 overflow-y-auto rounded-lg border border-border bg-parchment/50 divide-y divide-border">
            {files.map((f) => (
              <div key={f.name} className="flex items-center justify-between px-3 py-1.5 group">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted flex-shrink-0 uppercase font-medium">
                    {f.name.slice(f.name.lastIndexOf(".") + 1)}
                  </span>
                  <span className="text-xs text-ink truncate">{f.name}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(f.name); }}
                  className="ml-2 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 text-sm leading-none"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
