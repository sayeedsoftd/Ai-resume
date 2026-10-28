import io
import re
from pathlib import Path
from typing import Dict, Any, List
from pdfminer.high_level import extract_text as pdfminer_extract_text
from app.utils.constants import STANDARD_TECH_SKILLS
from app.utils.logger import logger


class ResumeParserService:
    @staticmethod
    def extract_text_from_file(file_path: Path) -> str:
        """Extract plain text from PDF or text file."""
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        suffix = file_path.suffix.lower()
        if suffix == ".pdf":
            try:
                text = pdfminer_extract_text(str(file_path))
                return text.strip()
            except Exception as e:
                logger.error(f"Error extracting PDF text via pdfminer: {e}")
                # Fallback to PyPDF2
                import PyPDF2
                text_chunks = []
                with open(file_path, "rb") as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        extracted = page.extract_text()
                        if extracted:
                            text_chunks.append(extracted)
                return "\n".join(text_chunks).strip()
        elif suffix in [".txt", ".md"]:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read().strip()
        else:
            return ""

    @classmethod
    def parse_resume_content(cls, raw_text: str) -> Dict[str, Any]:
        """
        Analyze extracted resume text and structure:
        - emails & phone numbers
        - detected technical skills
        - years of experience estimate
        - education mentions
        - ATS benchmark score
        """
        text_lower = raw_text.lower()

        # Extract Emails
        emails = re.findall(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", raw_text)

        # Extract Phone numbers (international & local patterns)
        phones = re.findall(
            r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}",
            raw_text,
        )

        # Extract Skills based on catalog
        found_skills = []
        for skill in STANDARD_TECH_SKILLS:
            # Word boundary regex to avoid substring mismatch (e.g., 'c' in 'react')
            pattern = rf"\b{re.escape(skill)}\b"
            if re.search(pattern, text_lower):
                found_skills.append(skill.title() if len(skill) > 3 else skill.upper())

        # Estimate Years of Experience
        exp_matches = re.findall(r"(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+experience", text_lower)
        estimated_years = float(max([int(y) for y in exp_matches])) if exp_matches else 1.0

        # Education degree keywords
        degrees = []
        degree_keywords = ["bachelor", "master", "phd", "b.sc", "m.sc", "b.tech", "m.tech", "associate"]
        for deg in degree_keywords:
            if deg in text_lower:
                degrees.append(deg.title())

        # ATS Score calculation (Heuristic based on completeness)
        score = 40.0  # Base for having a parsed resume
        if emails:
            score += 10.0
        if phones:
            score += 10.0
        if len(found_skills) >= 5:
            score += 20.0
        elif len(found_skills) >= 2:
            score += 10.0
        if degrees:
            score += 10.0
        if len(raw_text.split()) > 200:
            score += 10.0

        ats_score = min(score, 100.0)

        return {
            "contact": {
                "emails": list(set(emails)),
                "phones": list(set(phones)),
            },
            "skills": sorted(list(set(found_skills))),
            "estimated_years_experience": estimated_years,
            "education_detected": list(set(degrees)),
            "ats_score": round(ats_score, 1),
            "word_count": len(raw_text.split()),
        }
