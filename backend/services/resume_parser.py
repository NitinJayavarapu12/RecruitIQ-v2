import os
import json
import hashlib
import pdfplumber
import pytesseract
from pdf2image import convert_from_path
from typing import List, Dict, Optional


def _get_cache_path(folder_path: str, filename: str) -> str:
    """Return the cache file path for a given PDF."""
    cache_dir = os.path.join(folder_path, ".ocr_cache")
    os.makedirs(cache_dir, exist_ok=True)
    return os.path.join(cache_dir, filename + ".json")


def _get_file_hash(file_path: str) -> str:
    """Return MD5 hash of file to detect if it has changed."""
    hasher = hashlib.md5()
    with open(file_path, "rb") as f:
        hasher.update(f.read(8192))  # Read first 8KB for speed
    return hasher.hexdigest()


def _load_cache(cache_path: str, file_hash: str) -> Optional[str]:
    """Load cached OCR text if file hasn't changed."""
    try:
        if os.path.exists(cache_path):
            with open(cache_path, "r", encoding="utf-8") as f:
                cached = json.load(f)
            if cached.get("hash") == file_hash:
                return cached.get("text")
    except Exception:
        pass
    return None


def _save_cache(cache_path: str, file_hash: str, text: str):
    """Save extracted text to cache."""
    try:
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump({"hash": file_hash, "text": text}, f)
    except Exception as e:
        print(f"[CACHE] Could not save cache: {e}")


def parse_single_resume(file_path: str, filename: str) -> Optional[dict]:
    """Extract text from a single PDF with caching support."""
    folder_path = os.path.dirname(file_path)
    cache_path = _get_cache_path(folder_path, filename)
    file_hash = _get_file_hash(file_path)

    # Check cache first
    cached_text = _load_cache(cache_path, file_hash)
    if cached_text:
        print(f"[CACHE] Using cached text for: {filename}")
        return {
            "filename": filename,
            "path": file_path,
            "text": cached_text,
        }

    # Not in cache — extract text
    try:
        text = ""

        # Try fast text extraction first (text-based PDFs)
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"

        # Fall back to OCR for image-based PDFs
        if not text.strip():
            print(f"[OCR] Processing: {filename}")
            images = convert_from_path(file_path, dpi=150, first_page=1, last_page=3)
            for image in images:
                page_text = pytesseract.image_to_string(image, config='--psm 6')
                if page_text:
                    text += page_text + "\n"

        if text.strip():
            # Save to cache so next run is instant and consistent
            _save_cache(cache_path, file_hash, text.strip())
            return {
                "filename": filename,
                "path": file_path,
                "text": text.strip(),
            }

        return None

    except Exception as e:
        print(f"[WARNING] Could not parse {filename}: {e}")
        return None


def get_pdf_files(folder_path: str) -> List[str]:
    """Return sorted list of PDF filenames in folder."""
    if not os.path.exists(folder_path):
        raise FileNotFoundError(f"Resume folder not found: {folder_path}")
    if not os.path.isdir(folder_path):
        raise NotADirectoryError(f"Path is not a directory: {folder_path}")

    return sorted([
        f for f in os.listdir(folder_path)
        if f.lower().endswith(".pdf") and
        os.path.isfile(os.path.join(folder_path, f))
    ])