# 🧪 PRE-DEPLOY TEST CHECKLIST

**Дата создания:** 2025-10-15
**Версия:** 1.0
**Цель:** Проверить все исправления memory leaks перед production deploy

---

## ✅ КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ

### 1. FileImportDialog - setInterval cleanup
- **Файл:** `src/components/import/FileImportDialog.tsx:264-330`
- **Исправление:** Добавлен finally блок и useEffect cleanup

### 2. DatabaseView - async useEffect
- **Файл:** `src/pages/DatabaseView.tsx:66-85`
- **Исправление:** Добавлен isMounted флаг

### 3. FluidButton - setTimeout cleanup
- **Файл:** `src/components/aurora/core/FluidButton.tsx:65-178`
- **Исправление:** Добавлен timeoutsRef и cleanup

---

## 📋 ТЕСТОВЫЕ СЦЕНАРИИ

### Сценарий 1: Нормальный импорт файла

**Цель:** Убедиться, что импорт работает корректно

**Шаги:**
1. [ ] Запустить dev сервер: `npm run dev`
2. [ ] Открыть приложение в браузере
3. [ ] Открыть DevTools Console (F12)
4. [ ] Перейти в Dashboard
5. [ ] Открыть любую базу данных
6. [ ] Нажать кнопку "Импорт данных"
7. [ ] Выбрать CSV или Excel файл
8. [ ] Дождаться завершения импорта
9. [ ] Проверить Console - не должно быть ошибок

**Ожидаемый результат:**
- ✅ Файл успешно импортирован
- ✅ Прогресс-индикатор работает (0% → 100%)
- ✅ Данные появились в таблице
- ✅ Console чистая (без errors/warnings)

---

### Сценарий 2: Прерывание импорта (КРИТИЧЕСКИЙ!)

**Цель:** Проверить cleanup setInterval при закрытии диалога

**Шаги:**
1. [ ] Открыть FileImportDialog
2. [ ] Выбрать большой файл (или замедлить сеть в DevTools: Network → Slow 3G)
3. [ ] Начать импорт
4. [ ] **Сразу после начала** нажать ESC или кнопку закрытия
5. [ ] Наблюдать за Console в течение 5-10 секунд

**Ожидаемый результат:**
- ✅ Диалог закрылся
- ✅ НЕТ ошибки "Can't perform a React state update on unmounted component"
- ✅ НЕТ утечек памяти (setInterval очищен)
- ✅ Console чистая

**Если видите ошибку - исправление НЕ РАБОТАЕТ!** ❌

---

### Сценарий 3: Навигация во время импорта

**Цель:** Проверить размонтирование компонента во время импорта

**Шаги:**
1. [ ] Открыть DatabaseView
2. [ ] Открыть FileImportDialog
3. [ ] Начать импорт файла
4. [ ] Во время импорта (прогресс ~50%) **нажать "Назад" в браузере**
5. [ ] Или кликнуть по другому пункту меню
6. [ ] Проверить Console

**Ожидаемый результат:**
- ✅ Навигация работает
- ✅ НЕТ warnings в консоли
- ✅ setInterval очищен (проверить в React DevTools Profiler)
- ✅ Память не растет (Memory tab в DevTools)

---

### Сценарий 4: DatabaseView async race condition

**Цель:** Проверить isMounted флаг в async useEffect

**Шаги:**
1. [ ] Открыть Network tab в DevTools
2. [ ] Включить throttling: **Slow 3G**
3. [ ] Перейти на DatabaseView страницу
4. [ ] **Сразу же** (до загрузки) нажать "Назад" или перейти на другую страницу
5. [ ] Повторить 3-5 раз быстро
6. [ ] Проверить Console

**Ожидаемый результат:**
- ✅ НЕТ warning "Can't perform a React state update on unmounted component"
- ✅ НЕТ ошибок setState
- ✅ Console чистая

**Если видите warning - исправление НЕ РАБОТАЕТ!** ❌

---

### Сценарий 5: FluidButton ripple stress test

**Цель:** Проверить cleanup setTimeout в ripple эффекте

**Шаги:**
1. [ ] Найти любую страницу с FluidButton (например, Dashboard)
2. [ ] Открыть Console
3. [ ] **Быстро кликнуть** по кнопке 10-15 раз (спамить клики)
4. [ ] **Сразу после** перейти на другую страницу
5. [ ] Проверить Console в течение 2-3 секунд

**Ожидаемый результат:**
- ✅ Ripple эффект работает
- ✅ НЕТ ошибок setState после размонтирования
- ✅ Все timeouts очищены
- ✅ Console чистая

---

### Сценарий 6: Memory leak detection (ADVANCED)

**Цель:** Проверить реальные утечки памяти

**Шаги:**
1. [ ] Открыть Chrome DevTools → Memory tab
2. [ ] Сделать Heap Snapshot (кнопка 🔘)
3. [ ] Выполнить Сценарий 2 (прерывание импорта) **10 раз подряд**
4. [ ] Сделать второй Heap Snapshot
5. [ ] Сравнить размеры (Snapshot 2 - Snapshot 1)

**Ожидаемый результат:**
- ✅ Разница в памяти < 5 MB
- ✅ Нет detached DOM nodes связанных с FileImportDialog
- ✅ Нет таймеров в "Timers" (если есть фильтр)

**Если память растет > 10 MB - есть утечка!** ⚠️

---

### Сценарий 7: React DevTools Profiler

**Цель:** Проверить производительность после исправлений

**Шаги:**
1. [ ] Установить React DevTools (если не установлено)
2. [ ] Открыть Profiler tab
3. [ ] Нажать Record (🔴)
4. [ ] Выполнить импорт файла (полный цикл)
5. [ ] Остановить запись
6. [ ] Проверить Flame Graph

**Ожидаемый результат:**
- ✅ Нет лишних ре-рендеров после размонтирования
- ✅ FileImportDialog cleanup вызывается (видно в Profiler)
- ✅ Время рендера < 16ms для большинства компонентов

---

## 🔍 ЧТО ИСКАТЬ В CONSOLE

### ❌ Плохие признаки (НЕ ДОЛЖНЫ ПОЯВЛЯТЬСЯ):

```
Warning: Can't perform a React state update on an unmounted component
Warning: Memory leak detected
Error: Cannot read property 'setState' of null
Uncaught TypeError: Cannot read properties of undefined
```

### ✅ Хорошие признаки:

```
- Пустая консоль (no errors, no warnings)
- Только info messages от приложения
- Успешные API calls (200 OK)
```

---

## 📊 МЕТРИКИ ДЛЯ ПРОВЕРКИ

### Performance metrics:

| Метрика | До исправления | После исправления | Цель |
|---------|----------------|-------------------|------|
| Warnings в Console | ~3-5 | 0 | 0 |
| Memory usage (idle) | ? MB | ? MB | Stable |
| Memory growth (10 imports) | ? MB | < 5 MB | < 10 MB |
| Import time | ~2s | ~2s | Не хуже |
| Build size | 390 KB gz | 390 KB gz | Не больше |

### Заполните таблицу во время тестирования!

---

## 🚨 КРИТИЧЕСКИЕ БЛОКЕРЫ

Если обнаружены - **НЕ ДЕПЛОИТЬ!**

- [ ] ❌ Ошибки "unmounted component" в Console
- [ ] ❌ Memory leak > 10 MB после 10 импортов
- [ ] ❌ Приложение крашится при навигации
- [ ] ❌ TypeScript errors в build
- [ ] ❌ ESLint critical errors

---

## ✅ ГОТОВНОСТЬ К DEPLOY

**Все сценарии должны быть пройдены без блокеров!**

- [ ] Сценарий 1: Нормальный импорт - PASS
- [ ] Сценарий 2: Прерывание импорта - PASS
- [ ] Сценарий 3: Навигация во время импорта - PASS
- [ ] Сценарий 4: DatabaseView race condition - PASS
- [ ] Сценарий 5: FluidButton stress test - PASS
- [ ] Сценарий 6: Memory leak detection - PASS
- [ ] Сценарий 7: React Profiler - PASS

**Статус:** ⬜ НЕ ПРОТЕСТИРОВАНО / ✅ ГОТОВО К DEPLOY / ❌ ТРЕБУЕТ ИСПРАВЛЕНИЙ

---

## 🔧 ЕСЛИ ЧТО-ТО ПОШЛО НЕ ТАК

### FileImportDialog не очищает interval:

```typescript
// Проверьте строки 264-330 в FileImportDialog.tsx
// Должен быть finally блок:
finally {
  if (progressInterval) {
    clearInterval(progressInterval);
  }
}
```

### DatabaseView дает warning:

```typescript
// Проверьте строки 66-85 в DatabaseView.tsx
// Должен быть isMounted флаг:
let isMounted = true;
// ...
if (isMounted) {
  setUserId(user.id);
}
```

### FluidButton ripple не очищается:

```typescript
// Проверьте строки 65-178 в FluidButton.tsx
// Должен быть useRef и useEffect:
const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());

useEffect(() => {
  return () => {
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current.clear();
  };
}, []);
```

---

## 📞 ПОМОЩЬ

- **Документация:** [FINAL_AUDIT_REPORT.md](./FINAL_AUDIT_REPORT.md)
- **Фикс деталей:** См. строки кода выше
- **GitHub Issues:** https://github.com/anthropics/claude-code/issues

---

**Удачного тестирования!** 🚀

_Этот чеклист создан автоматически на основе FINAL_AUDIT_REPORT.md_
