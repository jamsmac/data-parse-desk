/**
 * ML-подобный маппер колонок
 * Использует эвристические алгоритмы для автоматического сопоставления колонок
 */

interface MappingSuggestion {
  sourceColumn: string;
  targetColumn: string;
  confidence: number; // 0-1
  reason: string;
}

interface ColumnAnalysis {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'email' | 'phone' | 'url';
  samples: any[];
  nullCount: number;
  uniqueCount: number;
  patterns: string[];
}

export class MLMapper {
  private knownPatterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[\d\s\-\+\(\)]+$/,
    url: /^https?:\/\/.+/,
    date: /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}/,
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
  analyzeColumn(columnName: string, values: any[]): ColumnAnalysis {
    const samples = values.slice(0, 100); // Берём первые 100 значений
    const nonNullSamples = samples.filter((v) => v != null && v !== '');
    
    const analysis: ColumnAnalysis = {
      name: columnName,
      type: 'text',
      samples: nonNullSamples.slice(0, 5),
      nullCount: samples.length - nonNullSamples.length,
      uniqueCount: new Set(nonNullSamples).size,
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
      analysis.type = detectedType as any || 'text';
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
    sourceColumns: { name: string; values: any[] }[],
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

  /**
   * Soundex algorithm for phonetic matching
   * Supports both English and Russian (transliterated)
   */
  soundex(str: string): string {
    if (!str) return '0000';

    // Clean and uppercase
    const cleaned = str.toUpperCase().replace(/[^A-ZА-Я]/g, '');
    if (cleaned.length === 0) return '0000';

    // Soundex mapping for English letters
    const soundexMap: Record<string, string> = {
      'B': '1', 'F': '1', 'P': '1', 'V': '1',
      'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
      'D': '3', 'T': '3',
      'L': '4',
      'M': '5', 'N': '5',
      'R': '6',
      // Russian transliteration
      'Б': '1', 'В': '1', 'Ф': '1', 'П': '1',
      'Г': '2', 'К': '2', 'Х': '2', 'Ж': '2', 'Ш': '2', 'Щ': '2', 'З': '2', 'С': '2', 'Ц': '2',
      'Д': '3', 'Т': '3',
      'Л': '4',
      'М': '5', 'Н': '5',
      'Р': '6',
    };

    // Start with first letter
    let code = cleaned[0];

    // Process remaining letters
    for (let i = 1; i < cleaned.length && code.length < 4; i++) {
      const char = cleaned[i];
      const digit = soundexMap[char];

      // Add digit if:
      // 1. It exists in the map
      // 2. It's different from the last digit added
      if (digit && digit !== code[code.length - 1]) {
        code += digit;
      }
    }

    // Pad with zeros to make it 4 characters
    return (code + '0000').slice(0, 4);
  }

  /**
   * Time-based matching for date fields
   * Returns similarity score based on time difference
   */
  matchByTime(
    date1: Date | string | null,
    date2: Date | string | null,
    thresholdMs: number = 86400000 // 1 day in milliseconds
  ): number {
    if (!date1 || !date2) return 0;

    try {
      const d1 = date1 instanceof Date ? date1 : new Date(date1);
      const d2 = date2 instanceof Date ? date2 : new Date(date2);

      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;

      const diff = Math.abs(d1.getTime() - d2.getTime());

      // Perfect match
      if (diff === 0) return 1.0;

      // Outside threshold
      if (diff > thresholdMs) return 0.0;

      // Linear decay within threshold
      return 1 - (diff / thresholdMs);
    } catch (error) {
      console.error('Time matching error:', error);
      return 0;
    }
  }

  /**
   * Composite scoring with configurable weights
   * Combines multiple matching strategies
   */
  compositeScore(
    values: {
      exact?: number;
      fuzzy?: number;
      soundex?: number;
      time?: number;
      pattern?: number;
    },
    weights: {
      exact?: number;
      fuzzy?: number;
      soundex?: number;
      time?: number;
      pattern?: number;
    } = {
      exact: 0.4,
      fuzzy: 0.3,
      soundex: 0.15,
      time: 0.1,
      pattern: 0.05,
    }
  ): number {
    let totalScore = 0;
    let totalWeight = 0;

    // Calculate weighted sum
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const weight = weights[key as keyof typeof weights] || 0;
        totalScore += value * weight;
        totalWeight += weight;
      }
    });

    // Normalize by total weight (in case not all values provided)
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Advanced matching with all strategies combined
   */
  advancedMatch(
    source: {
      name: string;
      value: any;
      type: string;
    },
    target: {
      name: string;
      value: any;
      type: string;
    },
    options?: {
      weights?: {
        exact?: number;
        fuzzy?: number;
        soundex?: number;
        time?: number;
        pattern?: number;
      };
      timeThreshold?: number;
    }
  ): {
    score: number;
    breakdown: Record<string, number>;
    confidence: 'high' | 'medium' | 'low';
  } {
    const scores: Record<string, number> = {};

    // Exact name match
    scores.exact = source.name.toLowerCase() === target.name.toLowerCase() ? 1.0 : 0.0;

    // Fuzzy name match
    scores.fuzzy = this.calculateNameSimilarity(source.name, target.name);

    // Soundex phonetic match
    const sourceSoundex = this.soundex(source.name);
    const targetSoundex = this.soundex(target.name);
    scores.soundex = sourceSoundex === targetSoundex ? 1.0 : 0.0;

    // Time-based match (if both are dates)
    if (source.type === 'date' && target.type === 'date') {
      scores.time = this.matchByTime(
        source.value,
        target.value,
        options?.timeThreshold
      );
    }

    // Pattern match (type compatibility)
    scores.pattern = source.type === target.type ? 1.0 : 0.0;

    // Calculate composite score
    const finalScore = this.compositeScore(scores, options?.weights);

    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low';
    if (finalScore >= 0.8) {
      confidence = 'high';
    } else if (finalScore >= 0.5) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    return {
      score: finalScore,
      breakdown: scores,
      confidence,
    };
  }
}

// Singleton instance
export const mlMapper = new MLMapper();
