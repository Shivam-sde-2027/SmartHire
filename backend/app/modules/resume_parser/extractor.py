import tempfile
from pathlib import Path

import fitz
from docx import Document
from fastapi import HTTPException, UploadFile


def extract_text_from_pdf(path: Path) -> str:
    doc = fitz.open(path)
    pages = []
    try:
        for page in doc:
            text = page.get_text()
            if text:
                pages.append(text)
    finally:
        doc.close()
    return "\n".join(pages)


def extract_text_from_docx(path: Path) -> str:
    document = Document(path)
    return "\n".join(p.text for p in document.paragraphs if p.text.strip())


def extract_text_from_file(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return extract_text_from_pdf(path)
    if suffix in {".docx", ".doc"}:
        return extract_text_from_docx(path)
    raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix}")


async def extract_text_from_upload(file: UploadFile, max_bytes: int | None = None) -> str:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".pdf", ".docx", ".doc"}:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are supported.",
        )

    content = await file.read()
    if max_bytes and len(content) > max_bytes:
        raise HTTPException(status_code=400, detail="File too large.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        text = extract_text_from_file(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)

    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from file.")

    return text
