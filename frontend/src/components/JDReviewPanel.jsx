import { useState } from "react";

// ── Editable tag list ─────────────────────────────────────────────────────────

function EditableTagList({ skills, onChange, color = "blue" }) {
  const [inputVal, setInputVal] = useState("");

  const addSkill = (val) => {
    const trimmed = val.trim();
    if (trimmed && !skills.includes(trimmed)) {
      onChange([...skills, trimmed]);
    }
    setInputVal("");
  };

  const removeSkill = (skill) => {
    onChange(skills.filter((s) => s !== skill));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(inputVal);
    }
  };

  const tagBase = color === "blue"
    ? "bg-blue/10 text-blue border border-blue/20"
    : "bg-amber-50 text-amber-700 border border-amber-200";

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {skills.map((skill) => (
        <span
          key={skill}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${tagBase}`}
        >
          {skill}
          <button
            onClick={() => removeSkill(skill)}
            className="ml-0.5 hover:opacity-60 transition-opacity leading-none"
            title="Remove"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (inputVal.trim()) addSkill(inputVal); }}
        placeholder="+ add skill"
        className="text-xs px-2 py-1 rounded-full border border-dashed border-border text-muted placeholder-muted/60 outline-none focus:border-blue focus:text-ink bg-transparent min-w-[80px]"
      />
    </div>
  );
}

// ── Requirement badge ─────────────────────────────────────────────────────────

function ReqBadge({ label, value }) {
  return (
    <div className="bg-parchment rounded-lg p-3">
      <p className="text-muted text-xs mb-0.5">{label}</p>
      <p className="text-ink font-semibold text-sm leading-snug">{value || "N/A"}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function JDReviewPanel({
  requirements,
  primarySkills,
  secondarySkills,
  onPrimaryChange,
  onSecondaryChange,
  isRefining,
  errorMsg,
  onBack,
  onRefine,
  onConfirm,
}) {
  const req = requirements || {};

  return (
    <div className="max-w-4xl mx-auto space-y-5 fade-in">
      {/* Title */}
      <div>
        <h2 className="font-display text-2xl text-ink font-semibold">
          Review <span className="text-blue">JD Requirements</span>
        </h2>
        <p className="text-muted text-sm mt-1">
          Verify the extracted requirements and edit skills before screening begins.
        </p>
      </div>

      {/* JD Summary */}
      {req.jd_summary && req.jd_summary !== "N/A" && (
        <div className="bg-blue/5 border border-blue/15 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-blue uppercase tracking-widest mb-1">Role Summary</p>
          <p className="text-ink text-sm leading-relaxed">{req.jd_summary}</p>
        </div>
      )}

      {/* Requirements grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ReqBadge label="Role" value={req.required_title} />
        <ReqBadge label="Min Experience" value={req.required_years ? `${req.required_years}+ years` : "N/A"} />
        <ReqBadge label="Domain" value={req.required_domain} />
        <ReqBadge label="Education" value={req.required_education} />
      </div>

      {/* Skills cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Primary Skills */}
        <div className="bg-white rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-ink font-semibold text-sm">Primary Skills</p>
              <p className="text-muted text-xs">Mandatory — used for scoring</p>
            </div>
            <span className="text-xs bg-blue/10 text-blue px-2 py-0.5 rounded-full font-medium">
              {primarySkills.length}
            </span>
          </div>
          <EditableTagList
            skills={primarySkills}
            onChange={onPrimaryChange}
            color="blue"
          />
        </div>

        {/* Secondary Skills */}
        <div className="bg-white rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-ink font-semibold text-sm">Secondary Skills</p>
              <p className="text-muted text-xs">Good-to-have — bonus points</p>
            </div>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {secondarySkills.length}
            </span>
          </div>
          <EditableTagList
            skills={secondarySkills}
            onChange={onSecondaryChange}
            color="amber"
          />
        </div>
      </div>

      {/* Tip */}
      <div className="text-xs text-muted flex items-start gap-2">
        <span className="text-blue mt-0.5">ℹ</span>
        Click <span className="text-ink font-medium">×</span> on a tag to remove it.
        Type a skill name and press <span className="text-ink font-medium">Enter</span> to add.
        You can always edit before screening.
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-600 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <button
          onClick={onBack}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-border text-muted hover:text-ink hover:bg-parchment transition-all"
        >
          ← Back
        </button>

        <button
          onClick={onRefine}
          disabled={isRefining}
          className={`px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all
            ${isRefining
              ? "border-blue/20 bg-blue/5 text-blue/60 cursor-not-allowed"
              : "border-blue/30 bg-blue/5 text-blue hover:bg-blue/10 cursor-pointer"}`}
        >
          {isRefining ? (
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Re-running AI...
            </span>
          ) : "🔄 Re-run AI for Better Skills"}
        </button>

        <button
          onClick={onConfirm}
          disabled={primarySkills.length === 0}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all
            ${primarySkills.length > 0
              ? "bg-blue text-white hover:bg-blue/90 shadow-sm cursor-pointer"
              : "bg-parchment text-muted cursor-not-allowed border border-border opacity-60"}`}
        >
          ✅ Looks Good — Start Screening
        </button>
      </div>
    </div>
  );
}
