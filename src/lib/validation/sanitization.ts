import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

/**
 * Data sanitization utilities for SECiD platform
 * Provides comprehensive input sanitization and XSS protection
 */

/**
 * HTML sanitization configuration
 */
export const SanitizationConfig = {
  // Allowed HTML tags for rich text content
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    'ol',
    'ul',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'code',
    'pre',
    'a',
    'img',
  ],

  // Allowed attributes
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    blockquote: ['cite'],
    code: ['class'],
    pre: ['class'],
  },

  // URL schemes allowed in links
  allowedSchemes: ['http', 'https', 'mailto'],

  // Maximum string lengths for different content types
  maxLengths: {
    title: 200,
    description: 5000,
    bio: 2000,
    comment: 1000,
    message: 2000,
    name: 100,
    email: 255,
    url: 2048,
    phone: 20,
  },
} as const;

/**
 * Sanitize HTML content for safe display
 */
export function sanitizeHtml(
  html: string,
  options: {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    stripTags?: boolean;
  } = {}
): string {
  const {
    allowedTags = SanitizationConfig.allowedTags,
    allowedAttributes = SanitizationConfig.allowedAttributes,
    stripTags = false,
  } = options;

  if (stripTags) {
    // Strip all HTML tags
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: Object.values(allowedAttributes).flat(),
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ADD_ATTR: ['target'],
    FORBID_ATTR: ['style', 'onclick', 'onerror', 'onload'],
    FORBID_TAGS: [
      'script',
      'object',
      'embed',
      'form',
      'input',
      'textarea',
      'select',
      'button',
    ],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    WHOLE_DOCUMENT: false,
  });
}

/**
 * Sanitize plain text input
 */
export function sanitizeText(
  text: string,
  options: {
    maxLength?: number;
    allowNewlines?: boolean;
    allowSpecialChars?: boolean;
    trimWhitespace?: boolean;
  } = {}
): string {
  const {
    maxLength = SanitizationConfig.maxLengths.description,
    allowNewlines = true,
    allowSpecialChars = true,
    trimWhitespace = true,
  } = options;

  let sanitized = text;

  // Remove null bytes and other control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Handle newlines
  if (!allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]/g, ' ');
  }

  // Remove or escape special characters if not allowed
  if (!allowSpecialChars) {
    sanitized = sanitized.replace(/[<>'"&]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      };
      return entities[char] || char;
    });
  }

  // Trim whitespace
  if (trimWhitespace) {
    sanitized = sanitized.trim();
    // Replace multiple spaces with single space
    sanitized = sanitized.replace(/\s+/g, ' ');
  }

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/[^\w@.\-+]/g, ''); // Only allow word chars, @, ., -, +
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string {
  const sanitized = url.trim();

  // Check if URL starts with allowed scheme
  const allowedSchemes = SanitizationConfig.allowedSchemes;
  const hasValidScheme = allowedSchemes.some((scheme) =>
    sanitized.toLowerCase().startsWith(`${scheme}:`)
  );

  if (!hasValidScheme) {
    // Prepend https:// if no scheme is present and it looks like a URL
    if (sanitized.includes('.') && !sanitized.includes(' ')) {
      return `https://${sanitized}`;
    }
    return '';
  }

  return sanitized;
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  return phone
    .trim()
    .replace(/[^\d+\-\s\(\)]/g, '') // Only allow digits, +, -, spaces, parentheses
    .substring(0, SanitizationConfig.maxLengths.phone);
}

/**
 * Sanitize filename for uploads
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and other dangerous characters
  let sanitized = filename.replace(/[\/\\:*?"<>|]/g, '');

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\.\s]+|[\.\s]+$/g, '');

  // Limit length
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    const ext = sanitized.split('').pop() || '';
    const name = sanitized.substring(0, maxLength - ext.length - 1);
    sanitized = `${name}.${ext}`;
  }

  return sanitized || 'unnamed';
}

/**
 * Sanitize SQL-like injection attempts in search queries
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[';--]/g, '') // Remove SQL injection patterns
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 255); // Limit length
}

/**
 * Sanitize user-generated slug (URL-friendly string)
 */
export function sanitizeSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(
  obj: any,
  options: {
    sanitizeHtml?: boolean;
    sanitizeUrls?: boolean;
    maxDepth?: number;
  } = {}
): any {
  const {
    sanitizeHtml: shouldSanitizeHtml = true,
    sanitizeUrls = true,
    maxDepth = 10,
  } = options;

  if (maxDepth <= 0) {
    return obj;
  }

  if (typeof obj === 'string') {
    let sanitized = sanitizeText(obj);

    // Additional sanitization based on field patterns
    if (shouldSanitizeHtml && (obj.includes('<') || obj.includes('>'))) {
      sanitized = sanitizeHtml(sanitized);
    }

    if (sanitizeUrls && (obj.includes('http') || obj.includes('www.'))) {
      // This is a simple check - more sophisticated URL detection could be added
      if (obj.match(/^https?:\/\//)) {
        sanitized = sanitizeUrl(obj);
      }
    }

    return sanitized;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      sanitizeObject(item, { ...options, maxDepth: maxDepth - 1 })
    );
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key as well
      const sanitizedKey = sanitizeText(key, {
        maxLength: 100,
        allowSpecialChars: false,
      });
      sanitized[sanitizedKey] = sanitizeObject(value, {
        ...options,
        maxDepth: maxDepth - 1,
      });
    }
    return sanitized;
  }

  return obj;
}

/**
 * Content sanitization middleware for forms
 */
export function createSanitizationSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  options: {
    sanitizeHtml?: boolean;
    sanitizeUrls?: boolean;
    stripHtml?: boolean;
  } = {}
): z.ZodObject<T> {
  const {
    sanitizeHtml = true,
    sanitizeUrls = true,
    stripHtml = false,
  } = options;

  return schema.transform((data) => {
    const sanitized = sanitizeObject(data, {
      sanitizeHtml: sanitizeHtml && !stripHtml,
      sanitizeUrls,
    });

    // If we want to strip HTML completely, do it after initial sanitization
    if (stripHtml) {
      return sanitizeObject(sanitized, { sanitizeHtml: false });
    }

    return sanitized;
  });
}

/**
 * XSS prevention utility
 */
export function preventXSS(input: string): string {
  // Encode dangerous characters
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * CSRF token sanitization
 */
export function sanitizeCSRFToken(token: string): string {
  // CSRF tokens should only contain alphanumeric characters and hyphens
  return token.replace(/[^a-zA-Z0-9\-]/g, '').substring(0, 100);
}

/**
 * Database input sanitization for NoSQL injection prevention
 */
export function sanitizeForDatabase(input: any): any {
  if (typeof input === 'string') {
    // Remove MongoDB operators and other potentially dangerous patterns
    return input.replace(/^\$/, '').replace(/\./g, '_');
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeForDatabase);
  }

  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      // Sanitize keys to prevent NoSQL injection
      const sanitizedKey = key.replace(/^\$/, '').replace(/\./g, '_');
      sanitized[sanitizedKey] = sanitizeForDatabase(value);
    }
    return sanitized;
  }

  return input;
}

/**
 * Rate limiting key sanitization
 */
export function sanitizeRateLimitKey(key: string): string {
  return key
    .replace(/[^\w:\-\.]/g, '') // Only allow word chars, colons, hyphens, dots
    .substring(0, 100); // Limit length
}

/**
 * Export sanitization constants
 */
export { SanitizationConfig };
