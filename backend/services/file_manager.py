import os
import zipfile
import tempfile
import datetime
from typing import List


def create_filtered_zip(resume_folder: str, filenames: List[str], jd_filename: str = "") -> str:
    """
    Create a ZIP archive of the top N matched resumes.
    Returns path to the ZIP file saved in the system temp directory.
    """
    date_tag = datetime.datetime.now().strftime("%Y-%m-%d_%H%M")
    jd_base = os.path.splitext(jd_filename)[0] if jd_filename else "results"
    safe_jd = "".join(c if c.isalnum() or c in "-_" else "_" for c in jd_base)
    zip_filename = f"top_candidates_{safe_jd}_{date_tag}.zip"
    zip_path = os.path.join(tempfile.gettempdir(), zip_filename)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        added = 0
        for filename in filenames:
            src = os.path.join(resume_folder, filename)
            if os.path.isfile(src):
                zf.write(src, filename)
                added += 1

    print(f"[ZIP] Created {added} resumes → {zip_path}")
    return zip_path
