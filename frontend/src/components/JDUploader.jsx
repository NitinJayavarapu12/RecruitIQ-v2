import { useState, useRef } from "react";

export default function JDUploader({ file, onChange }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const isValid = (f) =>
    f.type === "application/pdf" || f.name.endsWith(".docx") || f.name.endsWith(".doc");

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && isValid(dropped)) onChange(dropped);
  };

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
        Job Description
      </label>
      <div
        className={`rounded-lg border-2 border-dashed cursor-pointer transition-all duration-150
          ${dragging ? "drag-over" : "border-border hover:border-blue/50 hover:bg-blue-light/40"}
          ${file ? "border-blue/40 bg-blue-light/40" : "bg-white"}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input ref={inputRef} type="file" accept=".pdf,.docx,.doc" onChange={(e) => {
          const f = e.target.files[0];
          if (f && isValid(f)) onChange(f);
        }} className="hidden" />

        <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
          {file ? (
            <>
              <div className="w-8 h-8 rounded-full bg-blue/10 flex items-center justify-center mb-2">
                <svg className="w-4 h-4 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-blue font-medium text-sm">{file.name}</p>
              <p className="text-muted text-xs mt-0.5">{(file.size / 1024).toFixed(1)} KB · Click to replace</p>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-parchment flex items-center justify-center mb-2">
                <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-ink/70 text-sm font-medium">Drop your JD here</p>
              <p className="text-muted text-xs mt-0.5">PDF or DOCX · Click to browse</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}