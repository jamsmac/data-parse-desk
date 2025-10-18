/**
 * Performance Metrics Collection
 * VHData Platform Production Audit
 */

import * as fs from 'fs';
import * as path from 'path';

interface PerformanceMetrics {
  buildTime: number;
  bundleSizes: {
    total: number;
    mainChunk: number;
    largestChunk: number;
    chunks: Array<{ name: string; size: number }>;
  };
  codeMetrics: {
    totalFiles: number;
    totalLines: number;
    typeScriptFiles: number;
    reactComponents: number;
  };
}

function analyzeBundleSize(): PerformanceMetrics['bundleSizes'] {
  const distPath = path.join(__dirname, '../dist/assets');
  const files = fs.readdirSync(distPath).filter(f => f.endsWith('.js'));

  const chunks = files.map(file => {
    const stats = fs.statSync(path.join(distPath, file));
    return {
      name: file,
      size: Math.round(stats.size / 1024) // KB
    };
  }).sort((a, b) => b.size - a.size);

  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
  const mainChunk = chunks.find(c => c.name.includes('index')) || chunks[0];
  const largestChunk = chunks[0];

  return {
    total: totalSize,
    mainChunk: mainChunk.size,
    largestChunk: largestChunk.size,
    chunks: chunks.slice(0, 10) // Top 10 chunks
  };
}

function analyzeCodebase(): PerformanceMetrics['codeMetrics'] {
  const srcPath = path.join(__dirname, '../src');
  let totalFiles = 0;
  let totalLines = 0;
  let typeScriptFiles = 0;
  let reactComponents = 0;

  function walkDir(dir: string) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !file.startsWith('.')) {
        walkDir(fullPath);
      } else if (stat.isFile()) {
        if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          totalFiles++;
          typeScriptFiles++;

          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n').length;
          totalLines += lines;

          if (file.endsWith('.tsx') && content.includes('export default') && content.includes('React')) {
            reactComponents++;
          }
        }
      }
    }
  }

  walkDir(srcPath);

  return {
    totalFiles,
    totalLines,
    typeScriptFiles,
    reactComponents
  };
}

function generateReport(): void {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 VHData Platform - Performance Metrics Report');
  console.log('='.repeat(60) + '\n');

  // Bundle Analysis
  try {
    const bundleMetrics = analyzeBundleSize();

    console.log('📦 BUNDLE SIZE ANALYSIS');
    console.log('------------------------');
    console.log(`Total Bundle Size: ${bundleMetrics.total} KB`);
    console.log(`Main Chunk Size: ${bundleMetrics.mainChunk} KB`);
    console.log(`Largest Chunk: ${bundleMetrics.largestChunk} KB`);
    console.log('\nTop 5 Chunks:');
    bundleMetrics.chunks.slice(0, 5).forEach((chunk, i) => {
      console.log(`  ${i + 1}. ${chunk.name}: ${chunk.size} KB`);
    });

    // Performance Score
    let score = 100;
    if (bundleMetrics.total > 1500) score -= 10;
    if (bundleMetrics.total > 2000) score -= 10;
    if (bundleMetrics.mainChunk > 200) score -= 5;
    if (bundleMetrics.largestChunk > 500) score -= 5;

    console.log(`\n📊 Performance Score: ${score}/100`);

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (bundleMetrics.largestChunk > 500) {
      console.log('  ⚠️  Largest chunk exceeds 500KB - consider code splitting');
    }
    if (bundleMetrics.mainChunk > 200) {
      console.log('  ⚠️  Main chunk exceeds 200KB - lazy load more components');
    }
    if (bundleMetrics.total > 1500) {
      console.log('  ⚠️  Total bundle exceeds 1500KB - review dependencies');
    }

    if (score >= 90) {
      console.log('  ✅ Performance is excellent!');
    } else if (score >= 70) {
      console.log('  ✅ Performance is good, minor optimizations recommended');
    } else {
      console.log('  ❌ Performance needs improvement');
    }
  } catch (error) {
    console.log('⚠️  Could not analyze bundle (run npm run build first)');
  }

  // Code Metrics
  console.log('\n📝 CODE METRICS');
  console.log('------------------------');
  const codeMetrics = analyzeCodebase();
  console.log(`Total TypeScript Files: ${codeMetrics.totalFiles}`);
  console.log(`Total Lines of Code: ${codeMetrics.totalLines}`);
  console.log(`React Components: ${codeMetrics.reactComponents}`);
  console.log(`Average Lines per File: ${Math.round(codeMetrics.totalLines / codeMetrics.totalFiles)}`);

  // Complexity Analysis
  const avgLinesPerFile = codeMetrics.totalLines / codeMetrics.totalFiles;
  if (avgLinesPerFile > 300) {
    console.log('  ⚠️  High average lines per file - consider splitting large files');
  } else if (avgLinesPerFile < 100) {
    console.log('  ✅ Good file size distribution');
  }

  console.log('\n' + '='.repeat(60));
  console.log('Report Generated:', new Date().toISOString());
  console.log('='.repeat(60) + '\n');
}

// Run if executed directly
if (require.main === module) {
  generateReport();
}

export { analyzeBundleSize, analyzeCodebase, generateReport };