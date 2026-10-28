import re
from typing import Dict, Any, List, Optional
from app.utils.constants import STANDARD_TECH_SKILLS, SKILL_ALIASES
from app.utils.logger import logger


class ResumeParserService:
    """
    NLP and Heuristic Resume Parser for information extraction:
    - Contact Info (email, phone, LinkedIn, GitHub, websites)
    - Technical & Professional Skills
    - Educational qualifications & degree credentials
    - Experience history & years estimate
    - Section segmentation
    """

    @classmethod
    def extract_contact_info(cls, text: str) -> Dict[str, Any]:
        """Extract email addresses, phone numbers, and web profiles."""
        # Email extraction
        email_pattern = r"\b[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\b"
        emails = list(set(re.findall(email_pattern, text)))

        # Phone extraction (matches domestic & international formats)
        phone_pattern = r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
        phones = list(set(re.findall(phone_pattern, text)))

        # Links extraction
        linkedin_pattern = r"(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+"
        linkedin_links = list(set(re.findall(linkedin_pattern, text, re.IGNORECASE)))

        github_pattern = r"(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+"
        github_links = list(set(re.findall(github_pattern, text, re.IGNORECASE)))

        return {
            "emails": emails,
            "phones": phones,
            "linkedin": linkedin_links[0] if linkedin_links else None,
            "github": github_links[0] if github_links else None,
        }

    @classmethod
    def extract_skills(cls, text: str) -> List[str]:
        """
        Extract technical, creative, and professional competencies matching the skills catalog,
        as well as dynamic extraction from formatted skills and tools sections.
        Prevents false positive matching on single letters (e.g. 'c' matching 'H.S.C').
        Normalizes aliases to standard canonical naming.
        """
        text_lower = text.lower()
        found_skills = set()

        # 1. Catalog-based lookup across all domains
        for skill in STANDARD_TECH_SKILLS:
            # Prevent false positive single-letter 'c' from matching abbreviations like H.S.C, Section C, (c)
            if skill in ["c", "c programming", "c language"]:
                pattern = r"(?:^|[\s,;|/])c(?:\s*,\s*c\+\+|\s*/\s*c\+\+|\s+language|\s+programming)(?:[\s,;|/]|$)"
            elif skill in ["c++", "c#", ".net core"]:
                pattern = rf"(?:^|[\s,;|/]){re.escape(skill)}(?:[\s,;|/]|$)"
            else:
                pattern = rf"\b{re.escape(skill)}\b"

            if re.search(pattern, text_lower):
                normalized = SKILL_ALIASES.get(skill)
                if not normalized:
                    normalized = skill.upper() if len(skill) <= 3 else skill.title()
                found_skills.add(normalized)

        # 2. Dynamic Section Extraction for Tools & Competencies (Design Tools:, Skills:, Expertise:, etc.)
        skill_header_patterns = [
            r"(?:design tools?|software|tools? & technologies|tools?|technical skills?|key skills?|core competencies?|skills?|design expertise|expertise|proficiencies?)\s*:\s*([^\n\r]+)",
        ]
        noise_words = {"etc", "and", "or", "in", "of", "with", "all", "good", "knowledge", "expert", "proficient", "basic", "strong"}

        for pat in skill_header_patterns:
            matches = re.finditer(pat, text, re.IGNORECASE)
            for m in matches:
                content = m.group(1).strip()
                # Split on commas, semicolons, bullets, slashes
                items = re.split(r"[,;•|/]+", content)
                for item in items:
                    cleaned_item = item.strip()
                    cleaned_item = re.sub(r"^\W+|\W+$", "", cleaned_item)
                    if 2 <= len(cleaned_item) <= 35 and cleaned_item.lower() not in noise_words:
                        # Check if matches alias
                        item_lower = cleaned_item.lower()
                        normalized = SKILL_ALIASES.get(item_lower) or cleaned_item
                        # Title case if not acronym
                        if not any(c.isupper() for c in normalized[1:]):
                            normalized = normalized.title()
                        found_skills.add(normalized)

        # Filter out isolated single letter false positives
        cleaned_final = {s for s in found_skills if len(s) > 1 and s.lower() not in ["c", "etc", "and"]}
        return sorted(list(cleaned_final))

    @classmethod
    def extract_education(cls, text: str) -> List[Dict[str, Any]]:
        """Identify academic degree levels, institutions, and graduation years."""
        text_lower = text.lower()
        education_records = []

        degree_patterns = [
            (r"\b(?:ph\.?d|doctorate|doctor of philosophy)\b", "Doctor of Philosophy (PhD)"),
            (r"\b(?:master(?:'?s)?|m\.?s|m\.?sc|m\.?tech|mba)\b", "Master's Degree"),
            (r"\b(?:bachelor(?:'?s)?|b\.?s|b\.?sc|b\.?tech|b\.?e)\b", "Bachelor's Degree"),
            (r"\b(?:associate(?:'?s)?|diploma)\b", "Associate Degree / Diploma"),
        ]

        # Graduation year detection (e.g., 2018 - 2022, Class of 2021)
        year_matches = re.findall(r"\b(19\d{2}|20[0-2]\d)\b", text)
        grad_years = sorted(list(set(year_matches)))

        for pattern, degree_name in degree_patterns:
            if re.search(pattern, text_lower):
                education_records.append({
                    "degree": degree_name,
                    "detected": True,
                })

        return education_records

    @classmethod
    def estimate_experience_years(cls, text: str) -> float:
        """
        Calculates estimated years of professional experience from mentions and date spans.
        """
        text_lower = text.lower()

        # Direct explicit mentions like '5+ years of experience', '3 years experience'
        explicit_matches = re.findall(
            r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:experience|exp)",
            text_lower,
        )
        if explicit_matches:
            try:
                numbers = [float(m) for m in explicit_matches]
                return max(numbers)
            except ValueError:
                pass

        # Year range detection in experience sections: (e.g., 2019 - 2023 or 2020 - Present)
        year_ranges = re.findall(
            r"\b(20\d{2})\s*[-–—to]+\s*(20\d{2}|present|current)\b",
            text_lower,
        )
        total_span = 0.0
        current_year = 2026

        for start_str, end_str in year_ranges:
            try:
                start_yr = int(start_str)
                end_yr = current_year if end_str in ["present", "current"] else int(end_str)
                diff = end_yr - start_yr
                if 0 <= diff <= 30:
                    total_span = max(total_span, float(diff))
            except ValueError:
                continue

        return round(max(total_span, 1.0), 1)

    @classmethod
    def segment_sections(cls, text: str) -> Dict[str, str]:
        """
        Segments resume text into structural standard sections.
        """
        sections = {
            "summary": "",
            "experience": "",
            "education": "",
            "skills": "",
            "projects": "",
            "certifications": "",
        }

        # Common headings keywords
        heading_patterns = {
            "summary": r"(?:summary|profile|about me|objective)",
            "experience": r"(?:work experience|experience|employment history|work history)",
            "education": r"(?:education|academic background|qualifications)",
            "skills": r"(?:skills|technical skills|technologies|competencies)",
            "projects": r"(?:projects|personal projects|key projects)",
            "certifications": r"(?:certifications|certificates|licenses)",
        }

        lines = text.split("\n")
        current_section = "summary"
        section_buffers = {k: [] for k in sections}

        for line in lines:
            line_stripped = line.strip().lower()
            # If line is short and looks like a header
            if len(line_stripped) < 40:
                matched_section = None
                for sec, pattern in heading_patterns.items():
                    if re.match(rf"^{pattern}:?$", line_stripped):
                        matched_section = sec
                        break
                if matched_section:
                    current_section = matched_section
                    continue

            section_buffers[current_section].append(line)

        for sec in sections:
            sections[sec] = "\n".join(section_buffers[sec]).strip()

        return sections

    @classmethod
    def calculate_base_ats_score(cls, parsed_data: Dict[str, Any], raw_text: str) -> float:
        """
        Computes baseline ATS readability score (0 - 100%) based on structural completeness.
        """
        score = 25.0  # Base for parsable text

        # Contact Completeness (max 20 pts)
        contact = parsed_data.get("contact", {})
        if contact.get("emails"):
            score += 10.0
        if contact.get("phones"):
            score += 5.0
        if contact.get("linkedin") or contact.get("github"):
            score += 5.0

        # Skills Density (max 25 pts)
        skills_count = len(parsed_data.get("skills", []))
        if skills_count >= 8:
            score += 25.0
        elif skills_count >= 5:
            score += 18.0
        elif skills_count >= 2:
            score += 10.0

        # Education & Experience (max 20 pts)
        if parsed_data.get("education"):
            score += 10.0
        if parsed_data.get("experience_years", 0) > 0:
            score += 10.0

        # Content Length & Section Organization (max 10 pts)
        word_count = len(raw_text.split())
        if 200 <= word_count <= 1200:
            score += 10.0
        elif word_count > 100:
            score += 5.0

        return round(min(score, 100.0), 1)

    @classmethod
    def parse_document_text(cls, raw_text: str) -> Dict[str, Any]:
        """
        Master parser taking raw text and structuring complete resume metadata.
        """
        contact = cls.extract_contact_info(raw_text)
        skills = cls.extract_skills(raw_text)
        education = cls.extract_education(raw_text)
        exp_years = cls.estimate_experience_years(raw_text)
        sections = cls.segment_sections(raw_text)

        parsed_data = {
            "contact": contact,
            "skills": skills,
            "education": education,
            "experience_years": exp_years,
            "sections_found": [k for k, v in sections.items() if v],
            "word_count": len(raw_text.split()),
        }

        parsed_data["ats_score"] = cls.calculate_base_ats_score(parsed_data, raw_text)
        return parsed_data
