from typing import Optional

LANGUAGE_NAMES = {
    "en": "English",
    "bn": "Bengali (বাংলা)",
    "hi": "Hindi (हिन्दी)",
    "ar": "Arabic (العربية)",
    "es": "Spanish (Español)",
    "fr": "French (Français)",
    "de": "German (Deutsch)",
    "zh": "Mandarin Chinese (中文)",
    "ja": "Japanese (日本語)",
    "ur": "Urdu (اردو)",
}


def get_ai_localization_directive(target_language: Optional[str] = "en") -> str:
    """
    Returns the strict Gemini prompt directive for multi-language response generation.
    Enforces that explanations, commentary, recommendations, and prose are formulated
    in target_language while preserving programming language syntax, keywords, and code tokens.
    """
    if not target_language or target_language.lower() in ["en", "english"]:
        return ""

    lang_code = target_language.lower().strip()
    lang_name = LANGUAGE_NAMES.get(lang_code, target_language)

    return (
        f"\n\nCRITICAL LOCALIZATION DIRECTIVE:\n"
        f"Translate and formulate all explanations, recommendations, and feedback in '{lang_name}'. "
        f"Keep programming syntax, code snippets, and standard API identifiers in original English."
    )
