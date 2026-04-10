import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML input to prevent XSS attacks while allowing safe rich text.
 * Trims the string to a maximum length.
 * 
 * @param html The raw HTML string
 * @param maxLength The maximum allowed length of the sanitized string
 * @returns Safely sanitized HTML string
 */
export const sanitizeHtml = (html: string, maxLength: number = 5000): string => {
    if (!html) return '';
    const clean = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span', 'div', 'u', 's', 'pre', 'code', 'blockquote', 'h1', 'h2', 'h3'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
    });
    return clean.substring(0, Math.max(0, maxLength)).trim();
};

/**
 * Strips all HTML tags to return plain text, and trims it to a maximum length.
 * Useful for inputs like Task names, Folder names, etc where we expect 0 HTML.
 * 
 * @param text The raw text string
 * @param maxLength The maximum allowed length of the string
 * @returns Safe plain text string
 */
export const sanitizeText = (text: string, maxLength: number = 500): string => {
    if (!text) return '';
    const clean = DOMPurify.sanitize(text, {
        ALLOWED_TAGS: [], // No HTML tags allowed
        ALLOWED_ATTR: [], // No attributes allowed
    });
    // Further strip any HTML enitity encoding leftovers if needed, but dompurify is usually enough
    return clean.substring(0, Math.max(0, maxLength)).trim();
};

/**
 * Ensures an object property is a string and sanitizes it to plain text.
 */
export const sanitizeObjectStringProperty = (val: any, maxLength: number = 500): string => {
    if (typeof val !== 'string') return '';
    return sanitizeText(val, maxLength);
};
