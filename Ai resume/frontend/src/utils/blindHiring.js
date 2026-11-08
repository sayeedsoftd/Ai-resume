/**
 * Blind Hiring & Anti-Bias Sanitization Utility
 * Provides deterministic anonymization of candidate profiles, resumes, and demographics
 * to eliminate unconscious bias during candidate screening and evaluation.
 */

/**
 * Generate a deterministic anonymous candidate identifier (e.g. "Candidate #A-104")
 * based on candidate application ID or user ID.
 */
export function getAnonymousCandidateId(id, userId) {
  const seed = Number(userId || id || 1);
  const letterCode = String.fromCharCode(65 + (Math.abs(seed) % 26));
  const numericCode = String(Math.abs(seed)).padStart(3, '0');
  return `Candidate #${letterCode}-${numericCode}`;
}

/**
 * Mask candidate personal identifiers based on blind mode flag.
 */
export function maskCandidateDetails(candidate, isBlindMode = true) {
  if (!candidate) return {};

  if (!isBlindMode) {
    return {
      displayName: candidate.user?.full_name || candidate.full_name || 'Candidate',
      email: candidate.user?.email || candidate.email || '',
      phone: candidate.user?.phone || candidate.phone || 'Not provided',
      location: candidate.user?.address || candidate.location || 'Not provided',
      institution: candidate.institution || '',
      isAnonymized: false,
      identifier: candidate.id,
    };
  }

  const anonymousId = getAnonymousCandidateId(candidate.id, candidate.user_id || candidate.user?.id);

  return {
    displayName: anonymousId,
    email: 'Hidden in Anti-Bias Mode',
    phone: 'Hidden in Anti-Bias Mode',
    location: 'Demographics Protected',
    institution: 'Accredited University',
    isAnonymized: true,
    identifier: anonymousId,
  };
}

/**
 * Redact Personally Identifiable Information (PII) from free-form text.
 * Redacts email addresses, phone numbers, and optional candidate names.
 */
export function redactPIIFromText(text, candidateName = null, isBlindMode = true) {
  if (!text || typeof text !== 'string' || !isBlindMode) return text || '';

  let sanitized = text;

  // Redact Emails
  sanitized = sanitized.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
    '[Protected Email]'
  );

  // Redact Phone numbers (+880..., (555)..., 123-456-7890)
  sanitized = sanitized.replace(
    /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g,
    '[Protected Phone]'
  );

  // Redact Candidate Name if provided
  if (candidateName && typeof candidateName === 'string' && candidateName.trim().length > 2) {
    const nameParts = candidateName.trim().split(/\s+/).filter((p) => p.length > 2);
    for (const part of nameParts) {
      const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      sanitized = sanitized.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '[Candidate]');
    }
  }

  // Redact specific university names with generic term
  sanitized = sanitized.replace(
    /\b(?:University of [A-Za-z\s]+|[A-Za-z\s]+ University|[A-Za-z\s]+ Institute of Technology|[A-Za-z\s]+ College)\b/gi,
    'Accredited University'
  );

  return sanitized;
}

/**
 * Sanitize parsed resume object for anti-bias mode.
 * Masks university names, redacts personal summary PII, and preserves skills and work history.
 */
export function sanitizeParsedResume(parsedData, candidateName = null, isBlindMode = true) {
  if (!parsedData || typeof parsedData !== 'object' || !isBlindMode) {
    return parsedData || {};
  }

  const sanitized = JSON.parse(JSON.stringify(parsedData));

  // 1. Mask Education Institutions
  if (Array.isArray(sanitized.education)) {
    sanitized.education = sanitized.education.map((edu) => ({
      ...edu,
      institution: 'Accredited University',
      school: 'Accredited University',
      university: 'Accredited University',
    }));
  }

  // 2. Redact Summary
  if (sanitized.summary && typeof sanitized.summary === 'string') {
    sanitized.summary = redactPIIFromText(sanitized.summary, candidateName, true);
  }

  // 3. Mask Contact Info
  if (sanitized.contact_info) {
    sanitized.contact_info = {
      phone: 'Hidden in Anti-Bias Mode',
      email: 'Hidden in Anti-Bias Mode',
      address: 'Location Redacted (Anti-Bias Mode)',
      linkedin: sanitized.contact_info.linkedin ? '[Protected Portfolio]' : undefined,
      github: sanitized.contact_info.github ? '[Protected Code Repository]' : undefined,
    };
  }

  return sanitized;
}

/**
 * LocalStorage Helpers for persistent Blind Hiring preference
 */
export function getSavedBlindHiringPreference(defaultValue = true) {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const saved = localStorage.getItem('blind_hiring_active');
    return saved !== null ? saved === 'true' : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function saveBlindHiringPreference(value) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('blind_hiring_active', String(value));
  } catch (err) {
    console.warn('Could not save blind hiring preference', err);
  }
}
