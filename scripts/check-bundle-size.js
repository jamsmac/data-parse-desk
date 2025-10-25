#!/usr/bin/env node
/**
 * Bundle Size Checker
 *
 * Monitors bundle sizes and fails if they exceed limits
 * Documentation: PERFORMANCE_AUTOMATION.md Section 3.2
 *
 * Usage: node scripts/check-bundle-size.js
 */

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

// Bundle size limits (gzipped, in KB)
const BUNDLE_LIMITS = {
  'index': 30,           // Main entry point
  'react-vendor': 75,    // React + React DOM
  'supabase-vendor': 40, // Supabase client
  'chart-vendor': 125,   // Chart.js + dependencies
  'xlsx-parser': 260,    // XLSX parser (already optimized)
};

const TOTAL_LIMIT = 600; // Total bundle size limit (KB)

const distPath = path.join(__dirname, '../dist/assets');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function formatSize(bytes) {
  return (bytes / 1024).toFixed(2) + ' KB';
}

function colorize(text, color) {
  return colors[color] + text + colors.reset;
}

function checkBundleSize() {
  console.log('\n' + colorize('📦 Bundle Size Check', 'cyan'));
  console.log(colorize('='.repeat(60), 'cyan') + '\n');

  // Check if dist directory exists
  if (!fs.existsSync(distPath)) {
    console.error(colorize('❌ Error: dist/assets directory not found', 'red'));
    console.log(colorize('Run `npm run build` first', 'yellow') + '\n');
    process.exit(1);
  }

  const files = fs.readdirSync(distPath);
  const jsFiles = files.filter(file => file.endsWith('.js'));

  if (jsFiles.length === 0) {
    console.error(colorize('❌ Error: No JS files found in dist/assets', 'red'));
    process.exit(1);
  }

  let hasErrors = false;
  let totalSize = 0;
  const results = [];

  // Check each bundle
  jsFiles.forEach(file => {
    const filePath = path.join(distPath, file);
    const content = fs.readFileSync(filePath);
    const gzipped = gzipSync(content);
    const sizeKB = gzipped.length / 1024;
    totalSize += sizeKB;

    // Match against bundle limits
    let matched = false;
    for (const [name, limitKB] of Object.entries(BUNDLE_LIMITS)) {
      if (file.includes(name)) {
        matched = true;
        const percentage = ((sizeKB / limitKB) * 100).toFixed(1);
        const exceeds = sizeKB > limitKB;

        results.push({
          file,
          name,
          size: sizeKB,
          limit: limitKB,
          percentage,
          exceeds,
        });

        if (exceeds) {
          hasErrors = true;
        }
        break;
      }
    }

    if (!matched) {
      // Untracked bundle
      results.push({
        file,
        name: 'other',
        size: sizeKB,
        limit: null,
        percentage: null,
        exceeds: false,
      });
    }
  });

  // Sort results by size (largest first)
  results.sort((a, b) => b.size - a.size);

  // Print results
  console.log(colorize('Bundle Analysis:', 'blue'));
  console.log('');

  results.forEach(({ file, name, size, limit, percentage, exceeds }) => {
    const sizeStr = formatSize(size * 1024);
    const icon = exceeds ? '❌' : '✅';
    const status = exceeds ? colorize('EXCEEDED', 'red') : colorize('OK', 'green');

    if (limit) {
      const limitStr = formatSize(limit * 1024);
      const percentStr = colorize(`${percentage}%`, exceeds ? 'red' : 'green');
      console.log(`${icon} ${file}`);
      console.log(`   Size: ${sizeStr} / ${limitStr} (${percentStr}) ${status}`);
    } else {
      console.log(`${icon} ${file}`);
      console.log(`   Size: ${sizeStr} (untracked)`);
    }
    console.log('');
  });

  // Check total size
  console.log(colorize('─'.repeat(60), 'cyan'));
  const totalExceeds = totalSize > TOTAL_LIMIT;
  const totalIcon = totalExceeds ? '❌' : '✅';
  const totalStatus = totalExceeds
    ? colorize('EXCEEDED', 'red')
    : colorize('OK', 'green');
  const totalPercentage = ((totalSize / TOTAL_LIMIT) * 100).toFixed(1);

  console.log(`${totalIcon} Total Bundle Size: ${formatSize(totalSize * 1024)} / ${formatSize(TOTAL_LIMIT * 1024)}`);
  console.log(`   (${colorize(totalPercentage + '%', totalExceeds ? 'red' : 'green')} of budget) ${totalStatus}`);
  console.log('');

  if (totalExceeds) {
    hasErrors = true;
  }

  // Final result
  console.log(colorize('='.repeat(60), 'cyan'));
  if (hasErrors) {
    console.log(colorize('❌ Bundle size check FAILED', 'red'));
    console.log('');
    console.log(colorize('Recommendations:', 'yellow'));
    console.log('  • Review code splitting configuration in vite.config.ts');
    console.log('  • Check for duplicate dependencies');
    console.log('  • Consider lazy loading heavy components');
    console.log('  • Run: npm run analyze to visualize bundle composition');
    console.log('');
    process.exit(1);
  } else {
    console.log(colorize('✅ Bundle size check PASSED', 'green'));
    console.log('');
    console.log(colorize('Performance Budget Status:', 'cyan'));
    const remaining = TOTAL_LIMIT - totalSize;
    console.log(`  • ${formatSize(remaining * 1024)} remaining in budget`);
    console.log(`  • All chunks within limits`);
    console.log('');
    process.exit(0);
  }
}

// Run the check
try {
  checkBundleSize();
} catch (error) {
  console.error(colorize('❌ Unexpected error:', 'red'), error.message);
  process.exit(1);
}
