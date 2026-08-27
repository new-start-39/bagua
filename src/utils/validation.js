const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

/**
 * Checks the practical address shape required by authentication forms.
 * @param {unknown} value Candidate email address.
 * @returns {boolean} Whether the trimmed value has a valid email shape.
 */
export const isValidEmail = (value) => EMAIL_PATTERN.test(String(value ?? '').trim())
