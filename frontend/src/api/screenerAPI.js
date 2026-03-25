import axios from "axios";

const BASE = (import.meta.env.VITE_API_URL || "") + "/api";

/**
 * Step 1 → Step 2: Analyze a JD file and extract structured requirements.
 * Returns: { required_title, required_years, required_education, required_domain,
 *            primary_skills, secondary_skills, jd_summary, jd_text }
 */
export async function analyzeJD(file) {
  const form = new FormData();
  form.append("jd_file", file);
  const res = await axios.post(`${BASE}/analyze-jd`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/**
 * Step 2 refinement: Re-run Claude on the JD text with user feedback.
 * Returns updated requirements with better primary/secondary skills.
 */
export async function refineSkills(jdText, feedback) {
  const form = new FormData();
  form.append("jd_text", jdText);
  form.append("feedback", feedback || "find more specific technical skills");
  const res = await axios.post(`${BASE}/refine-skills`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/**
 * Step 2 → Step 3: Start the screening job with user-approved skills.
 * resumeFiles: array of File objects (PDF resumes, max 400)
 */
export async function startScreening(jdFile, resumeFiles, topN, primarySkills = [], secondarySkills = [], jdText = "") {
  const form = new FormData();
  form.append("jd_file", jdFile);
  resumeFiles.forEach((f) => form.append("resume_files", f));
  form.append("top_n", topN);
  form.append("primary_skills", JSON.stringify(primarySkills));
  form.append("secondary_skills", JSON.stringify(secondarySkills));
  if (jdText) {
    form.append("jd_text_override", jdText);
  }
  const res = await axios.post(`${BASE}/screen`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/**
 * Subscribe to live progress via SSE.
 * Returns an EventSource — caller must close it when done.
 */
export function subscribeToProgress(jobId, onUpdate) {
  const es = new EventSource(`${BASE}/progress/${jobId}`);
  es.onmessage = (e) => {
    try {
      onUpdate(JSON.parse(e.data));
    } catch (_) {}
  };
  return es;
}

/**
 * Fetch final results for a completed job.
 */
export async function getResults(jobId) {
  const res = await axios.get(`${BASE}/results/${jobId}`);
  return res.data;
}

/**
 * Download the Excel report for a completed job.
 */
export function downloadExcel(jobId) {
  const link = document.createElement("a");
  link.href = `${BASE}/download/${jobId}`;
  link.click();
}

/**
 * Download the ZIP of top N matched resumes for a completed job.
 */
export function downloadZip(jobId) {
  const link = document.createElement("a");
  link.href = `${BASE}/download-zip/${jobId}`;
  link.click();
}
