const fs = require('fs');
const path = require('path');
const glob = require('glob');

function analyzeProject() {
  const allFiles = glob.sync('src/**/*.{ts,tsx,js,jsx}', {
    ignore: ['**/*.test.*', '**/*.spec.*']
  });
  
  const imports = new Map();
  const exports = new Map();
  
  // Анализ импортов и экспортов
  allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const fileName = path.basename(file);
    
    // Найти все импорты
    const importRegex = /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['\"]([^'\"]+)['\"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (!imports.has(importPath)) {
        imports.set(importPath, []);
      }
      imports.get(importPath).push(file);
    }
    
    // Найти все экспорты
    if (content.includes('export ')) {
      exports.set(file, true);
    }
  });
  
  // Найти неиспользуемые
  const unused = allFiles.filter(file => {
    const isEntry = file.includes('main.') || file.includes('App.');
    const isImported = Array.from(imports.values()).some(files => 
      files.some(f => f.includes(path.basename(file, path.extname(file))))
    );
    return !isEntry && !isImported;
  });
  
  return {
    total: allFiles.length,
    unused: unused,
    unusedCount: unused.length,
    percentage: ((unused.length / allFiles.length) * 100).toFixed(1)
  };
}

const result = analyzeProject();
console.log(`\u041d\u0430\u0439\u0434\u0435\u043d\u043e ${result.unusedCount} \u043d\u0435\u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u043c\u044b\u0445 \u0444\u0430\u0439\u043b\u043e\u0432 (${result.percentage}%)`);
result.unused.forEach(f => console.log(`  - ${f}`));