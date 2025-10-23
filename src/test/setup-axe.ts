/**
 * Axe-core accessibility testing setup
 *
 * This file configures automated accessibility testing using axe-core.
 * It integrates with Vitest to check for WCAG 2.1 AA compliance.
 */

import { configureAxe } from 'vitest-axe';

// Configure axe-core with our project's accessibility rules
export const axe = configureAxe({
  // WCAG 2.1 Level AA compliance (required for most projects)
  rules: {
    // Ensure all regions have accessible labels
    'region': { enabled: true },

    // Ensure color contrast meets WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
    'color-contrast': { enabled: true },

    // Ensure all interactive elements are keyboard accessible
    'keyboard': { enabled: true },

    // Ensure focus indicators are visible
    'focus-order-semantics': { enabled: true },

    // Ensure all form elements have labels
    'label': { enabled: true },

    // Ensure all images have alt text
    'image-alt': { enabled: true },

    // Ensure heading levels are properly nested
    'heading-order': { enabled: true },

    // Ensure proper ARIA usage
    'aria-required-attr': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },

    // Ensure links have discernible text
    'link-name': { enabled: true },

    // Ensure buttons have accessible names
    'button-name': { enabled: true },

    // Ensure page has a title
    'document-title': { enabled: true },
  },
});

/**
 * Helper function to run accessibility checks on a component
 * Usage in tests:
 *
 * import { checkA11y } from '@/test/setup-axe';
 *
 * it('should have no accessibility violations', async () => {
 *   const { container } = render(<MyComponent />);
 *   await checkA11y(container);
 * });
 */
export async function checkA11y(container: Element, options?: any) {
  const results = await axe(container, options);
  expect(results).toHaveNoViolations();
}

/**
 * Helper to create detailed accessibility violation message
 */
export function formatViolations(violations: any[]) {
  return violations.map(violation => {
    return `
      Rule: ${violation.id}
      Impact: ${violation.impact}
      Description: ${violation.description}
      Help: ${violation.help}
      Nodes affected: ${violation.nodes.length}
      ${violation.nodes.map((node: any) => `
        - ${node.html}
          ${node.failureSummary}
      `).join('\n')}
    `;
  }).join('\n\n');
}
