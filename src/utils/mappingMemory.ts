/**
 * Память маппингов - хранит историю маппингов пользователя для обучения
 */

interface MappingEntry {
  id: string;
  sourceColumns: string[];
  targetColumns: string[];
  mapping: Record<string, string>;
  databaseId: string;
  fileName: string;
  timestamp: string;
  userId: string;
  successful: boolean;
}

class MappingMemory {
  private storageKey = 'vhdata_mapping_memory';
  private maxEntries = 100;

  /**
   * Сохраняет успешный маппинг в память
   */
  saveMapping(entry: Omit<MappingEntry, 'id' | 'timestamp'>): void {
    const entries = this.loadAll();
    
    const newEntry: MappingEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    entries.unshift(newEntry);

    // Ограничиваем размер
    if (entries.length > this.maxEntries) {
      entries.splice(this.maxEntries);
    }

    this.save(entries);
  }

  /**
   * Загружает все сохранённые маппинги
   */
  loadAll(): MappingEntry[] {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading mapping memory:', error);
      return [];
    }
  }

  /**
   * Находит похожие маппинги
   */
  findSimilarMappings(
    sourceColumns: string[],
    targetColumns: string[],
    databaseId?: string
  ): MappingEntry[] {
    const entries = this.loadAll();
    
    return entries
      .filter((entry) => {
        // Фильтр по базе данных
        if (databaseId && entry.databaseId !== databaseId) {
          return false;
        }

        // Проверяем схожесть колонок
        const sourceMatch = this.calculateColumnSimilarity(sourceColumns, entry.sourceColumns);
        const targetMatch = this.calculateColumnSimilarity(targetColumns, entry.targetColumns);

        return sourceMatch > 0.5 && targetMatch > 0.5;
      })
      .sort((a, b) => {
        // Сортируем по времени (новые первыми)
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }

  /**
   * Предлагает маппинг на основе истории (возвращает массив ColumnMapping)
   */
  suggestFromHistory(
    sourceColumns: string[],
    targetColumns: string[],
    databaseId?: string
  ): Array<{ sourceColumn: string; targetColumn: string; confidence: number }> {
    const similar = this.findSimilarMappings(sourceColumns, targetColumns, databaseId);
    
    if (similar.length === 0) {
      return [];
    }

    // Берём самый последний успешный маппинг
    const best = similar.find((entry) => entry.successful);
    if (!best) {
      return [];
    }

    // Адаптируем маппинг под текущие колонки
    const adapted: Array<{ sourceColumn: string; targetColumn: string; confidence: number }> = [];
    
    for (const [source, target] of Object.entries(best.mapping)) {
      if (sourceColumns.includes(source) && targetColumns.includes(target)) {
        adapted.push({
          sourceColumn: source,
          targetColumn: target,
          confidence: 0.95, // Высокая уверенность для исторических маппингов
        });
      }
    }

    return adapted;
  }

  /**
   * Вычисляет схожесть наборов колонок
   */
  private calculateColumnSimilarity(cols1: string[], cols2: string[]): number {
    const set1 = new Set(cols1.map((c) => c.toLowerCase()));
    const set2 = new Set(cols2.map((c) => c.toLowerCase()));

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Очищает память
   */
  clear(): void {
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Удаляет старые записи
   */
  cleanup(daysToKeep: number = 30): void {
    const entries = this.loadAll();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const filtered = entries.filter((entry) => {
      return new Date(entry.timestamp) > cutoffDate;
    });

    this.save(filtered);
  }

  /**
   * Получает статистику
   */
  getStats(): {
    totalMappings: number;
    successfulMappings: number;
    databases: Set<string>;
    avgMappingsPerFile: number;
  } {
    const entries = this.loadAll();
    
    return {
      totalMappings: entries.length,
      successfulMappings: entries.filter((e) => e.successful).length,
      databases: new Set(entries.map((e) => e.databaseId)),
      avgMappingsPerFile: entries.length > 0
        ? entries.reduce((sum, e) => sum + Object.keys(e.mapping).length, 0) / entries.length
        : 0,
    };
  }

  private save(entries: MappingEntry[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(entries));
    } catch (error) {
      console.error('Error saving mapping memory:', error);
    }
  }
}

export const mappingMemory = new MappingMemory();
export { MappingMemory };
