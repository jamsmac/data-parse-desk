/**
 * Data Validation Utilities
 * Comprehensive validation for user inputs and data
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class DataValidator {
  /**
   * Validate email address
   */
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];

    if (!email || email.trim().length === 0) {
      errors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Invalid email format');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate URL
   */
  static validateURL(url: string): ValidationResult {
    const errors: string[] = [];

    if (!url || url.trim().length === 0) {
      errors.push('URL is required');
    } else {
      try {
        new URL(url);
      } catch {
        errors.push('Invalid URL format');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate phone number
   */
  static validatePhone(phone: string): ValidationResult {
    const errors: string[] = [];

    if (!phone || phone.trim().length === 0) {
      errors.push('Phone number is required');
    } else {
      // Basic phone validation (supports international formats)
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(phone)) {
        errors.push('Invalid phone number format');
      }
      if (phone.replace(/\D/g, '').length < 10) {
        errors.push('Phone number too short (minimum 10 digits)');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate number range
   */
  static validateNumberRange(
    value: number,
    min?: number,
    max?: number
  ): ValidationResult {
    const errors: string[] = [];

    if (typeof value !== 'number' || isNaN(value)) {
      errors.push('Value must be a valid number');
    } else {
      if (min !== undefined && value < min) {
        errors.push(`Value must be at least ${min}`);
      }
      if (max !== undefined && value > max) {
        errors.push(`Value must be at most ${max}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate string length
   */
  static validateLength(
    value: string,
    minLength?: number,
    maxLength?: number
  ): ValidationResult {
    const errors: string[] = [];

    if (minLength !== undefined && value.length < minLength) {
      errors.push(`Must be at least ${minLength} characters`);
    }
    if (maxLength !== undefined && value.length > maxLength) {
      errors.push(`Must be at most ${maxLength} characters`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate date
   */
  static validateDate(dateString: string): ValidationResult {
    const errors: string[] = [];

    if (!dateString || dateString.trim().length === 0) {
      errors.push('Date is required');
    } else {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        errors.push('Invalid date format');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate required field
   */
  static validateRequired(value: any, fieldName: string = 'Field'): ValidationResult {
    const errors: string[] = [];

    if (value === null || value === undefined) {
      errors.push(`${fieldName} is required`);
    } else if (typeof value === 'string' && value.trim().length === 0) {
      errors.push(`${fieldName} cannot be empty`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate file upload
   */
  static validateFile(
    file: File,
    options: {
      maxSize?: number; // in bytes
      allowedTypes?: string[];
      allowedExtensions?: string[];
    } = {}
  ): ValidationResult {
    const errors: string[] = [];

    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      const maxSizeMB = (options.maxSize / (1024 * 1024)).toFixed(2);
      errors.push(`File size exceeds ${maxSizeMB}MB`);
    }

    // Check MIME type
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    // Check file extension
    if (options.allowedExtensions) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !options.allowedExtensions.includes(extension)) {
        errors.push(`File extension .${extension} is not allowed`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize HTML to prevent XSS
   */
  static sanitizeHTML(html: string): string {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }

  /**
   * Validate and sanitize user input
   */
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove < and >
      .slice(0, 10000); // Limit length to prevent DoS
  }

  /**
   * Validate SQL identifier (table/column name)
   */
  static validateIdentifier(identifier: string): ValidationResult {
    const errors: string[] = [];

    if (!identifier || identifier.trim().length === 0) {
      errors.push('Identifier cannot be empty');
    } else {
      // Only allow alphanumeric, underscore, and hyphen
      const identifierRegex = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
      if (!identifierRegex.test(identifier)) {
        errors.push('Identifier must start with a letter and contain only letters, numbers, underscores, and hyphens');
      }
      if (identifier.length > 63) {
        errors.push('Identifier must be at most 63 characters');
      }

      // Check for SQL reserved words
      const reservedWords = [
        'select', 'insert', 'update', 'delete', 'drop', 'create', 'alter',
        'table', 'column', 'index', 'view', 'function', 'trigger',
      ];
      if (reservedWords.includes(identifier.toLowerCase())) {
        errors.push('Identifier cannot be a SQL reserved word');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Batch validation
   */
  static validateBatch(validators: Array<() => ValidationResult>): ValidationResult {
    const allErrors: string[] = [];

    for (const validator of validators) {
      const result = validator();
      if (!result.valid) {
        allErrors.push(...result.errors);
      }
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
    };
  }

  /**
   * Validate credit card number (basic Luhn algorithm)
   */
  static validateCreditCard(cardNumber: string): ValidationResult {
    const errors: string[] = [];
    const cleaned = cardNumber.replace(/\D/g, '');

    if (cleaned.length < 13 || cleaned.length > 19) {
      errors.push('Invalid card number length');
    } else {
      // Luhn algorithm
      let sum = 0;
      let isEven = false;

      for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned[i]);

        if (isEven) {
          digit *= 2;
          if (digit > 9) {
            digit -= 9;
          }
        }

        sum += digit;
        isEven = !isEven;
      }

      if (sum % 10 !== 0) {
        errors.push('Invalid card number (failed checksum)');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Type guard for validation result
 */
export function isValid(result: ValidationResult): boolean {
  return result.valid;
}

/**
 * Get first error message
 */
export function getFirstError(result: ValidationResult): string | null {
  return result.errors.length > 0 ? result.errors[0] : null;
}

/**
 * Combine multiple validation results
 */
export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap((r) => r.errors);
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}
