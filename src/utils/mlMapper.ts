/**
 * ML-подобный маппер колонок
 * Использует эвристические алгоритмы для автоматического сопоставления колонок
 */

import type { TableRow } from '@/types/common';

interface MappingSuggestion {
  sourceColumn: string;
  targetColumn: string;
  confidence: number; // 0-1
  reason: string;
}

interface ColumnAnalysis {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'email' | 'phone' | 'url';
  samples: unknown[];
  nullCount: number;
  uniqueCount: number;
  patterns: string[];
}

export class MLMapper {
  private knownPatterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[\d\s\-+()]+$/,
    url: /^https?:\/\/.+/,
    date: /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/,
    number: /^-?\d+\.?\d*$/,
    currency: /^[$€£¥]\s?\d+/,
    percentage: /^\d+\.?\d*%$/,
  };

  private commonNameMappings = {
    // Имена
    name: ['name', 'название', 'имя', 'title', 'наименование'],
    firstName: ['first_name', 'firstname', 'fname', 'имя'],
    lastName: ['last_name', 'lastname', 'lname', 'фамилия'],
    
    // Email и контакты
    email: ['email', 'e-mail', 'mail', 'почта', 'email_address'],
    phone: ['phone', 'телефон', 'tel', 'telephone', 'mobile', 'мобильный'],
    
    // Адреса
    address: ['address', 'адрес', 'location', 'место'],
    city: ['city', 'город', 'town'],
    country: ['country', 'страна', 'nation'],
    
    // Финансы
    price: ['price', 'цена', 'cost', 'стоимость', 'amount'],
    total: ['total', 'итого', 'sum', 'сумма'],
    discount: ['discount', 'скидка', 'sale'],
    
    // Даты
    date: ['date', 'дата', 'datetime', 'timestamp'],
    createdAt: ['created_at', 'created', 'создан', 'create_date'],
    updatedAt: ['updated_at', 'updated', 'изменен', 'update_date'],
    
    // Статусы
    status: ['status', 'статус', 'state', 'состояние'],
    active: ['active', 'активен', 'enabled', 'включен'],
    
    // Идентификаторы
    id: ['id', 'identifier', 'код', 'number', 'номер'],
  };

  /**
   * Анализирует колонку и определяет её тип и характеристики
   */
  analyzeColumn(columnName: string, values: unknown[]): ColumnAnalysis {
    const samples = values.slice(0, 100); // Берём первые 100 значений
    const nonNullSamples = samples.filter((v) => v != null && v !== '');
    
    const analysis: ColumnAnalysis = {
      name: columnName,
      type: 'text',
      samples: nonNullSamples.slice(0, 5),
      nullCount: samples.length - nonNullSamples.length,
      uniqueCount: new Set(nonNullSamples.map(v => String(v))).size,
      patterns: [],
    };

    if (nonNullSamples.length === 0) {
      return analysis;
    }

    // Определяем тип данных
    const typeScores = {
      email: 0,
      phone: 0,
      url: 0,
      date: 0,
      number: 0,
      boolean: 0,
      text: 0,
    };

    nonNullSamples.forEach((value) => {
      const str = String(value).trim();
      
      if (this.knownPatterns.email.test(str)) typeScores.email++;
      if (this.knownPatterns.phone.test(str)) typeScores.phone++;
      if (this.knownPatterns.url.test(str)) typeScores.url++;
      if (this.knownPatterns.date.test(str)) typeScores.date++;
      if (this.knownPatterns.number.test(str)) typeScores.number++;
      
      if (['true', 'false', 'yes', 'no', '1', '0', 'да', 'нет'].includes(str.toLowerCase())) {
        typeScores.boolean++;
      }
    });

    // Определяем доминирующий тип
    const maxScore = Math.max(...Object.values(typeScores));
    const threshold = nonNullSamples.length * 0.7; // 70% должны совпадать

    if (maxScore >= threshold) {
      const detectedType = Object.entries(typeScores).find(([_, score]) => score === maxScore)?.[0];
      if (detectedType && ['text', 'number', 'date', 'boolean', 'email', 'phone', 'url'].includes(detectedType)) {
        analysis.type = detectedType as ColumnAnalysis['type'];
      }
    }

    // Определяем паттерны
    if (typeScores.email > 0) analysis.patterns.push('email');
    if (typeScores.phone > 0) analysis.patterns.push('phone');
    if (typeScores.url > 0) analysis.patterns.push('url');
    if (typeScores.date > 0) analysis.patterns.push('date');
    if (typeScores.number > 0) analysis.patterns.push('number');
    if (this.knownPatterns.currency.test(String(nonNullSamples[0]))) {
      analysis.patterns.push('currency');
    }

    return analysis;
  }

  /**
   * Вычисляет схожесть имён колонок
   */
  private calculateNameSimilarity(source: string, target: string): number {
    const s = source.toLowerCase().replace(/[_\s-]/g, '');
    const t = target.toLowerCase().replace(/[_\s-]/g, '');

    // Точное совпадение
    if (s === t) return 1.0;

    // Проверяем известные сопоставления
    for (const [key, variants] of Object.entries(this.commonNameMappings)) {
      if (variants.some((v) => s.includes(v)) && variants.some((v) => t.includes(v))) {
        return 0.9;
      }
    }

    // Levenshtein distance
    const distance = this.levenshteinDistance(s, t);
    const maxLen = Math.max(s.length, t.length);
    return 1 - distance / maxLen;
  }

  /**
   * Расстояние Левенштейна
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Генерирует предложения по маппингу
   */
  suggestMappings(
    sourceColumns: { name: string; values: unknown[] }[],
    targetColumns: { name: string; type: string }[]
  ): MappingSuggestion[] {
    const suggestions: MappingSuggestion[] = [];

    // Анализируем исходные колонки
    const sourceAnalysis = sourceColumns.map((col) => ({
      ...col,
      analysis: this.analyzeColumn(col.name, col.values),
    }));

    for (const source of sourceAnalysis) {
      let bestMatch: MappingSuggestion | null = null;
      let bestScore = 0;

      for (const target of targetColumns) {
        let score = 0;
        let reason = '';

        // 1. Схожесть имён (вес: 40%)
        const nameSimilarity = this.calculateNameSimilarity(source.name, target.name);
        score += nameSimilarity * 0.4;

        if (nameSimilarity > 0.8) {
          reason = `Похожие названия колонок`;
        }

        // 2. Совпадение типов (вес: 35%)
        if (source.analysis.type === target.type) {
          score += 0.35;
          reason += reason ? ', совпадают типы данных' : 'Совпадают типы данных';
        }

        // 3. Паттерны данных (вес: 25%)
        if (source.analysis.patterns.length > 0) {
          const patternMatch = source.analysis.patterns.some((pattern) =>
            target.name.toLowerCase().includes(pattern)
          );
          if (patternMatch) {
            score += 0.25;
            reason += reason ? ', паттерны данных' : 'Паттерны данных';
          }
        }

        if (score > bestScore && score > 0.5) {
          bestScore = score;
          bestMatch = {
            sourceColumn: source.name,
            targetColumn: target.name,
            confidence: score,
            reason: reason || 'Автоматическое сопоставление',
          };
        }
      }

      if (bestMatch) {
        suggestions.push(bestMatch);
      }
    }

    // Сортируем по уверенности
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Улучшает существующий маппинг на основе feedback
   */
  improveMappingWithFeedback(
    currentMapping: Record<string, string>,
    feedback: { source: string; target: string; isCorrect: boolean }[]
  ): Record<string, string> {
    const improvedMapping = { ...currentMapping };

    feedback.forEach(({ source, target, isCorrect }) => {
      if (isCorrect) {
        // Подтверждённое сопоставление
        improvedMapping[source] = target;
      } else {
        // Неправильное сопоставление - удаляем
        if (improvedMapping[source] === target) {
          delete improvedMapping[source];
        }
      }
    });

    return improvedMapping;
  }
}

// Singleton instance
export const mlMapper = new MLMapper();
