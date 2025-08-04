import { z } from 'zod';

/**
 * Validation utilities and common schemas for SECiD platform
 * Provides reusable validation functions and error handling
 */

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^(\+\d{1,3}[- ]?)?\d{10}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  strongPassword:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const;

/**
 * Common Zod schemas for reuse
 */
export const CommonSchemas = {
  /**
   * Email validation with proper regex
   */
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email is too long')
    .regex(ValidationPatterns.email, 'Invalid email format'),

  /**
   * Strong password validation
   */
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(
      ValidationPatterns.strongPassword,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),

  /**
   * Phone number validation
   */
  phone: z
    .string()
    .regex(ValidationPatterns.phone, 'Invalid phone number format')
    .optional(),

  /**
   * URL validation
   */
  url: z
    .string()
    .regex(ValidationPatterns.url, 'Invalid URL format')
    .optional(),

  /**
   * UUID validation
   */
  uuid: z.string().regex(ValidationPatterns.uuid, 'Invalid UUID format'),

  /**
   * Non-empty string with length limits
   */
  nonEmptyString: (minLength = 1, maxLength = 255) =>
    z
      .string()
      .min(minLength, `Must be at least ${minLength} characters`)
      .max(maxLength, `Must be no more than ${maxLength} characters`)
      .trim(),

  /**
   * Slug validation (URL-friendly string)
   */
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug is too long')
    .regex(
      ValidationPatterns.slug,
      'Slug must contain only lowercase letters, numbers, and hyphens'
    ),

  /**
   * Date validation
   */
  dateString: z.string().datetime('Invalid date format'),

  /**
   * File size validation (in bytes)
   */
  fileSize: (maxSize: number) =>
    z.number().max(maxSize, `File size must be less than ${maxSize} bytes`),

  /**
   * Array with length constraints
   */
  boundedArray: <T>(schema: z.ZodSchema<T>, minLength = 0, maxLength = 100) =>
    z
      .array(schema)
      .min(minLength, `Must have at least ${minLength} items`)
      .max(maxLength, `Must have no more than ${maxLength} items`),

  /**
   * Object ID validation
   */
  objectId: z.string().min(1, 'ID is required').max(50, 'ID is too long'),

  /**
   * Enum validation helper
   */
  enumValue: <T extends string>(values: readonly T[], errorMessage?: string) =>
    z.enum(values as [T, ...T[]], {
      errorMap: () => ({
        message: errorMessage || `Must be one of: ${values.join(', ')}`,
      }),
    }),

  /**
   * Rich text content validation
   */
  richText: z.string().max(10000, 'Content is too long').optional(),

  /**
   * HTML content validation (sanitized)
   */
  htmlContent: z.string().max(50000, 'HTML content is too long').optional(),
};

/**
 * Validation error types
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Format Zod errors into a more usable format
 */
export function formatZodErrors(error: z.ZodError): ValidationError[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err['message'],
    code: err['code'],
  }));
}

/**
 * Safe validation wrapper that returns a result object
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: formatZodErrors(error),
      };
    }

    return {
      success: false,
      errors: [
        {
          field: 'unknown',
          message: 'Unknown validation error',
          code: 'unknown',
        },
      ],
    };
  }
}

/**
 * Async validation wrapper
 */
export async function safeValidateAsync<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<ValidationResult<T>> {
  try {
    const result = await schema.parseAsync(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: formatZodErrors(error),
      };
    }

    return {
      success: false,
      errors: [
        {
          field: 'unknown',
          message: 'Unknown validation error',
          code: 'unknown',
        },
      ],
    };
  }
}

/**
 * Server-side validation with additional security checks
 */
export function validateServerInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  options: {
    stripUnknown?: boolean;
    maxDepth?: number;
  } = {}
): ValidationResult<T> {
  const { stripUnknown = true, maxDepth = 10 } = options;

  // Check for deeply nested objects (potential DoS attack)
  if (typeof data === 'object' && data !== null) {
    const depth = getObjectDepth(data);
    if (depth > maxDepth) {
      return {
        success: false,
        errors: [
          {
            field: 'root',
            message: 'Object nesting too deep',
            code: 'max_depth_exceeded',
          },
        ],
      };
    }
  }

  // Configure schema with security options
  const secureSchema = stripUnknown ? schema.strip() : schema;

  return safeValidate(secureSchema, data);
}

/**
 * Get the depth of nested objects
 */
function getObjectDepth(obj: any, depth = 0): number {
  if (depth > 20) return depth; // Prevent infinite recursion

  if (typeof obj !== 'object' || obj === null) {
    return depth;
  }

  if (Array.isArray(obj)) {
    return Math.max(
      depth,
      ...obj.map((item) => getObjectDepth(item, depth + 1))
    );
  }

  const values = Object.values(obj);
  if (values.length === 0) return depth;

  return Math.max(
    depth,
    ...values.map((value) => getObjectDepth(value, depth + 1))
  );
}

/**
 * Rate limiting validation
 */
export const RateLimitSchema = z.object({
  windowMs: z.number().min(1000).max(3600000), // 1 second to 1 hour
  maxRequests: z.number().min(1).max(1000),
  skipSuccessfulRequests: z.boolean().default(false),
  skipFailedRequests: z.boolean().default(false),
});

/**
 * File upload validation
 */
export const FileUploadSchema = z.object({
  name: CommonSchemas.nonEmptyString(1, 255),
  size: z
    .number()
    .min(1)
    .max(50 * 1024 * 1024), // 50MB max
  type: z.string().min(1),
  lastModified: z.number().optional(),
});

/**
 * Pagination validation
 */
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: CommonSchemas.nonEmptyString(1, 50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Search query validation
 */
export const SearchQuerySchema = z.object({
  q: CommonSchemas.nonEmptyString(1, 255),
  filters: z.record(z.string()).optional(),
  facets: z.array(z.string()).max(10).optional(),
});

export type PaginationParams = z.infer<typeof PaginationSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type FileUpload = z.infer<typeof FileUploadSchema>;
