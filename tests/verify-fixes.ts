/**
 * Верификация исправлений memory leaks
 * Проверяет наличие всех необходимых cleanup функций в коде
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CheckResult {
  file: string;
  check: string;
  passed: boolean;
  details: string;
}

const results: CheckResult[] = [];

function checkFileContains(filePath: string, patterns: string[], checkName: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const allFound = patterns.every(pattern => content.includes(pattern));

    results.push({
      file: filePath,
      check: checkName,
      passed: allFound,
      details: allFound ? '✅ Все паттерны найдены' : `❌ Некоторые паттерны отсутствуют: ${patterns.filter(p => !content.includes(p)).join(', ')}`
    });

    return allFound;
  } catch (error) {
    results.push({
      file: filePath,
      check: checkName,
      passed: false,
      details: `❌ Ошибка чтения файла: ${error}`
    });
    return false;
  }
}

console.log('🔍 Проверка исправлений memory leaks...\n');

// 1. FileImportDialog - setInterval cleanup
console.log('1️⃣  Проверка FileImportDialog...');
const fileImportPath = path.join(__dirname, '../src/components/import/FileImportDialog.tsx');
checkFileContains(
  fileImportPath,
  [
    'let progressInterval: NodeJS.Timeout | null = null',
    'progressInterval = setInterval',
    'finally {',
    'if (progressInterval) {',
    'clearInterval(progressInterval)',
    'useEffect(() => {',
    'return () => {',
    'setImportProgress(0)',
  ],
  'FileImportDialog setInterval cleanup'
);

// 2. DatabaseView - async useEffect isMounted
console.log('2️⃣  Проверка DatabaseView...');
const databaseViewPath = path.join(__dirname, '../src/pages/DatabaseView.tsx');
checkFileContains(
  databaseViewPath,
  [
    'let isMounted = true',
    'if (isMounted) {',
    'return () => {',
    'isMounted = false',
  ],
  'DatabaseView async useEffect isMounted'
);

// 3. FluidButton - setTimeout cleanup
console.log('3️⃣  Проверка FluidButton...');
const fluidButtonPath = path.join(__dirname, '../src/components/aurora/core/FluidButton.tsx');
checkFileContains(
  fluidButtonPath,
  [
    'useRef',
    'useEffect',
    'const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set())',
    'timeoutsRef.current.forEach(timeout => clearTimeout(timeout))',
    'timeoutsRef.current.clear()',
    'const timeout = setTimeout',
    'timeoutsRef.current.add(timeout)',
    'timeoutsRef.current.delete(timeout)',
  ],
  'FluidButton setTimeout cleanup'
);

// Вывод результатов
console.log('\n📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ:\n');

let allPassed = true;
results.forEach((result, index) => {
  const status = result.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${index + 1}. ${status}: ${result.check}`);
  console.log(`   Файл: ${path.basename(result.file)}`);
  console.log(`   ${result.details}\n`);

  if (!result.passed) {
    allPassed = false;
  }
});

// Итоговый вердикт
console.log('═'.repeat(70));
if (allPassed) {
  console.log('✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!');
  console.log('🚀 Исправления применены корректно');
  console.log('✅ Готово к мануальному тестированию');
  console.log('\nСледующий шаг: Откройте http://localhost:8080/ и выполните тесты из QUICK_TEST_GUIDE.md');
  process.exit(0);
} else {
  console.log('❌ НЕКОТОРЫЕ ПРОВЕРКИ НЕ ПРОШЛИ!');
  console.log('⚠️  Необходимо исправить проблемы перед deployment');
  process.exit(1);
}
