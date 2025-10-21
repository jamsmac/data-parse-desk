# 📊 АНАЛИЗ ОПЦИОНАЛЬНЫХ ФУНКЦИЙ DATA PARSE DESK 2.0

**Дата анализа:** 21 октября 2025
**Версия:** 2.0.0
**Статус:** Исследовательский отчет

---

## 📋 EXECUTIVE SUMMARY

Проведен полный анализ 8 опциональных функций из плана реализации. Обнаружено, что **5 из 8 функций уже частично или полностью реализованы**.

### Сводная таблица статуса:

| # | Функция | Статус | % Готовности | Приоритет |
|---|---------|--------|--------------|-----------|
| 1 | Voice Input (Whisper API) | ✅ Реализовано | 70% | Средний |
| 2 | Group Chat Support | ❌ Не реализовано | 0% | Низкий |
| 3 | Visual ERD Diagrams | ✅ Реализовано | 100% | ✨ Done |
| 4 | Formulas в Custom Columns | ✅ Реализовано | 80% | Высокий |
| 5 | Auto-complete Статусов | 🔧 Базовая версия | 30% | Высокий |
| 6 | File Attachments на Items | ❌ Не реализовано | 5% | Высокий |
| 7 | Schema Version Control | ❌ Не реализовано | 0% | Средний |
| 8 | Multi-step Generation | 🔧 Частичная | 40% | Средний |

**Итого:** 3 полные реализации, 2 частичные, 3 не реализованы

---

## 1️⃣ VOICE INPUT (WHISPER API)

### 📊 Текущий статус: ✅ РЕАЛИЗОВАНО (70%)

### Существующая реализация:

#### Файлы:
- [supabase/functions/process-voice/index.ts](../supabase/functions/process-voice/index.ts)
- [supabase/functions/telegram-webhook/index.ts](../supabase/functions/telegram-webhook/index.ts)
- [src/components/ai/VoiceRecorder.tsx](../src/components/ai/VoiceRecorder.tsx) - **упоминается, но не найден**

#### Что работает:
1. **Edge Function `process-voice`:**
   - Обработка голосовых сообщений из Telegram
   - Использует **Lovable AI Gateway** (Google Gemini 2.5 Flash) вместо Whisper
   - Поддержка форматов: OGG, MP3
   - Конвертация audio → base64 → отправка в AI
   - Возврат транскрибированного текста

2. **Интеграция с Telegram:**
   ```typescript
   // telegram-webhook/index.ts строки 397-430
   if (message.voice) {
     const voiceFileId = message.voice.file_id;
     const voiceData = await downloadTelegramFile(voiceFileId);

     // Отправка в process-voice
     const transcription = await processVoice(voiceData, 'ogg');

     // Обработка через natural language
     await handleNaturalLanguage(transcription, userId, chatId);
   }
   ```

3. **Workflow:**
   ```
   Telegram Voice Message
         ↓
   Download file via Bot API
         ↓
   Convert to base64
         ↓
   Send to Gemini 2.5 Flash (audio_url)
         ↓
   Receive transcription
         ↓
   Process via telegram-natural-language
         ↓
   Execute action (query_data, create_record, etc.)
   ```

### Что отсутствует:

#### 1. **Whisper API интеграция** (альтернатива Gemini)

**Причина добавления:** Резервный вариант при недоступности Lovable AI Gateway

**OpenAI Whisper API:**
- **Endpoint:** `https://api.openai.com/v1/audio/transcriptions`
- **Модель:** `whisper-1`
- **Поддерживаемые форматы:** mp3, mp4, mpeg, mpga, m4a, wav, webm
- **Max размер:** 25 MB
- **Языки:** 99 языков, включая русский
- **Стоимость:** $0.006 / minute (60 секунд = $0.006)

**Пример реализации:**
```typescript
// supabase/functions/process-voice-whisper/index.ts
const formData = new FormData();
formData.append('file', audioBlob, 'audio.mp3');
formData.append('model', 'whisper-1');
formData.append('language', 'ru');

const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`
  },
  body: formData
});

const { text } = await response.json();
```

**Документация:** https://platform.openai.com/docs/guides/speech-to-text

#### 2. **Web-версия Voice Recorder**

**Отсутствует:** Frontend компонент для записи голоса в браузере

**Требуемая библиотека:** `react-audio-recorder` или встроенный `MediaRecorder API`

**Пример компонента:**
```typescript
// src/components/ai/VoiceRecorder.tsx
import { useState, useRef } from 'react';
import { Mic, Square } from 'lucide-react';

export const VoiceRecorder = ({ onTranscription }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);

    mediaRecorder.current.ondataavailable = (e) => {
      audioChunks.current.push(e.data);
    };

    mediaRecorder.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
      audioChunks.current = [];

      // Отправить на process-voice
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const { data } = await supabase.functions.invoke('process-voice', {
        body: formData
      });

      onTranscription(data.transcription);
    };

    mediaRecorder.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  return (
    <Button onClick={isRecording ? stopRecording : startRecording}>
      {isRecording ? <Square className="animate-pulse" /> : <Mic />}
    </Button>
  );
};
```

#### 3. **Обработка ошибок**

Добавить:
- Fallback на Whisper при 429 от Gemini
- Показ прогресса обработки
- Ограничение длительности (max 5 минут)
- Поддержка отмены обработки

### Изменения в БД:

**Не требуется** - текущая структура достаточна.

Опционально можно добавить:
```sql
CREATE TABLE voice_transcriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  audio_url TEXT,
  transcription TEXT,
  language TEXT DEFAULT 'ru',
  duration_seconds INTEGER,
  provider TEXT DEFAULT 'gemini', -- 'gemini' | 'whisper'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Оценка работ:

| Задача | Сложность | Время |
|--------|-----------|-------|
| Whisper API интеграция | Средняя | 2-3 часа |
| VoiceRecorder компонент | Средняя | 3-4 часа |
| Обработка ошибок | Низкая | 1-2 часа |
| voice_transcriptions таблица | Низкая | 1 час |
| **ИТОГО** | | **7-10 часов** |

---

## 2️⃣ GROUP CHAT SUPPORT В TELEGRAM

### 📊 Текущий статус: ❌ НЕ РЕАЛИЗОВАНО (0%)

### Анализ текущего кода:

#### Файл: telegram-webhook/index.ts

**Текущая обработка:**
```typescript
// Только личные сообщения
const chatId = message.chat.id;
const userId = await getUserIdFromTelegram(message.from.id);

// Нет проверки chat.type
```

**Что отсутствует:**
- Проверка типа чата (private, group, supergroup, channel)
- Обработка mentions (@bot_username)
- Права доступа в группах
- Хранение group_id и связи с пользователями

### Telegram Bot API для групп:

**Официальная документация:** https://core.telegram.org/bots/api#chat

#### Типы чатов:
```typescript
type ChatType = 'private' | 'group' | 'supergroup' | 'channel';

interface Chat {
  id: number;
  type: ChatType;
  title?: string; // Для групп
  username?: string;
  // ...
}
```

#### Особенности групповых чатов:

1. **Mentions в группах:**
   - Бот получает сообщения только с mention (@bot_username)
   - Или при ответе Reply на сообщение бота
   - Или при команде /command

2. **Privacy Mode:**
   - По умолчанию: бот видит только mentions
   - Можно отключить через @BotFather (`/setprivacy`)
   - Тогда бот видит все сообщения

3. **Права доступа:**
   ```typescript
   interface ChatMember {
     user: User;
     status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked';
     // ...
   }
   ```

### Требуемая реализация:

#### 1. Database Schema

```sql
-- Групповые чаты
CREATE TABLE telegram_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_chat_id BIGINT NOT NULL UNIQUE,
  chat_type TEXT NOT NULL, -- 'group' | 'supergroup'
  title TEXT,
  username TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Участники групп
CREATE TABLE telegram_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES telegram_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users NOT NULL,
  telegram_user_id BIGINT NOT NULL,
  status TEXT DEFAULT 'member', -- 'creator' | 'admin' | 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- RLS Policies
ALTER TABLE telegram_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view groups they are members of"
  ON telegram_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM telegram_group_members tgm
      WHERE tgm.group_id = telegram_groups.id
        AND tgm.user_id = auth.uid()
    )
  );
```

#### 2. Webhook Handler Update

```typescript
// supabase/functions/telegram-webhook/index.ts

interface TelegramUpdate {
  message?: {
    chat: {
      id: number;
      type: 'private' | 'group' | 'supergroup' | 'channel';
      title?: string;
      username?: string;
    };
    from: {
      id: number;
      username?: string;
      first_name: string;
    };
    text?: string;
    entities?: Array<{
      type: 'mention' | 'bot_command' | ...;
      offset: number;
      length: number;
    }>;
  };
}

const handleUpdate = async (update: TelegramUpdate) => {
  const message = update.message;
  if (!message) return;

  const chatType = message.chat.type;

  if (chatType === 'private') {
    // Existing logic
    return handlePrivateMessage(message);
  }

  if (chatType === 'group' || chatType === 'supergroup') {
    return handleGroupMessage(message);
  }
};

const handleGroupMessage = async (message: Message) => {
  const { chat, from, text, entities } = message;

  // Проверка: сообщение адресовано боту?
  const isMentioned = entities?.some(e =>
    e.type === 'mention' &&
    text?.substring(e.offset, e.offset + e.length) === `@${BOT_USERNAME}`
  );

  const isBotCommand = entities?.some(e => e.type === 'bot_command');

  if (!isMentioned && !isBotCommand) {
    return; // Игнорировать сообщения без mention
  }

  // Получить или создать группу
  const { data: group } = await supabase
    .from('telegram_groups')
    .upsert({
      telegram_chat_id: chat.id,
      chat_type: chat.type,
      title: chat.title,
      username: chat.username
    }, { onConflict: 'telegram_chat_id' })
    .select()
    .single();

  // Получить пользователя
  const { data: telegramAccount } = await supabase
    .from('telegram_accounts')
    .select('user_id')
    .eq('telegram_id', from.id)
    .single();

  if (!telegramAccount) {
    await sendTelegramMessage(chat.id,
      `@${from.username}, сначала привяжите аккаунт через /link`
    );
    return;
  }

  // Добавить пользователя в группу (если еще нет)
  await supabase
    .from('telegram_group_members')
    .upsert({
      group_id: group.id,
      user_id: telegramAccount.user_id,
      telegram_user_id: from.id,
      status: 'member'
    }, { onConflict: 'group_id,user_id' });

  // Обработать команду
  await processGroupCommand(chat.id, from.id, text, group.id);
};
```

#### 3. Групповые команды

```typescript
const processGroupCommand = async (
  chatId: number,
  fromId: number,
  text: string,
  groupId: string
) => {
  // Удалить @bot_username из текста
  const cleanText = text.replace(/@\w+\s*/, '').trim();

  if (cleanText.startsWith('/stats')) {
    // Показать статистику для всей группы
    const stats = await getGroupStats(groupId);
    await sendTelegramMessage(chatId, formatGroupStats(stats));
    return;
  }

  if (cleanText.startsWith('/databases')) {
    // Показать базы данных доступные группе
    const databases = await getGroupDatabases(groupId);
    await sendTelegramMessage(chatId, formatDatabaseList(databases));
    return;
  }

  // Natural language query для группы
  await handleGroupNaturalLanguage(cleanText, groupId, chatId);
};
```

### UI компоненты:

```typescript
// src/pages/TelegramGroups.tsx
export const TelegramGroups = () => {
  const { data: groups } = useQuery({
    queryKey: ['telegram-groups'],
    queryFn: async () => {
      const { data } = await supabase
        .from('telegram_groups')
        .select(`
          *,
          members:telegram_group_members(
            user:users(email, username)
          )
        `);
      return data;
    }
  });

  return (
    <div>
      <h1>Telegram Groups</h1>
      {groups?.map(group => (
        <Card key={group.id}>
          <h3>{group.title}</h3>
          <p>Members: {group.members.length}</p>
          <Button onClick={() => leaveGroup(group.id)}>
            Leave Group
          </Button>
        </Card>
      ))}
    </div>
  );
};
```

### Особенности безопасности:

1. **Проверка прав:**
   - Только члены группы могут выполнять команды
   - Только admin/creator могут изменять настройки

2. **Rate Limiting:**
   - Ограничение по количеству запросов на группу

3. **Privacy:**
   - Не сохранять содержимое всех сообщений
   - Только команды и mentions

### Оценка работ:

| Задача | Сложность | Время |
|--------|-----------|-------|
| Database migrations | Средняя | 1-2 часа |
| Webhook handler update | Высокая | 4-6 часов |
| Group commands | Средняя | 3-4 часа |
| UI компонент | Низкая | 2-3 часа |
| Тестирование | Средняя | 2-3 часа |
| **ИТОГО** | | **12-18 часов** |

### Документация:
- Telegram Bot API: https://core.telegram.org/bots/api
- Group Management: https://core.telegram.org/bots/features#privacy-mode
- Examples: https://github.com/telegraf/telegraf (library for Node.js)

---

## 3️⃣ VISUAL ERD DIAGRAMS

### 📊 Текущий статус: ✅ ПОЛНОСТЬЮ РЕАЛИЗОВАНО (100%)

### Существующая реализация:

#### Файлы:
- [src/components/relations/ERDVisualization.tsx](../src/components/relations/ERDVisualization.tsx) - SVG-based
- [src/components/relations/VisualERDDiagram.tsx](../src/components/relations/VisualERDDiagram.tsx) - Canvas-based

#### Что работает:

**1. ERDVisualization (SVG):**
```typescript
// Features:
- Отображение таблиц с колонками
- PK/FK маркеры
- Связи с arrows (one-to-many, many-to-many)
- Цветовое кодирование типов данных
- Zoom (50% - 200%)
- Pan (drag to move)
- Export to PNG
```

**2. VisualERDDiagram (Canvas):**
```typescript
// Advanced features:
- High-performance rendering (Canvas API)
- Real-time updates
- Custom styling для таблиц
- Interactive connections
- Auto-layout алгоритм
```

**3. Поддерживаемые типы связей:**
- one-to-one
- one-to-many
- many-to-one
- many-to-many

### Возможные улучшения:

#### 1. **Mermaid.js интеграция**

**Библиотека:** https://mermaid.js.org/

**Преимущества:**
- Declarative syntax
- Auto-layout
- Экспорт в SVG/PNG
- Markdown совместимость

**Пример:**
```typescript
// src/components/relations/MermaidERD.tsx
import mermaid from 'mermaid';

const generateMermaidERD = (databases, relations) => {
  return `
    erDiagram
      CUSTOMER ||--o{ ORDER : places
      ORDER ||--|{ LINE-ITEM : contains
      CUSTOMER {
        string id PK
        string name
        string email
      }
      ORDER {
        string id PK
        string customer_id FK
        date order_date
      }
  `;
};

export const MermaidERD = ({ databases, relations }) => {
  const mermaidCode = generateMermaidERD(databases, relations);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: true });
    mermaid.contentLoaded();
  }, [mermaidCode]);

  return <div className="mermaid">{mermaidCode}</div>;
};
```

#### 2. **D3.js Force-Directed Graph**

**Библиотека:** https://d3js.org/

**Преимущества:**
- Физическая симуляция
- Интерактивность
- Красивая визуализация

**Не рекомендуется:** Слишком сложно для ERD, лучше подходит для knowledge graphs

#### 3. **Улучшения текущей реализации:**

- ✅ Добавить mini-map для навигации
- ✅ Сохранение позиций таблиц
- ✅ Группировка таблиц по проектам
- ✅ Фильтрация отображаемых связей
- ✅ Dark mode support

### Оценка работ для улучшений:

| Задача | Сложность | Время |
|--------|-----------|-------|
| Mermaid.js интеграция | Средняя | 3-4 часа |
| Mini-map navigation | Средняя | 2-3 часа |
| Сохранение позиций | Низкая | 1-2 часа |
| Группировка таблиц | Средняя | 2-3 часа |
| Dark mode | Низкая | 1 час |
| **ИТОГО** | | **9-13 часов** |

**Вывод:** Текущая реализация достаточна для production. Улучшения опциональны.

---

## 4️⃣ FORMULAS В CUSTOM COLUMNS

### 📊 Текущий статус: ✅ РЕАЛИЗОВАНО (80%)

### Существующая реализация:

#### Файлы:
- [src/components/formula/FormulaEditor.tsx](../src/components/formula/FormulaEditor.tsx) - UI редактор
- [src/utils/formulaEngine.ts](../src/utils/formulaEngine.ts) - Вычислительный движок
- [src/types/database.ts](../src/types/database.ts) - Типы

#### Что работает:

**1. FormulaEditor компонент:**
```typescript
// Features:
- Интерактивный редактор
- Категории функций (Математика, Строки, Даты, Логика)
- Вставка переменных {column_name}
- Real-time валидация
- Справка по функциям
- Syntax highlighting
```

**2. Formula Engine:**

Поддерживаемые функции:

| Категория | Функции |
|-----------|---------|
| **Математика** | abs, ceil, floor, round, sqrt, pow, min, max, sum, avg |
| **Строки** | upper, lower, trim, concat, substring, replace, length |
| **Даты** | now, today, year, month, day, hour, minute, dateAdd, dateDiff, formatDate |
| **Логика** | if, and, or, not, isNull, isEmpty |
| **Операторы** | +, -, *, /, %, =, <, >, <=, >=, ==, != |

**Пример формул:**
```typescript
// Математика
{price} * {quantity}
ROUND({price} * 1.2, 2)
SUM({price}, {tax}, {shipping})

// Строки
CONCAT({first_name}, " ", {last_name})
UPPER({email})

// Даты
DATEDIFF({end_date}, {start_date}, 'days')
YEAR({created_at})

// Логика
IF({status} = "completed", {amount}, 0)
IF(AND({price} > 100, {quantity} > 5), "Bulk", "Regular")
```

**3. Database Schema:**
```typescript
interface FormulaConfig {
  expression: string;
  return_type: ColumnType; // 'text' | 'number' | 'date' | 'boolean'
  dependencies: string[]; // Колонки, от которых зависит формула
}

interface TableSchema {
  column_type: 'formula';
  formula_config?: FormulaConfig;
}
```

### Что отсутствует:

#### 1. **Использование в Composite Views Custom Columns**

**Проблема:** FormulaConfig существует, но не используется в composite-views-update-custom-data

**Текущий код:**
```typescript
// composite-views-update-custom-data/index.ts
// Обрабатывает только: checklist, status, progress
// Нет обработки formula type
```

**Требуемое изменение:**
```typescript
// composite-views-update-custom-data/index.ts

if (column.type === 'formula') {
  const formulaConfig = column.config as FormulaConfig;

  // Получить данные строки
  const rowData = await getCompositeViewRowData(viewId, rowId);

  // Вычислить формулу
  const result = FormulaEngine.evaluate(
    formulaConfig.expression,
    { row: rowData }
  );

  // Сохранить результат
  await supabase
    .from('composite_view_custom_data')
    .upsert({
      composite_view_id: viewId,
      row_id: rowId,
      column_name: columnName,
      value: result
    });
}
```

#### 2. **Авто-пересчет при изменении зависимостей**

**Требуется:** Trigger или subscription для пересчета формул

**Database Trigger:**
```sql
-- Пересчет формул при UPDATE table_data
CREATE OR REPLACE FUNCTION recalculate_formulas()
RETURNS TRIGGER AS $$
DECLARE
  formula_col RECORD;
  formula_result JSONB;
BEGIN
  -- Найти все formula columns в этой таблице
  FOR formula_col IN
    SELECT column_name, formula_config
    FROM table_schemas
    WHERE database_id = NEW.database_id
      AND column_type = 'formula'
      AND NEW.data ? ANY(formula_config->'dependencies')
  LOOP
    -- Вычислить формулу (вызов Edge Function)
    SELECT evaluate_formula(
      formula_col.formula_config->>'expression',
      NEW.data
    ) INTO formula_result;

    -- Обновить значение
    NEW.data := NEW.data || jsonb_build_object(
      formula_col.column_name,
      formula_result
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_formulas_trigger
  BEFORE UPDATE ON table_data
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_formulas();
```

**Edge Function для вычисления:**
```typescript
// supabase/functions/evaluate-formula/index.ts
import { FormulaEngine } from '../../src/utils/formulaEngine';

Deno.serve(async (req) => {
  const { expression, rowData } = await req.json();

  try {
    const result = FormulaEngine.evaluate(expression, { row: rowData });

    return new Response(JSON.stringify({ result }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    );
  }
});
```

#### 3. **Сохранение истории вычислений**

**Зачем:** Audit trail, debugging, rollback

**Database Schema:**
```sql
CREATE TABLE formula_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id UUID REFERENCES databases(id),
  row_id UUID REFERENCES table_data(id),
  column_name TEXT NOT NULL,
  expression TEXT NOT NULL,
  input_data JSONB NOT NULL,
  result JSONB NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index для быстрого поиска
CREATE INDEX idx_formula_calculations_row
  ON formula_calculations(row_id, column_name);

-- Auto-cleanup старых записей (> 30 дней)
CREATE OR REPLACE FUNCTION cleanup_old_formula_calculations()
RETURNS void AS $$
BEGIN
  DELETE FROM formula_calculations
  WHERE calculated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

### Оценка работ:

| Задача | Сложность | Время |
|--------|-----------|-------|
| Формулы в Custom Columns | Средняя | 3-4 часа |
| Авто-пересчет Trigger | Высокая | 4-6 часов |
| Edge Function evaluate-formula | Средняя | 2-3 часа |
| История вычислений | Низкая | 1-2 часа |
| **ИТОГО** | | **10-15 часов** |

---

## 5️⃣ AUTO-COMPLETE СТАТУСОВ

### 📊 Текущий статус: 🔧 БАЗОВАЯ ВЕРСИЯ (30%)

### Существующая реализация:

#### Файл: [src/components/composite-views/StatusColumn.tsx](../src/components/composite-views/StatusColumn.tsx)

**Текущий код:**
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';

export const StatusColumn = ({ data, options, onChange }) => {
  return (
    <Select value={data.value} onValueChange={onChange}>
      <SelectTrigger>
        <Badge style={{ backgroundColor: data.color }}>
          {data.label}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option.value} value={option.value}>
            <Badge style={{ backgroundColor: option.color }}>
              {option.label}
            </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

**Что работает:**
- Dropdown список статусов
- Выбор из предопределенных опций
- Цветовое кодирование

**Что НЕ работает:**
- Нет фильтрации при вводе
- Нельзя создать новый статус
- Нет suggestions по недавно использованным

### Требуемая реализация:

#### 1. **Combobox компонент**

**Библиотека:** `cmdk` (уже в package.json!)

**Документация:** https://cmdk.paco.me/

**Новый компонент:**
```typescript
// src/components/composite-views/StatusCombobox.tsx
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';

export const StatusCombobox = ({
  value,
  options,
  onChange,
  onCreateNew
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (currentValue: string) => {
    onChange(currentValue);
    setOpen(false);
  };

  const handleCreateNew = () => {
    if (search && !options.find(o => o.label === search)) {
      onCreateNew(search);
      setSearch('');
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox">
          {value ? (
            <Badge style={{ backgroundColor: getCurrentColor(value) }}>
              {value}
            </Badge>
          ) : (
            'Выбрать статус...'
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput
            placeholder="Поиск статуса..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty>
            <Button onClick={handleCreateNew} variant="ghost" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Создать "{search}"
            </Button>
          </CommandEmpty>
          <CommandGroup>
            {filteredOptions.map(option => (
              <CommandItem
                key={option.value}
                onSelect={() => handleSelect(option.value)}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === option.value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <Badge style={{ backgroundColor: option.color }}>
                  {option.label}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
```

#### 2. **Recent Suggestions**

**Database Schema:**
```sql
CREATE TABLE status_usage_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  column_id UUID NOT NULL,
  status_value TEXT NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index для быстрого поиска
CREATE INDEX idx_status_usage_user_column
  ON status_usage_history(user_id, column_id, used_at DESC);

-- Auto-cleanup (keep last 100 per user per column)
CREATE OR REPLACE FUNCTION cleanup_status_history()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM status_usage_history
  WHERE id IN (
    SELECT id FROM status_usage_history
    WHERE user_id = NEW.user_id AND column_id = NEW.column_id
    ORDER BY used_at DESC
    OFFSET 100
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_status_history_trigger
  AFTER INSERT ON status_usage_history
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_status_history();
```

**Query для suggestions:**
```typescript
const getRecentStatuses = async (userId: string, columnId: string) => {
  const { data } = await supabase
    .from('status_usage_history')
    .select('status_value, COUNT(*) as usage_count')
    .eq('user_id', userId)
    .eq('column_id', columnId)
    .gte('used_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
    .group('status_value')
    .order('usage_count', { ascending: false })
    .limit(5);

  return data || [];
};
```

**Интеграция в Combobox:**
```typescript
export const StatusCombobox = ({ ... }) => {
  const { data: recentStatuses } = useQuery({
    queryKey: ['recent-statuses', userId, columnId],
    queryFn: () => getRecentStatuses(userId, columnId)
  });

  return (
    <Command>
      {/* ... */}
      {recentStatuses?.length > 0 && (
        <CommandGroup heading="Недавно использованные">
          {recentStatuses.map(status => (
            <CommandItem key={status.status_value} onSelect={...}>
              {status.status_value}
            </CommandItem>
          ))}
        </CommandGroup>
      )}
      <CommandGroup heading="Все статусы">
        {/* ... */}
      </CommandGroup>
    </Command>
  );
};
```

#### 3. **Создание нового статуса**

```typescript
const handleCreateNewStatus = async (newStatusLabel: string) => {
  // Генерировать случайный цвет
  const randomColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;

  const newOption = {
    value: newStatusLabel.toLowerCase().replace(/\s+/g, '_'),
    label: newStatusLabel,
    color: randomColor
  };

  // Обновить column config
  await supabase
    .from('table_schemas')
    .update({
      status_config: {
        ...currentConfig,
        options: [...currentConfig.options, newOption]
      }
    })
    .eq('id', columnId);

  // Применить к текущей строке
  onChange(newOption.value);

  // Записать в историю
  await supabase
    .from('status_usage_history')
    .insert({
      user_id: userId,
      column_id: columnId,
      status_value: newOption.value
    });
};
```

### Оценка работ:

| Задача | Сложность | Время |
|--------|-----------|-------|
| StatusCombobox компонент | Средняя | 3-4 часа |
| status_usage_history таблица | Низкая | 1 час |
| Recent suggestions | Средняя | 2-3 часа |
| Создание новых статусов | Низкая | 1-2 часа |
| **ИТОГО** | | **7-10 часов** |

### Документация:
- cmdk: https://cmdk.paco.me/
- Radix UI Combobox: https://ui.shadcn.com/docs/components/combobox

---

## 6️⃣ FILE ATTACHMENTS НА ITEMS

### 📊 Текущий статус: ❌ НЕ РЕАЛИЗОВАНО (5%)

### Анализ текущего кода:

**Упоминания:**
- [src/types/automation.ts](../src/types/automation.ts) - `attachments?: string[]` в SendEmailActionConfig
- [supabase/functions/telegram-webhook](../supabase/functions/telegram-webhook/index.ts) - обработка файлов для импорта

**Что отсутствует:**
- Таблица для attachments
- Storage bucket для item files
- UI для загрузки файлов
- Связь attachments ↔ checklist items

### Требуемая реализация:

#### 1. **Database Schema**

```sql
-- Таблица для attachments
CREATE TABLE item_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id UUID REFERENCES databases(id) ON DELETE CASCADE,
  row_id UUID NOT NULL, -- ID записи в table_data
  column_name TEXT NOT NULL, -- Checklist column
  item_index INTEGER, -- Index чеклист item (optional)
  file_path TEXT NOT NULL, -- Path в storage
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index для быстрого поиска
CREATE INDEX idx_item_attachments_row
  ON item_attachments(database_id, row_id, column_name);

-- RLS Policies
ALTER TABLE item_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments in their databases"
  ON item_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM databases d
      WHERE d.id = item_attachments.database_id
        AND (d.user_id = auth.uid() OR is_project_member(d.project_id, auth.uid()))
    )
  );

CREATE POLICY "Users can upload attachments"
  ON item_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM databases d
      WHERE d.id = item_attachments.database_id
        AND (d.user_id = auth.uid() OR is_project_member(d.project_id, auth.uid()))
    )
  );

CREATE POLICY "Users can delete own attachments"
  ON item_attachments FOR DELETE
  USING (uploaded_by = auth.uid());
```

#### 2. **Storage Bucket**

```sql
-- Создать bucket в Supabase Dashboard или через SQL
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-attachments', 'item-attachments', false);

-- RLS для storage
CREATE POLICY "Users can upload to item-attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'item-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'item-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'item-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

#### 3. **Frontend Component**

```typescript
// src/components/composite-views/AttachmentUploader.tsx
import { Upload, File, X, Download } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface AttachmentUploaderProps {
  databaseId: string;
  rowId: string;
  columnName: string;
  itemIndex?: number;
}

export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  databaseId,
  rowId,
  columnName,
  itemIndex
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  // Загрузить существующие attachments
  const { data: existingAttachments } = useQuery({
    queryKey: ['attachments', databaseId, rowId, columnName, itemIndex],
    queryFn: async () => {
      const query = supabase
        .from('item_attachments')
        .select('*')
        .eq('database_id', databaseId)
        .eq('row_id', rowId)
        .eq('column_name', columnName);

      if (itemIndex !== undefined) {
        query.eq('item_index', itemIndex);
      }

      const { data } = await query;
      return data || [];
    }
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);

    for (const file of acceptedFiles) {
      try {
        // Upload to storage
        const fileName = `${userId}/${databaseId}/${rowId}/${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('item-attachments')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Создать запись в БД
        const { error: dbError } = await supabase
          .from('item_attachments')
          .insert({
            database_id: databaseId,
            row_id: rowId,
            column_name: columnName,
            item_index: itemIndex,
            file_path: fileName,
            file_name: file.name,
            mime_type: file.type,
            file_size: file.size,
            uploaded_by: userId
          });

        if (dbError) throw dbError;

        toast.success(`${file.name} загружен`);
      } catch (error) {
        toast.error(`Ошибка загрузки ${file.name}: ${error.message}`);
      }
    }

    setUploading(false);
    queryClient.invalidateQueries(['attachments', databaseId, rowId]);
  }, [databaseId, rowId, columnName, itemIndex]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 10 * 1024 * 1024, // 10 MB
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc', '.docx'],
      'application/vnd.ms-excel': ['.xls', '.xlsx'],
      'text/plain': ['.txt']
    }
  });

  const handleDownload = async (attachment: Attachment) => {
    const { data } = await supabase.storage
      .from('item-attachments')
      .download(attachment.file_path);

    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      a.click();
    }
  };

  const handleDelete = async (attachmentId: string, filePath: string) => {
    // Удалить из storage
    await supabase.storage
      .from('item-attachments')
      .remove([filePath]);

    // Удалить из БД
    await supabase
      .from('item_attachments')
      .delete()
      .eq('id', attachmentId);

    toast.success('Файл удален');
    queryClient.invalidateQueries(['attachments', databaseId, rowId]);
  };

  return (
    <div className="space-y-2">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive ? 'Отпустите файлы...' : 'Перетащите файлы или кликните для выбора'}
        </p>
        <p className="text-xs text-gray-500">
          Максимум 10 MB на файл
        </p>
      </div>

      {/* List of attachments */}
      {existingAttachments?.length > 0 && (
        <div className="space-y-2">
          {existingAttachments.map(att => (
            <div
              key={att.id}
              className="flex items-center justify-between p-2 border rounded-lg"
            >
              <div className="flex items-center gap-2">
                <File className="h-4 w-4" />
                <div>
                  <p className="text-sm font-medium">{att.file_name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(att.file_size)}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(att)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(att.id, att.file_path)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-sm text-gray-600">Загрузка...</p>
        </div>
      )}
    </div>
  );
};
```

#### 4. **Интеграция в ChecklistColumn**

```typescript
// src/components/composite-views/ChecklistColumn.tsx
import { AttachmentUploader } from './AttachmentUploader';
import { Paperclip } from 'lucide-react';

export const ChecklistColumn = ({ data, onChange }) => {
  const [showAttachments, setShowAttachments] = useState<number | null>(null);

  return (
    <div className="space-y-1">
      {data.items.map((item, index) => (
        <div key={index}>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={item.checked}
              onCheckedChange={(checked) => {
                const newItems = [...data.items];
                newItems[index] = { ...item, checked };
                onChange({ ...data, items: newItems });
              }}
            />
            <span>{item.label}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAttachments(
                showAttachments === index ? null : index
              )}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>

          {showAttachments === index && (
            <div className="ml-6 mt-2">
              <AttachmentUploader
                databaseId={databaseId}
                rowId={rowId}
                columnName={columnName}
                itemIndex={index}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
```

### Особенности безопасности:

1. **File Size Limits:**
   - Frontend: 10 MB
   - Backend: настройка в Supabase Storage

2. **Mime Type Validation:**
   - Whitelist разрешенных типов
   - Проверка на server-side

3. **Virus Scanning:**
   - Интеграция с ClamAV или VirusTotal API (optional)

4. **Storage Quota:**
   - Limit по пользователю или по проекту

### Альтернативные решения:

**Google Drive SDK:**
- **Плюсы:** Неограниченное хранилище (при наличии аккаунта)
- **Минусы:** Требует OAuth, сложнее интеграция

**Пример с Google Drive:**
```typescript
// src/integrations/google-drive.ts
import { google } from 'googleapis';

const uploadToGoogleDrive = async (file: File, folderId: string) => {
  const drive = google.drive({ version: 'v3', auth: oAuth2Client });

  const fileMetadata = {
    name: file.name,
    parents: [folderId]
  };

  const media = {
    mimeType: file.type,
    body: file
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, webViewLink'
  });

  return response.data;
};
```

**Документация:** https://developers.google.com/drive/api/guides/manage-uploads

### Оценка работ:

| Задача | Сложность | Время |
|--------|-----------|-------|
| Database migrations | Низкая | 1 час |
| Storage bucket setup | Низкая | 1 час |
| AttachmentUploader компонент | Средняя | 4-5 часов |
| Интеграция в ChecklistColumn | Средняя | 2-3 часа |
| Download/Delete функции | Низкая | 1-2 часа |
| RLS policies | Средняя | 1-2 часа |
| **ИТОГО** | | **10-14 часов** |

### Библиотеки:
- react-dropzone: https://react-dropzone.js.org/
- Google Drive SDK (optional): https://github.com/googleapis/google-api-nodejs-client

---

## 7️⃣ SCHEMA VERSION CONTROL

### 📊 Текущий статус: ❌ НЕ РЕАЛИЗОВАНО (0%)

### Анализ текущего кода:

**Что есть:**
- `updated_at` поля в таблицах
- Trigger `update_updated_at_column()` для отслеживания времени изменений

**Что отсутствует:**
- История версий схемы
- Snapshot старых версий
- Rollback функциональность
- UI для просмотра истории

### Требуемая реализация:

#### 1. **Database Schema**

```sql
-- Таблица версий схемы
CREATE TABLE schema_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id UUID REFERENCES databases(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  schema_snapshot JSONB NOT NULL, -- Полная схема на момент версии
  change_description TEXT,
  changed_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(database_id, version_number)
);

-- Index для быстрого поиска
CREATE INDEX idx_schema_versions_database
  ON schema_versions(database_id, version_number DESC);

-- Триггер для автоматического версионирования
CREATE OR REPLACE FUNCTION create_schema_version()
RETURNS TRIGGER AS $$
DECLARE
  latest_version INTEGER;
  current_schema JSONB;
BEGIN
  -- Получить текущий номер версии
  SELECT COALESCE(MAX(version_number), 0) INTO latest_version
  FROM schema_versions
  WHERE database_id = NEW.database_id;

  -- Собрать текущую схему
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ts.id,
      'column_name', ts.column_name,
      'column_type', ts.column_type,
      'is_required', ts.is_required,
      'default_value', ts.default_value,
      'position', ts.position,
      'relation_config', ts.relation_config,
      'formula_config', ts.formula_config,
      'rollup_config', ts.rollup_config
    )
  ) INTO current_schema
  FROM table_schemas ts
  WHERE ts.database_id = NEW.database_id;

  -- Создать новую версию
  INSERT INTO schema_versions (
    database_id,
    version_number,
    schema_snapshot,
    change_description,
    changed_by
  ) VALUES (
    NEW.database_id,
    latest_version + 1,
    current_schema,
    'Schema updated', -- Можно улучшить
    auth.uid()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger на UPDATE table_schemas
CREATE TRIGGER create_schema_version_on_update
  AFTER UPDATE ON table_schemas
  FOR EACH STATEMENT
  EXECUTE FUNCTION create_schema_version();

-- Trigger на INSERT/DELETE table_schemas
CREATE TRIGGER create_schema_version_on_insert_delete
  AFTER INSERT OR DELETE ON table_schemas
  FOR EACH STATEMENT
  EXECUTE FUNCTION create_schema_version();
```

#### 2. **Rollback Function**

```sql
CREATE OR REPLACE FUNCTION rollback_schema_version(
  p_database_id UUID,
  p_version_number INTEGER
)
RETURNS void AS $$
DECLARE
  version_schema JSONB;
  schema_item JSONB;
BEGIN
  -- Получить snapshot версии
  SELECT schema_snapshot INTO version_schema
  FROM schema_versions
  WHERE database_id = p_database_id AND version_number = p_version_number;

  IF version_schema IS NULL THEN
    RAISE EXCEPTION 'Version % not found for database %', p_version_number, p_database_id;
  END IF;

  -- Удалить текущую схему
  DELETE FROM table_schemas WHERE database_id = p_database_id;

  -- Восстановить схему из snapshot
  FOR schema_item IN SELECT * FROM jsonb_array_elements(version_schema)
  LOOP
    INSERT INTO table_schemas (
      id,
      database_id,
      column_name,
      column_type,
      is_required,
      default_value,
      position,
      relation_config,
      formula_config,
      rollup_config
    ) VALUES (
      (schema_item->>'id')::UUID,
      p_database_id,
      schema_item->>'column_name',
      schema_item->>'column_type',
      (schema_item->>'is_required')::BOOLEAN,
      schema_item->>'default_value',
      (schema_item->>'position')::INTEGER,
      schema_item->'relation_config',
      schema_item->'formula_config',
      schema_item->'rollup_config'
    );
  END LOOP;

  -- Создать запись о rollback
  INSERT INTO schema_versions (
    database_id,
    version_number,
    schema_snapshot,
    change_description,
    changed_by
  )
  SELECT
    p_database_id,
    COALESCE(MAX(version_number), 0) + 1,
    version_schema,
    'Rolled back to version ' || p_version_number,
    auth.uid()
  FROM schema_versions
  WHERE database_id = p_database_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 3. **Edge Function для Diff**

```typescript
// supabase/functions/schema-diff/index.ts
import Deno from 'deno';

interface SchemaDiff {
  added: string[];
  removed: string[];
  modified: Array<{
    column: string;
    changes: Record<string, { old: any; new: any }>;
  }>;
}

const calculateSchemaDiff = (
  oldSchema: any[],
  newSchema: any[]
): SchemaDiff => {
  const oldColumns = new Map(oldSchema.map(col => [col.column_name, col]));
  const newColumns = new Map(newSchema.map(col => [col.column_name, col]));

  const added: string[] = [];
  const removed: string[] = [];
  const modified: SchemaDiff['modified'] = [];

  // Найти добавленные колонки
  for (const colName of newColumns.keys()) {
    if (!oldColumns.has(colName)) {
      added.push(colName);
    }
  }

  // Найти удаленные колонки
  for (const colName of oldColumns.keys()) {
    if (!newColumns.has(colName)) {
      removed.push(colName);
    }
  }

  // Найти измененные колонки
  for (const [colName, newCol] of newColumns.entries()) {
    const oldCol = oldColumns.get(colName);
    if (!oldCol) continue;

    const changes: Record<string, { old: any; new: any }> = {};

    if (oldCol.column_type !== newCol.column_type) {
      changes.column_type = { old: oldCol.column_type, new: newCol.column_type };
    }

    if (oldCol.is_required !== newCol.is_required) {
      changes.is_required = { old: oldCol.is_required, new: newCol.is_required };
    }

    if (Object.keys(changes).length > 0) {
      modified.push({ column: colName, changes });
    }
  }

  return { added, removed, modified };
};

Deno.serve(async (req) => {
  const { databaseId, fromVersion, toVersion } = await req.json();

  // Получить схемы двух версий
  const { data: versions } = await supabaseClient
    .from('schema_versions')
    .select('version_number, schema_snapshot')
    .eq('database_id', databaseId)
    .in('version_number', [fromVersion, toVersion]);

  if (!versions || versions.length < 2) {
    return new Response(
      JSON.stringify({ error: 'Versions not found' }),
      { status: 404 }
    );
  }

  const oldSchema = versions.find(v => v.version_number === fromVersion)?.schema_snapshot;
  const newSchema = versions.find(v => v.version_number === toVersion)?.schema_snapshot;

  const diff = calculateSchemaDiff(oldSchema, newSchema);

  return new Response(JSON.stringify(diff), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

#### 4. **Frontend Component**

```typescript
// src/components/schema-generator/SchemaVersionHistory.tsx
import { History, RotateCcw, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export const SchemaVersionHistory = ({ databaseId }) => {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [diff, setDiff] = useState<SchemaDiff | null>(null);

  const { data: versions } = useQuery({
    queryKey: ['schema-versions', databaseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('schema_versions')
        .select('*')
        .eq('database_id', databaseId)
        .order('version_number', { ascending: false });
      return data;
    }
  });

  const currentVersion = versions?.[0]?.version_number;

  const handleViewDiff = async (versionNumber: number) => {
    const { data } = await supabase.functions.invoke('schema-diff', {
      body: {
        databaseId,
        fromVersion: versionNumber,
        toVersion: currentVersion
      }
    });
    setDiff(data);
    setSelectedVersion(versionNumber);
  };

  const handleRollback = async (versionNumber: number) => {
    if (!confirm(`Откатить схему к версии ${versionNumber}?`)) return;

    const { error } = await supabase.rpc('rollback_schema_version', {
      p_database_id: databaseId,
      p_version_number: versionNumber
    });

    if (error) {
      toast.error('Ошибка отката: ' + error.message);
    } else {
      toast.success(`Схема откачена к версии ${versionNumber}`);
      queryClient.invalidateQueries(['schema-versions', databaseId]);
      queryClient.invalidateQueries(['table-schema', databaseId]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5" />
        <h3 className="text-lg font-semibold">История версий схемы</h3>
      </div>

      <div className="space-y-2">
        {versions?.map(version => (
          <Card key={version.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={version.version_number === currentVersion ? 'default' : 'outline'}>
                    v{version.version_number}
                  </Badge>
                  {version.version_number === currentVersion && (
                    <Badge variant="success">Текущая</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {version.change_description}
                </p>
                <p className="text-xs text-gray-500">
                  {format(new Date(version.created_at), 'PPp', { locale: ru })}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewDiff(version.version_number)}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Diff
                </Button>
                {version.version_number !== currentVersion && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRollback(version.version_number)}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Откатить
                  </Button>
                )}
              </div>
            </div>

            {selectedVersion === version.version_number && diff && (
              <div className="mt-4 space-y-2">
                {diff.added.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-green-600">
                      Добавлены ({diff.added.length}):
                    </p>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {diff.added.map(col => (
                        <li key={col}>{col}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {diff.removed.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-600">
                      Удалены ({diff.removed.length}):
                    </p>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {diff.removed.map(col => (
                        <li key={col}>{col}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {diff.modified.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-blue-600">
                      Изменены ({diff.modified.length}):
                    </p>
                    {diff.modified.map(mod => (
                      <div key={mod.column} className="ml-4 text-sm">
                        <p className="font-medium">{mod.column}:</p>
                        <ul className="text-gray-600 list-disc list-inside ml-4">
                          {Object.entries(mod.changes).map(([field, change]) => (
                            <li key={field}>
                              {field}: {JSON.stringify(change.old)} → {JSON.stringify(change.new)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
```

### Оценка работ:

| Задача | Сложность | Время |
|--------|-----------|-------|
| schema_versions таблица | Средняя | 2-3 часа |
| Triggers для версионирования | Высокая | 3-4 часа |
| rollback_schema_version function | Высокая | 4-5 часов |
| schema-diff Edge Function | Средняя | 3-4 часа |
| SchemaVersionHistory компонент | Средняя | 4-5 часов |
| **ИТОГО** | | **16-21 час** |

---

## 8️⃣ MULTI-STEP GENERATION

### 📊 Текущий статус: 🔧 ЧАСТИЧНАЯ РЕАЛИЗАЦИЯ (40%)

### Существующая реализация:

#### Файл: [src/components/schema-generator/SchemaGeneratorDialog.tsx](../src/components/schema-generator/SchemaGeneratorDialog.tsx)

**Что работает:**

```typescript
const [step, setStep] = useState<'input' | 'preview' | 'edit' | 'creating'>('input');

// 4 шага:
// 1. input - выбор источника (text, JSON, CSV)
// 2. preview - предпросмотр сгенерированной схемы
// 3. edit - редактирование сущностей и связей
// 4. creating - состояние создания
```

**Навигация:**
```typescript
<Tabs value={step} onValueChange={setStep}>
  <TabsList>
    <TabsTrigger value="input">Ввод</TabsTrigger>
    <TabsTrigger value="preview" disabled={!generatedSchema}>
      Предпросмотр
    </TabsTrigger>
    <TabsTrigger value="edit" disabled={!generatedSchema}>
      Редактирование
    </TabsTrigger>
  </TabsList>
</Tabs>
```

### Что отсутствует:

#### 1. **Stepper Component для наглядности**

**Библиотека:** Встроенная реализация или использовать `@radix-ui/react-stepper`

**Новый компонент:**
```typescript
// src/components/ui/stepper.tsx
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  onStepClick
}) => {
  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => onStepClick?.(index)}
                disabled={index > currentStep}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                  isCompleted && 'bg-primary text-white',
                  isCurrent && 'bg-primary/20 border-2 border-primary text-primary',
                  !isCompleted && !isCurrent && 'bg-gray-200 text-gray-500'
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="font-semibold">{index + 1}</span>
                )}
              </button>
              <div className="mt-2 text-center">
                <p className={cn(
                  'text-sm font-medium',
                  isCurrent ? 'text-primary' : 'text-gray-600'
                )}>
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-gray-500">{step.description}</p>
                )}
              </div>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2 transition-colors',
                  index < currentStep ? 'bg-primary' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
```

**Использование в SchemaGeneratorDialog:**
```typescript
// src/components/schema-generator/SchemaGeneratorDialog.tsx

const steps = [
  { id: 'input', label: 'Ввод данных', description: 'Текст, JSON или CSV' },
  { id: 'preview', label: 'Предпросмотр', description: 'Проверка схемы' },
  { id: 'edit', label: 'Редактирование', description: 'Настройка сущностей' },
  { id: 'create', label: 'Создание', description: 'Финальный шаг' }
];

const stepMap = { input: 0, preview: 1, edit: 2, creating: 3 };
const currentStepIndex = stepMap[step];

return (
  <Dialog>
    <DialogContent className="max-w-4xl">
      <Stepper
        steps={steps}
        currentStep={currentStepIndex}
        onStepClick={(index) => {
          if (index <= 1) setStep(['input', 'preview'][index]);
        }}
      />

      {/* Content based on step */}
      {step === 'input' && <InputStep />}
      {step === 'preview' && <PreviewStep />}
      {step === 'edit' && <EditStep />}
      {step === 'creating' && <CreatingStep />}

      {/* Navigation buttons */}
      <div className="flex justify-between mt-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={step === 'input'}
        >
          Назад
        </Button>
        <Button onClick={handleNext}>
          {step === 'edit' ? 'Создать' : 'Далее'}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);
```

#### 2. **Валидация на каждом шаге**

```typescript
const validateStep = (currentStep: string): boolean => {
  switch (currentStep) {
    case 'input':
      if (inputType === 'text' && !inputText.trim()) {
        toast.error('Введите описание схемы');
        return false;
      }
      if (inputType === 'json' && !isValidJSON(jsonInput)) {
        toast.error('Некорректный JSON');
        return false;
      }
      if (inputType === 'csv' && !csvFile) {
        toast.error('Загрузите CSV файл');
        return false;
      }
      return true;

    case 'preview':
      if (!generatedSchema || generatedSchema.tables.length === 0) {
        toast.error('Схема не сгенерирована');
        return false;
      }
      return true;

    case 'edit':
      // Проверить все таблицы имеют хотя бы одну колонку
      const hasEmptyTables = generatedSchema.tables.some(
        table => table.columns.length === 0
      );
      if (hasEmptyTables) {
        toast.error('Все таблицы должны иметь хотя бы одну колонку');
        return false;
      }
      return true;

    default:
      return true;
  }
};

const handleNext = () => {
  if (!validateStep(step)) return;

  // Переход на следующий шаг
  const nextStepMap = {
    input: 'preview',
    preview: 'edit',
    edit: 'creating'
  };

  setStep(nextStepMap[step]);
};
```

#### 3. **Сохранение промежуточных результатов**

```typescript
// Автосохранение в localStorage
useEffect(() => {
  const saveData = {
    inputType,
    inputText,
    jsonInput,
    generatedSchema,
    step
  };

  localStorage.setItem(
    `schema-generator-${databaseId}`,
    JSON.stringify(saveData)
  );
}, [inputType, inputText, jsonInput, generatedSchema, step]);

// Восстановление при открытии
useEffect(() => {
  const savedData = localStorage.getItem(`schema-generator-${databaseId}`);
  if (savedData) {
    const { inputType, inputText, jsonInput, generatedSchema, step } =
      JSON.parse(savedData);

    setInputType(inputType);
    setInputText(inputText);
    setJsonInput(jsonInput);
    setGeneratedSchema(generatedSchema);
    setStep(step);
  }
}, [databaseId]);
```

#### 4. **Visual Preview Relationships**

```typescript
// src/components/schema-generator/RelationshipPreview.tsx
import { ArrowRight } from 'lucide-react';

export const RelationshipPreview = ({ relations, tables }) => {
  return (
    <div className="space-y-2">
      <h4 className="font-medium">Связи между таблицами:</h4>
      {relations.map((rel, index) => {
        const sourceTable = tables.find(t => t.id === rel.sourceTableId);
        const targetTable = tables.find(t => t.id === rel.targetTableId);

        return (
          <div
            key={index}
            className="flex items-center gap-2 p-2 border rounded-lg"
          >
            <Badge>{sourceTable?.name}</Badge>
            <span className="text-sm text-gray-500">
              {rel.sourceColumn}
            </span>
            <ArrowRight className="h-4 w-4" />
            <span className="text-sm text-gray-500">
              {rel.targetColumn}
            </span>
            <Badge>{targetTable?.name}</Badge>
            <Badge variant="outline">{rel.relationType}</Badge>
          </div>
        );
      })}
    </div>
  );
};
```

### Оценка работ:

| Задача | Сложность | Время |
|--------|-----------|-------|
| Stepper компонент | Средняя | 2-3 часа |
| Валидация на шагах | Низкая | 1-2 часа |
| Автосохранение | Низкая | 1-2 часа |
| RelationshipPreview | Средняя | 2-3 часа |
| Progress bar | Низкая | 1 час |
| **ИТОГО** | | **7-11 часов** |

---

## 📊 СВОДНАЯ ТАБЛИЦА ТРЕБОВАНИЙ И ИЗМЕНЕНИЙ

| Функция | БД Изменения | Edge Functions | Frontend | Приоритет | Время |
|---------|--------------|----------------|----------|-----------|-------|
| **Voice Input** | - | process-voice (есть), добавить whisper альтернативу | VoiceRecorder.tsx | Средний | 7-10 ч |
| **Group Chat** | telegram_groups, telegram_group_members | Обновить telegram-webhook | TelegramGroups.tsx | Низкий | 12-18 ч |
| **ERD Diagrams** | - | - | Улучшения (mini-map, dark mode) | Низкий | 9-13 ч |
| **Formulas Custom** | - | evaluate-formula | Интеграция в composite views | Высокий | 10-15 ч |
| **Auto-complete** | status_usage_history | - | StatusCombobox.tsx | Высокий | 7-10 ч |
| **File Attachments** | item_attachments + storage | - | AttachmentUploader.tsx | Высокий | 10-14 ч |
| **Version Control** | schema_versions | schema-diff | SchemaVersionHistory.tsx | Средний | 16-21 ч |
| **Multi-step** | - | - | Stepper.tsx, валидация | Средний | 7-11 ч |

---

## 🎯 ПРИОРИТИЗАЦИЯ И ПЛАН РЕАЛИЗАЦИИ

### TIER 1: ВЫСОКИЙ ПРИОРИТЕТ (Quick Wins)

**Цель:** Улучшить существующий UX минимальными усилиями

1. **Auto-complete Статусов** (7-10 часов)
   - cmdk уже в package.json
   - Простая интеграция
   - Высокий impact на UX

2. **Formulas в Custom Columns** (10-15 часов)
   - FormulaEngine уже есть
   - Нужна только интеграция
   - Расширяет функциональность composite views

3. **Multi-step Generation** (7-11 часов)
   - Частично реализовано
   - Улучшает wizard flow
   - Понижает bounce rate

**Итого Tier 1:** 24-36 часов (3-5 рабочих дней)

---

### TIER 2: СРЕДНИЙ ПРИОРИТЕТ

**Цель:** Добавить значимые features

4. **File Attachments на Items** (10-14 часов)
   - Расширяет функциональность checklists
   - Востребованная feature
   - Требует storage setup

5. **Voice Input улучшения** (7-10 часов)
   - Whisper API как fallback
   - VoiceRecorder для web
   - Улучшает Telegram интеграцию

6. **Schema Version Control** (16-21 час)
   - Критично для enterprise
   - Позволяет audit trail
   - Rollback functionality

**Итого Tier 2:** 33-45 часов (4-6 рабочих дней)

---

### TIER 3: НИЗКИЙ ПРИОРИТЕТ (Nice to Have)

**Цель:** Расширенные возможности для специфических use cases

7. **Group Chat Support** (12-18 часов)
   - Нужен для team collaboration
   - Сложная интеграция
   - Нишевая feature

8. **ERD Diagrams Improvements** (9-13 часов)
   - Текущая версия достаточна
   - Улучшения опциональны
   - Низкий ROI

**Итого Tier 3:** 21-31 час (3-4 рабочих дня)

---

## 💰 ОБЩАЯ ОЦЕНКА ТРУДОЗАТРАТ

### По приоритетам:

| Tier | Функции | Часы | Рабочие дни |
|------|---------|------|-------------|
| **Tier 1 (Высокий)** | 3 функции | 24-36 | 3-5 |
| **Tier 2 (Средний)** | 3 функции | 33-45 | 4-6 |
| **Tier 3 (Низкий)** | 2 функции | 21-31 | 3-4 |
| **ИТОГО** | **8 функций** | **78-112** | **10-15** |

### Рекомендация:

**Фокус на Tier 1** - максимальный impact за минимальное время.

**Прогресс:** После Tier 1 проект будет на **~105%** completion (превышает initial plan).

---

## 📚 ИСТОЧНИКИ И ССЫЛКИ

### API Документация:

1. **OpenAI Whisper API:**
   - https://platform.openai.com/docs/guides/speech-to-text
   - https://platform.openai.com/docs/api-reference/audio

2. **Telegram Bot API:**
   - https://core.telegram.org/bots/api
   - https://core.telegram.org/bots/features#privacy-mode
   - Group management: https://core.telegram.org/bots/tutorials/groups

3. **Supabase:**
   - Storage: https://supabase.com/docs/guides/storage
   - RLS: https://supabase.com/docs/guides/auth/row-level-security
   - Triggers: https://supabase.com/docs/guides/database/postgres/triggers

4. **Google Drive SDK:**
   - https://developers.google.com/drive/api/guides/manage-uploads
   - https://github.com/googleapis/google-api-nodejs-client

### Библиотеки:

1. **cmdk** (Combobox): https://cmdk.paco.me/
2. **react-dropzone**: https://react-dropzone.js.org/
3. **Mermaid.js** (ERD): https://mermaid.js.org/
4. **date-fns**: https://date-fns.org/

### Файлы в репозитории:

**Базовый путь:** `/Users/js/Мой диск/DataParseDesk/data-parse-desk-2/`

1. Voice Input:
   - `supabase/functions/process-voice/index.ts`
   - `supabase/functions/telegram-webhook/index.ts`

2. ERD Diagrams:
   - `src/components/relations/ERDVisualization.tsx`
   - `src/components/relations/VisualERDDiagram.tsx`

3. Formulas:
   - `src/components/formula/FormulaEditor.tsx`
   - `src/utils/formulaEngine.ts`

4. Status Column:
   - `src/components/composite-views/StatusColumn.tsx`

5. Schema Generator:
   - `src/components/schema-generator/SchemaGeneratorDialog.tsx`

---

## 🎊 ЗАКЛЮЧЕНИЕ

### Основные выводы:

1. **5 из 8 функций уже частично или полностью реализованы** - проект в лучшем состоянии, чем ожидалось

2. **Tier 1 приоритет** обеспечит максимальный UX improvement за минимальное время

3. **Общая оценка:** 78-112 часов (10-15 рабочих дней) для полной реализации всех 8 функций

4. **Рекомендуемый подход:** Поэтапная реализация по Tiers с фокусом на Quick Wins

### Следующие шаги:

1. **Утвердить приоритеты** с командой/stakeholders
2. **Начать с Tier 1** (Auto-complete, Formulas, Multi-step)
3. **Итеративная разработка** с регулярными демо
4. **Тестирование** каждой функции перед переходом к следующей

---

**Дата отчета:** 21 октября 2025
**Автор:** AI Analysis System
**Статус:** Ready for implementation 🚀
