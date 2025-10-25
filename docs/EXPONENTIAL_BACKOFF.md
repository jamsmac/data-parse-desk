# Exponential Backoff - Sync Queue

## Обзор

Добавлена интеллектуальная система повторных попыток (retry logic) с экспоненциальной задержкой для синхронизации offline изменений.

**Дата:** 2025-10-24
**Файлы:** [src/utils/syncQueue.ts](../src/utils/syncQueue.ts), [src/utils/offlineStorage.ts](../src/utils/offlineStorage.ts)

---

## 🎯 Зачем это нужно

### Проблема ДО внедрения:
- При временных сетевых проблемах изменения терялись
- Нет повторных попыток при ошибках
- Rate limiting от API приводил к потере данных
- Временные ошибки сервера (500, 503) не обрабатывались

### Решение ПОСЛЕ внедрения:
- ✅ Автоматические повторные попытки при ошибках
- ✅ Экспоненциальная задержка (exponential backoff)
- ✅ Интеллектуальное определение retryable vs non-retryable ошибок
- ✅ Максимум 5 попыток с увеличивающейся задержкой
- ✅ Сохранение информации о попытках в IndexedDB

---

## 📊 Как работает Exponential Backoff

### Формула задержки:
```
delay = INITIAL_DELAY * (MULTIPLIER ^ retryCount)
delay = min(delay, MAX_DELAY)
```

### Конфигурация:
```typescript
MAX_RETRY_ATTEMPTS = 5       // Максимум попыток
INITIAL_RETRY_DELAY = 1000   // 1 секунда
MAX_RETRY_DELAY = 60000      // 60 секунд
BACKOFF_MULTIPLIER = 2       // x2 каждый раз
```

### Пример задержек:
| Попытка | Задержка | Накопительно |
|---------|----------|--------------|
| 1 (initial) | 0ms | 0ms |
| 2 (retry 1) | 1,000ms | 1s |
| 3 (retry 2) | 2,000ms | 3s |
| 4 (retry 3) | 4,000ms | 7s |
| 5 (retry 4) | 8,000ms | 15s |
| 6 (retry 5) | 16,000ms | 31s |
| Fail | - | Stopped |

---

## 🔧 Технические детали

### 1. Обновленные интерфейсы

#### SyncOperation
```typescript
interface SyncOperation {
  id: string;
  operation: 'insert' | 'update' | 'delete';
  table: string;
  data: TableRow;
  originalData?: TableRow;
  timestamp: number;
  retryCount?: number;      // NEW: количество попыток
  lastRetryAt?: number;     // NEW: время последней попытки
}
```

#### PendingChange (в IndexedDB)
```typescript
interface PendingChange {
  id: string;
  timestamp: number;
  operation: 'insert' | 'update' | 'delete';
  table: string;
  data: TableRow;
  originalData?: TableRow;
  synced: boolean;
  error?: string;
  retryCount?: number;      // NEW
  lastRetryAt?: number;     // NEW
}
```

### 2. Новые методы

#### SyncQueueManager

**syncChangeWithRetry()**
```typescript
private async syncChangeWithRetry(change: SyncOperation): Promise<void>
```
- Проверяет нужна ли задержка перед retry
- Вычисляет exponential backoff delay
- Ожидает необходимое время
- Вызывает syncChange()

**calculateBackoffDelay()**
```typescript
private calculateBackoffDelay(retryCount: number): number
```
- Вычисляет задержку: `1000 * (2 ^ retryCount)`
- Ограничивает максимум 60 секундами

**isRetryableError()**
```typescript
private isRetryableError(error: unknown): boolean
```
Определяет можно ли повторить операцию:

**Retryable (можно повторить):**
- Network errors (timeout, connection, fetch)
- Rate limiting (429)
- Temporary server errors (500, 502, 503, 504)

**Non-retryable (нельзя повторить):**
- Conflict errors (нужно разрешение конфликта)
- Validation errors (invalid, duplicate key, foreign key)

**updateRetryInfo()**
```typescript
private async updateRetryInfo(changeId: string, retryCount: number): Promise<void>
```
- Обновляет retry count в IndexedDB
- Сохраняет timestamp последней попытки

#### OfflineStorage

**updateRetryInfo()**
```typescript
async updateRetryInfo(changeId: string, retryCount: number, lastRetryAt: number): Promise<void>
```
- Обновляет retryCount и lastRetryAt в pending_changes store
- Сохраняет в IndexedDB для persistence

### 3. Логика обработки ошибок

```typescript
// В syncAll()
for (const change of pendingChanges) {
  try {
    await this.syncChangeWithRetry(change);
    // Success: удаляем из queue
    await offlineStorage.deletePendingChange(change.id);
    result.syncedCount++;
  } catch (error: unknown) {
    const retryCount = change.retryCount || 0;

    if (retryCount < MAX_RETRY_ATTEMPTS && isRetryableError(error)) {
      // Можем retry: обновляем retry info
      await this.updateRetryInfo(change.id, retryCount + 1);
      console.warn(`Will retry later (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
      // Оставляем в queue для следующей попытки
    } else {
      // Max retries или non-retryable: считаем failed
      result.failedCount++;
      result.errors.push({
        id: change.id,
        error: `${error.message} (after ${retryCount} retries)`,
      });
      // Оставляем в queue для manual intervention
    }
  }
}
```

---

## 📈 Преимущества

### 1. Надежность
- Temporary network issues не теряют данные
- Rate limiting обрабатывается автоматически
- Server downtime не приводит к потере изменений

### 2. Производительность
- Не спамит API при проблемах
- Respects server load с увеличивающимися delays
- Снижает load на клиенте и сервере

### 3. User Experience
- Пользователь не видит failed syncs при temporary issues
- Автоматическое восстановление после reconnect
- Transparent retry logic

### 4. Debugging
- Подробные logs о retry attempts
- Сохранение retry count для анализа
- Понятные error messages с указанием retries

---

## 🧪 Примеры использования

### Пример 1: Network Timeout
```
User делает INSERT -> Network timeout
Attempt 1: FAIL (timeout)
  -> Retry after 1s
Attempt 2: FAIL (timeout)
  -> Retry after 2s
Attempt 3: SUCCESS
  -> Change synced, removed from queue
```

### Пример 2: Rate Limiting
```
User делает 10 UPDATEs быстро -> API returns 429
Attempt 1: FAIL (rate limit)
  -> Retry after 1s
Attempt 2: FAIL (rate limit)
  -> Retry after 2s
Attempt 3: FAIL (rate limit)
  -> Retry after 4s
Attempt 4: SUCCESS
  -> Changes synced gradually
```

### Пример 3: Validation Error (non-retryable)
```
User делает INSERT with invalid data
Attempt 1: FAIL (validation error)
  -> Error is non-retryable
  -> Marked as failed immediately
  -> Kept in queue for manual fix
```

### Пример 4: Max Retries Reached
```
Server is down for extended period
Attempt 1: FAIL (500)
  -> Retry after 1s
Attempt 2: FAIL (500)
  -> Retry after 2s
Attempt 3: FAIL (500)
  -> Retry after 4s
Attempt 4: FAIL (500)
  -> Retry after 8s
Attempt 5: FAIL (500)
  -> Retry after 16s
Attempt 6: FAIL (500)
  -> Max retries reached
  -> Marked as failed
  -> Kept in queue for later manual retry
```

---

## 🔍 Мониторинг и отладка

### Console Logs

```javascript
// При retry
"SyncQueue: Failed to sync abc123 (attempt 2/5), will retry later"
"SyncQueue: Waiting 2000ms before retry 2"

// При success после retry
"SyncQueue: Synced change abc123"

// При final failure
"SyncQueue: Failed to sync change abc123 after 5 retries: Network timeout"
```

### Проверка pending changes

```javascript
// В DevTools Console
const changes = await offlineStorage.getPendingChanges();
console.table(changes.map(c => ({
  id: c.id,
  operation: c.operation,
  retryCount: c.retryCount || 0,
  lastRetry: c.lastRetryAt ? new Date(c.lastRetryAt).toLocaleString() : 'N/A'
})));
```

### Статистика sync результатов

```javascript
syncQueue.onSyncComplete((result) => {
  console.log('Sync Results:', {
    success: result.success,
    synced: result.syncedCount,
    failed: result.failedCount,
    errors: result.errors
  });
});
```

---

## 📝 Best Practices

### 1. Конфигурация задержек
```typescript
// Development: более частые retry для быстрого тестирования
INITIAL_RETRY_DELAY = 500   // 0.5s
MAX_RETRY_ATTEMPTS = 3

// Production: более консервативные настройки
INITIAL_RETRY_DELAY = 1000  // 1s
MAX_RETRY_ATTEMPTS = 5
```

### 2. Обработка specific errors
```typescript
// Можно добавить custom error handling
if (message.includes('quota exceeded')) {
  // Special handling for quota errors
  return false; // Don't retry
}
```

### 3. User notification
```typescript
syncQueue.onSyncComplete((result) => {
  if (result.failedCount > 0) {
    toast({
      title: 'Sync Warning',
      description: `${result.failedCount} changes failed to sync`,
      variant: 'warning'
    });
  }
});
```

---

## 🚀 Что дальше

### Возможные улучшения:

1. **Adaptive backoff**
   - Анализ network conditions
   - Динамическая подстройка delays

2. **Priority queue**
   - Критичные изменения retry быстрее
   - Background changes можно retry медленнее

3. **Batch retries**
   - Group related changes
   - Retry together для consistency

4. **Manual retry UI**
   - Button для manual retry failed changes
   - Show retry history в UI

5. **Metrics и analytics**
   - Track retry rates
   - Identify common failure patterns
   - Alert on high retry rates

---

## 📚 Связанные документы

- [QUICKSTART_CONNECTION.md](../QUICKSTART_CONNECTION.md) - Connection improvements
- [CORS_SECURITY_COMPLETE.md](../CORS_SECURITY_COMPLETE.md) - CORS security
- [docs/SUPABASE_CONNECTION_FIXES.md](SUPABASE_CONNECTION_FIXES.md) - Supabase fixes

---

## ✅ Checklist

- [x] Добавлены retry fields в интерфейсы
- [x] Реализован exponential backoff
- [x] Добавлена классификация retryable vs non-retryable errors
- [x] Сохранение retry info в IndexedDB
- [x] Логирование retry attempts
- [x] Документация создана
- [ ] Unit tests для retry logic
- [ ] Integration tests с mock network failures

---

**Последнее обновление:** 2025-10-24
**Статус:** ✅ Реализовано
**Тесты:** Pending
