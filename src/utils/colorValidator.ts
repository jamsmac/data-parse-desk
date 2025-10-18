/**
 * Color validation utility to prevent CSS injection attacks
 * Validates color values against safe patterns
 */

/**
 * Validates if a color string is safe to use in CSS
 * @param color - The color string to validate
 * @returns The validated color string
 * @throws Error if the color is invalid or potentially malicious
 */
export function validateColor(color: string | undefined): string | undefined {
  if (!color) return undefined;

  // Remove whitespace for validation
  const trimmedColor = color.trim();

  // Define safe color patterns
  const safeColorPatterns = [
    // Hex colors: #RGB, #RRGGBB, #RRGGBBAA
    /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/,

    // RGB/RGBA: rgb(r, g, b), rgba(r, g, b, a)
    /^rgba?\(\s*(\d{1,3}\s*,\s*){2}\d{1,3}\s*(,\s*(0|1|0?\.\d+))?\s*\)$/,

    // HSL/HSLA: hsl(h, s%, l%), hsla(h, s%, l%, a)
    /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(,\s*(0|1|0?\.\d+))?\s*\)$/,

    // CSS named colors (common ones)
    /^(red|blue|green|yellow|orange|purple|pink|black|white|gray|grey|brown|cyan|magenta|lime|indigo|violet|turquoise|gold|silver|navy|teal|olive|maroon|aqua|fuchsia|transparent|currentColor)$/i,

    // CSS system colors
    /^(inherit|initial|unset|revert|revert-layer)$/i,

    // Tailwind/Modern CSS variables
    /^var\(--[a-zA-Z0-9-]+\)$/,
  ];

  // Check if color matches any safe pattern
  const isValid = safeColorPatterns.some(pattern => pattern.test(trimmedColor));

  if (!isValid) {
    console.error(`Invalid color value detected: ${color}`);
    throw new Error(`Invalid color value: "${color}". Only valid CSS color formats are allowed.`);
  }

  // Additional security checks
  const dangerousPatterns = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /on\w+=/i,
    /<script/i,
    /expression\(/i,
    /import\(/i,
    /url\(/i,
    /@import/i,
  ];

  const containsDangerousContent = dangerousPatterns.some(pattern =>
    pattern.test(trimmedColor)
  );

  if (containsDangerousContent) {
    console.error(`Potentially malicious color value detected: ${color}`);
    throw new Error('Invalid color value: potentially malicious content detected');
  }

  return trimmedColor;
}

/**
 * Sanitizes a color value, returning a fallback if invalid
 * @param color - The color string to sanitize
 * @param fallback - The fallback color if validation fails (default: #000000)
 * @returns A safe color value
 */
export function sanitizeColor(color: string | undefined, fallback: string = '#000000'): string {
  try {
    return validateColor(color) || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Validates multiple colors at once
 * @param colors - Array of colors to validate
 * @returns Array of validated colors
 * @throws Error if any color is invalid
 */
export function validateColors(colors: (string | undefined)[]): (string | undefined)[] {
  return colors.map(color => validateColor(color));
}

/**
 * Creates a CSS color variable declaration safely
 * @param name - The CSS variable name (without --)
 * @param color - The color value
 * @returns A safe CSS variable declaration or empty string if invalid
 */
export function createSafeCSSVariable(name: string, color: string | undefined): string {
  if (!color) return '';

  try {
    const validColor = validateColor(color);
    // Sanitize the variable name too
    const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '');
    return validColor ? `--color-${safeName}: ${validColor};` : '';
  } catch {
    return '';
  }
}