import os
import shutil
from typing import List


def copy_filtered_resumes(resume_folder: str, filenames: List[str]) -> str:
    """
    Copy matched resumes into a 'filtered' subfolder.
    Creates the folder if it doesn't exist.
    Returns the path to the filtered folder.
    """
    filtered_folder = os.path.join(resume_folder, "filtered")
    os.makedirs(filtered_folder, exist_ok=True)

    copied = 0
    for filename in filenames:
        src = os.path.join(resume_folder, filename)
        dst = os.path.join(filtered_folder, filename)
        if os.path.isfile(src):
            shutil.copy2(src, dst)
            copied += 1

    print(f"[FILE MANAGER] Copied {copied} resumes to: {filtered_folder}")
    return filtered_folder