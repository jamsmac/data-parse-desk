# ⚡ БЫСТРАЯ ПРОВЕРКА ПЕРЕД DEPLOY

## 3 критических теста (5 минут)

### ✅ ТЕСТ 1: FileImportDialog cleanup (2 мин)

```bash
# Шаги:
1. npm run dev
2. Открыть Console (F12)
3. Dashboard → Открыть БД → Импорт данных
4. Выбрать файл → Начать импорт
5. СРАЗУ нажать ESC (закрыть диалог)
6. Смотреть в Console 5 секунд

# ✅ OK: Console чистая
# ❌ FAIL: "Can't perform React state update on unmounted component"
```

### ✅ ТЕСТ 2: DatabaseView race condition (1 мин)

```bash
# Шаги:
1. Network tab → Throttling: Slow 3G
2. Перейти на DatabaseView
3. СРАЗУ нажать "Назад" (до загрузки)
4. Повторить 3 раза
5. Проверить Console

# ✅ OK: Нет warnings
# ❌ FAIL: "Can't perform React state update"
```

### ✅ ТЕСТ 3: FluidButton ripple (2 мин)

```bash
# Шаги:
1. Dashboard
2. Быстро кликнуть по любой кнопке 10 раз (спам)
3. СРАЗУ перейти на другую страницу
4. Проверить Console

# ✅ OK: Console чистая
# ❌ FAIL: Ошибки setState
```

---

## ❌ Если хоть один тест FAIL → НЕ ДЕПЛОИТЬ!

## ✅ Все тесты PASS → Готово к production! 🚀

---

## 📋 Полный чеклист: [PRE_DEPLOY_TEST_CHECKLIST.md](./PRE_DEPLOY_TEST_CHECKLIST.md)
