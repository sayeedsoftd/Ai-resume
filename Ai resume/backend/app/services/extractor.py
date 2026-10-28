import io
import os
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional
from PIL import Image
from app.utils.logger import logger


class TextExtractorService:
    """
    Robust text extraction service supporting PDFs, DOCX, and plain text documents.
    Implements a hybrid approach:
    1. Digital text extraction via pdfminer.six and PyPDF2.
    2. Optical Character Recognition (OCR) fallback via PyTesseract for scanned documents.
    3. Python-docx + native XML fallback for DOCX.
    """

    @staticmethod
    def clean_and_sanitize_text(text: str) -> str:
        """
        Cleans and sanitizes extracted raw text:
        - Replaces non-standard bullets and typographic symbols
        - Removes non-printable ASCII/Unicode control characters
        - Normalizes unicode whitespace and line-break sequences
        - Removes excessive repetitive blank lines
        """
        if not text:
            return ""

        # Normalize unicode dashes, quotes, and bullet symbols
        bullet_replacements = {
            "\u2022": " - ",
            "\u2023": " - ",
            "\u25E6": " - ",
            "\u2043": " - ",
            "\u2219": " - ",
            "\u25AA": " - ",
            "\u25CF": " - ",
            "\u2013": "-",
            "\u2014": "-",
            "\u2018": "'",
            "\u2019": "'",
            "\u201C": '"',
            "\u201D": '"',
            "\u00A0": " ",  # Non-breaking space
        }
        for orig, replacement in bullet_replacements.items():
            text = text.replace(orig, replacement)

        # Remove non-printable control characters (keeping \n, \r, \t)
        text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]", " ", text)

        # Standardize line breaks
        text = text.replace("\r\n", "\n").replace("\r", "\n")

        # Collapse excessive blank lines (> 2 newlines into 2)
        text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)

        # Collapse horizontal whitespace tabs/spaces
        lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
        cleaned = "\n".join(lines).strip()

        return cleaned

    @classmethod
    def extract_from_pdf(cls, file_path: Path) -> str:
        """
        Stage 1: Pure raw text extraction from PDF.
        - Primary: pdfplumber to strip visual multi-column layouts, tables, and stylistic decorators.
        - Secondary: pypdf / PyPDF2 text extraction.
        - Fallback: pdfminer.six.
        - Scanned Fallback: PyTesseract / Gemini multimodal vision.
        """
        extracted_text = ""

        # Step 1: Attempt extraction with pdfplumber (flattens layouts, extracts words in reading order)
        try:
            import pdfplumber
            plumber_chunks = []
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    # extract_text with layout=False strips decorative layouts and formats logically
                    t = page.extract_text(layout=False) or ""
                    if t.strip():
                        plumber_chunks.append(t)
            if plumber_chunks:
                extracted_text = "\n".join(plumber_chunks)
        except Exception as e:
            logger.warning(f"pdfplumber extraction failed for {file_path.name}: {e}")

        # Step 2: Fallback to pypdf / PyPDF2 if pdfplumber returned insufficient text
        if len(extracted_text.strip()) < 80:
            try:
                import pypdf
                pypdf_chunks = []
                with open(file_path, "rb") as f:
                    reader = pypdf.PdfReader(f)
                    for page in reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            pypdf_chunks.append(page_text)
                fallback_pypdf = "\n".join(pypdf_chunks)
                if len(fallback_pypdf.strip()) > len(extracted_text.strip()):
                    extracted_text = fallback_pypdf
            except Exception as e:
                logger.debug(f"pypdf extraction skipped: {e}")

        # Step 3: Fallback to pdfminer.six
        if len(extracted_text.strip()) < 80:
            try:
                from pdfminer.high_level import extract_text as pdfminer_extract
                m_text = pdfminer_extract(str(file_path)) or ""
                if len(m_text.strip()) > len(extracted_text.strip()):
                    extracted_text = m_text
            except Exception as e:
                logger.warning(f"pdfminer fallback failed for {file_path.name}: {e}")

        # Step 4: Scanned/Image PDF fallback via Gemini / PyTesseract OCR
        if len(extracted_text.strip()) < 80:
            logger.info(f"Digital text under threshold ({len(extracted_text.strip())} chars). Initiating OCR fallback.")
            ocr_text = cls._ocr_extract_pdf_images(file_path)
            if len(ocr_text.strip()) > len(extracted_text.strip()):
                extracted_text = ocr_text

        return cls.clean_and_sanitize_text(extracted_text)

    @classmethod
    def _ocr_extract_pdf_images(cls, file_path: Path) -> str:
        """Extract embedded image streams from PDF and run OCR via pytesseract, with Gemini multimodal fallback."""
        ocr_chunks = []
        try:
            import pytesseract
            import PyPDF2

            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page_idx, page in enumerate(reader.pages):
                    try:
                        # Extract images associated with this page
                        # PyPDF2 page.images can be a list or a dict depending on library version
                        images_to_process = []
                        if isinstance(page.images, dict):
                            images_to_process = list(page.images.values())
                        elif hasattr(page.images, "__iter__"):
                            images_to_process = list(page.images)

                        for img_file in images_to_process:
                            try:
                                img_data = getattr(img_file, "data", None)
                                if img_data:
                                    pil_img = Image.open(io.BytesIO(img_data))
                                    text = pytesseract.image_to_string(pil_img)
                                    if text.strip():
                                        ocr_chunks.append(text.strip())
                            except Exception as img_err:
                                logger.debug(f"pytesseract OCR failed for image: {img_err}")
                    except Exception as page_err:
                        logger.debug(f"Image extraction failed for page {page_idx}: {page_err}")

        except Exception as e:
            logger.warning(f"Local pytesseract extraction encountered an issue: {e}")

        # If pytesseract didn't return text (e.g. tesseract binary missing on Windows), use Gemini multimodal OCR
        combined = "\n".join(ocr_chunks).strip()
        if len(combined) < 50:
            gemini_ocr_text = cls._gemini_extract_document(file_path)
            if gemini_ocr_text and len(gemini_ocr_text.strip()) > len(combined):
                return gemini_ocr_text.strip()

        return combined

    @classmethod
    def _gemini_extract_document(cls, file_path: Path) -> str:
        """Extract text from scanned PDF or image document using Google Gemini multimodal vision."""
        try:
            from app.core.config import settings
            from google import genai
            from google.genai import types

            if not settings.GEMINI_API_KEY:
                logger.info("No GEMINI_API_KEY set; skipping Gemini multimodal OCR.")
                return ""

            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            prompt = (
                "Extract all plain text and content from this resume document accurately and faithfully. "
                "Include candidate name, contact details, work experience, education, skills, and summary. "
                "Output only the extracted text content without commentary."
            )
            models_to_try = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"]

            # Check if this PDF contains an embedded full-page image (scanned PDF)
            extracted_image_bytes = None
            if file_path.suffix.lower() == ".pdf":
                try:
                    import PyPDF2
                    with open(file_path, "rb") as f:
                        reader = PyPDF2.PdfReader(f)
                        for page in reader.pages:
                            if hasattr(page, "images") and len(page.images) > 0:
                                img = page.images[0]
                                if getattr(img, "data", None):
                                    extracted_image_bytes = img.data
                                    break
                except Exception as img_read_err:
                    logger.debug(f"Could not extract raw image for Gemini OCR: {img_read_err}")

            # If embedded image was found, send as image/jpeg (which processes fast and reliably)
            if extracted_image_bytes:
                for model_name in models_to_try:
                    try:
                        response = client.models.generate_content(
                            model=model_name,
                            contents=[
                                types.Part.from_bytes(data=extracted_image_bytes, mime_type="image/jpeg"),
                                prompt,
                            ],
                        )
                        if response and response.text and len(response.text.strip()) > 20:
                            logger.info(f"Gemini image OCR succeeded with {model_name} ({len(response.text)} chars).")
                            return response.text.strip()
                    except Exception as model_err:
                        logger.warning(f"Gemini image OCR with {model_name} failed: {model_err}")

            # Otherwise send the complete document bytes
            with open(file_path, "rb") as f:
                doc_bytes = f.read()

            mime_type = "application/pdf" if file_path.suffix.lower() == ".pdf" else "application/octet-stream"
            for model_name in models_to_try:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[
                            types.Part.from_bytes(data=doc_bytes, mime_type=mime_type),
                            prompt,
                        ],
                    )
                    if response and response.text and len(response.text.strip()) > 20:
                        logger.info(f"Gemini PDF OCR succeeded with {model_name} ({len(response.text)} chars).")
                        return response.text.strip()
                except Exception as model_err:
                    logger.warning(f"Gemini PDF OCR with {model_name} failed: {model_err}")

        except Exception as e:
            logger.error(f"Gemini multimodal OCR pipeline error: {e}")

        return ""

    @classmethod
    def extract_from_docx(cls, file_path: Path) -> str:
        """
        Extract text from DOCX files using python-docx with native XML parsing fallback.
        """
        # Primary attempt: python-docx library
        try:
            import docx
            doc = docx.Document(str(file_path))
            full_text = []

            # Paragraphs
            for para in doc.paragraphs:
                if para.text.strip():
                    full_text.append(para.text.strip())

            # Tables
            for table in doc.tables:
                for row in table.rows:
                    row_data = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_data:
                        full_text.append(" | ".join(row_data))

            result = "\n".join(full_text)
            if result.strip():
                return cls.clean_and_sanitize_text(result)
        except ImportError:
            logger.info("python-docx not installed, using native XML extraction")
        except Exception as e:
            logger.warning(f"python-docx failed for {file_path.name}: {e}")

        # Native zipfile + XML fallback (100% standard library, no external C dependencies)
        try:
            with zipfile.ZipFile(file_path, "r") as docx_zip:
                xml_content = docx_zip.read("word/document.xml")
                root = ET.fromstring(xml_content)
                # Word XML namespace for text elements: {http://schemas.openxmlformats.org/wordprocessingml/2006/main}t
                namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                text_nodes = [node.text for node in root.findall(".//w:t", namespaces) if node.text]
                return cls.clean_and_sanitize_text(" ".join(text_nodes))
        except Exception as e:
            logger.error(f"Native DOCX XML extraction failed: {e}")
            return ""

    @classmethod
    def extract_from_txt(cls, file_path: Path) -> str:
        """Extract text from plain text or Markdown files."""
        for encoding in ["utf-8", "utf-8-sig", "latin-1", "cp1252"]:
            try:
                with open(file_path, "r", encoding=encoding) as f:
                    return cls.clean_and_sanitize_text(f.read())
            except UnicodeDecodeError:
                continue
            except Exception as e:
                logger.error(f"Error reading text file: {e}")
                break
        return ""

    @classmethod
    def extract_text(cls, file_path: Path) -> str:
        """
        Universal entry point to extract and sanitize document text.
        Supports .pdf, .docx, .doc, .txt, .md.
        """
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        suffix = file_path.suffix.lower()

        if suffix == ".pdf":
            text = cls.extract_from_pdf(file_path)
        elif suffix in [".docx", ".doc"]:
            text = cls.extract_from_docx(file_path)
        elif suffix in [".txt", ".md"]:
            text = cls.extract_from_txt(file_path)
        else:
            raise ValueError(f"Unsupported file format: '{suffix}'. Supported: .pdf, .docx, .txt")

        if not text or len(text.strip()) == 0:
            logger.warning(f"No extractable text found in {file_path.name}. Falling back to filename metadata.")
            stem = file_path.stem.replace("_", " ").replace("-", " ")
            text = f"Candidate Profile Document: {stem}\nUploaded File: {file_path.name}\nResume details to be updated."

        return text
