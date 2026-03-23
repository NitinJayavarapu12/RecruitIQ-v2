import axios from "axios";

const BASE = "/api";

/**
 * Start a screening job.
 * @param {File} jdFile - Uploaded JD file
 * @param {string} resumeFolder - Local folder path
 * @param {number} minScore - Minimum match threshold (0–100)
 * @returns {Promise<{job_id: string}>}
 */
export async function startScreening(jdFile, resumeFolder, topN) {
  const form = new FormData();
  form.append("jd_file", jdFile);
  form.append("resume_folder", resumeFolder);
  form.append("top_n", topN);

  const res = await axios.post(`${BASE}/screen`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/**
 * Subscribe to live progress via SSE.
 * @param {string} jobId
 * @param {function} onUpdate - Callback with parsed event data
 * @returns {EventSource}
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
 * Download the Excel report for a completed job.
 * @param {string} jobId
 */
export function downloadExcel(jobId) {
  const link = document.createElement("a");
  link.href = `${BASE}/download/${jobId}`;
  link.click();
}