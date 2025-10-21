# REST API Documentation

Data Parse Desk REST API для интеграции с внешними системами.

## Базовая информация

- **Base URL**: `https://your-project.supabase.co/functions/v1/rest-api`
- **Authentication**: API Key в header `x-api-key`
- **Rate Limit**: 1000 запросов/час (по умолчанию, настраивается)
- **Response Format**: JSON

## Аутентификация

Все запросы требуют API ключ в заголовке:

```bash
curl -H "x-api-key: dpd_your_api_key_here" \
  https://your-project.supabase.co/functions/v1/rest-api/databases
```

### Получение API ключа

1. Войдите в Data Parse Desk
2. Перейдите в Settings → API Keys
3. Создайте новый ключ с нужными правами доступа
4. Скопируйте ключ (показывается только один раз)

## Endpoints

### Databases

#### Список баз данных

```http
GET /rest-api/databases
```

**Query Parameters:**
- `page` (optional): Номер страницы (по умолчанию: 1)
- `limit` (optional): Элементов на странице (по умолчанию: 20, max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "My Database",
      "description": "Database description",
      "schema": {...},
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

#### Получить базу данных

```http
GET /rest-api/databases/{id}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "My Database",
    "description": "Database description",
    "schema": {...},
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Создать базу данных

```http
POST /rest-api/databases
```

**Request Body:**
```json
{
  "name": "New Database",
  "description": "Optional description",
  "schema": {...}
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "uuid",
    "name": "New Database",
    ...
  }
}
```

#### Обновить базу данных

```http
PUT /rest-api/databases/{id}
PATCH /rest-api/databases/{id}
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response:** `200 OK`

#### Удалить базу данных

```http
DELETE /rest-api/databases/{id}
```

**Response:** `200 OK`
```json
{
  "message": "Database deleted successfully"
}
```

---

### Rows (Записи)

#### Список записей

```http
GET /rest-api/rows?database_id={database_id}
```

**Query Parameters:**
- `database_id` (required): ID базы данных
- `page` (optional): Номер страницы
- `limit` (optional): Элементов на странице

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "database_id": "uuid",
      "data": {...},
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {...}
}
```

#### Получить запись

```http
GET /rest-api/rows/{id}?database_id={database_id}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "database_id": "uuid",
    "data": {...}
  }
}
```

#### Создать запись

```http
POST /rest-api/rows?database_id={database_id}
```

**Request Body:**
```json
{
  "data": {
    "field1": "value1",
    "field2": "value2"
  }
}
```

**Response:** `201 Created`

#### Обновить запись

```http
PUT /rest-api/rows/{id}?database_id={database_id}
PATCH /rest-api/rows/{id}?database_id={database_id}
```

**Request Body:**
```json
{
  "data": {
    "field1": "new_value"
  }
}
```

**Response:** `200 OK`

#### Удалить запись

```http
DELETE /rest-api/rows/{id}?database_id={database_id}
```

**Response:** `200 OK`

---

### Projects

#### Список проектов

```http
GET /rest-api/projects
```

**Query Parameters:**
- `page` (optional): Номер страницы
- `limit` (optional): Элементов на странице

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Project Name",
      "description": "Project description",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {...}
}
```

#### Получить проект

```http
GET /rest-api/projects/{id}
```

#### Создать проект

```http
POST /rest-api/projects
```

**Request Body:**
```json
{
  "name": "New Project",
  "description": "Optional description"
}
```

#### Обновить проект

```http
PUT /rest-api/projects/{id}
PATCH /rest-api/projects/{id}
```

#### Удалить проект

```http
DELETE /rest-api/projects/{id}
```

---

## Права доступа (Permissions)

Каждый API ключ имеет гранулярные права:

```json
{
  "databases": {
    "read": true,
    "write": true,
    "delete": false
  },
  "rows": {
    "read": true,
    "write": true,
    "delete": true
  },
  "projects": {
    "read": true,
    "write": false,
    "delete": false
  }
}
```

## Коды ответов

| Код | Описание |
|-----|----------|
| `200` | Успешный запрос |
| `201` | Ресурс создан |
| `400` | Ошибка в запросе |
| `401` | API ключ не предоставлен или невалидный |
| `403` | Недостаточно прав доступа |
| `404` | Ресурс не найден |
| `429` | Превышен rate limit |
| `500` | Внутренняя ошибка сервера |

## Обработка ошибок

Все ошибки возвращаются в формате:

```json
{
  "error": "Error message here"
}
```

Примеры ошибок:

### 401 Unauthorized
```json
{
  "error": "API key required. Provide it in x-api-key header."
}
```

### 403 Forbidden
```json
{
  "error": "Permission denied: databases.write required"
}
```

### 429 Rate Limit
```json
{
  "error": "Rate limit exceeded",
  "limit": 1000
}
```

## Rate Limiting

- По умолчанию: 1000 запросов/час
- Лимит настраивается для каждого ключа отдельно
- Счётчик сбрасывается каждый час
- При превышении лимита возвращается `429 Too Many Requests`

### Headers для отслеживания лимита

В будущих версиях будут добавлены headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1609459200
```

## Примеры использования

### JavaScript/Node.js

```javascript
const API_KEY = 'dpd_your_api_key';
const BASE_URL = 'https://your-project.supabase.co/functions/v1/rest-api';

// Получить список баз данных
async function getDatabases() {
  const response = await fetch(`${BASE_URL}/databases`, {
    headers: {
      'x-api-key': API_KEY,
    },
  });

  const result = await response.json();
  return result.data;
}

// Создать новую запись
async function createRow(databaseId, rowData) {
  const response = await fetch(`${BASE_URL}/rows?database_id=${databaseId}`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: rowData }),
  });

  return await response.json();
}
```

### Python

```python
import requests

API_KEY = 'dpd_your_api_key'
BASE_URL = 'https://your-project.supabase.co/functions/v1/rest-api'

headers = {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json'
}

# Получить список баз данных
def get_databases():
    response = requests.get(f'{BASE_URL}/databases', headers=headers)
    return response.json()['data']

# Создать новую запись
def create_row(database_id, row_data):
    response = requests.post(
        f'{BASE_URL}/rows?database_id={database_id}',
        headers=headers,
        json={'data': row_data}
    )
    return response.json()
```

### cURL

```bash
# Получить список баз данных
curl -H "x-api-key: dpd_your_api_key" \
  https://your-project.supabase.co/functions/v1/rest-api/databases

# Создать новую базу данных
curl -X POST \
  -H "x-api-key: dpd_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Database","description":"Created via API"}' \
  https://your-project.supabase.co/functions/v1/rest-api/databases

# Получить записи с пагинацией
curl -H "x-api-key: dpd_your_api_key" \
  "https://your-project.supabase.co/functions/v1/rest-api/rows?database_id=uuid&page=2&limit=50"

# Обновить запись
curl -X PATCH \
  -H "x-api-key: dpd_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"data":{"status":"completed"}}' \
  "https://your-project.supabase.co/functions/v1/rest-api/rows/row-uuid?database_id=db-uuid"

# Удалить базу данных
curl -X DELETE \
  -H "x-api-key: dpd_your_api_key" \
  https://your-project.supabase.co/functions/v1/rest-api/databases/uuid
```

## Best Practices

### 1. Безопасность ключей

- Никогда не коммитьте API ключи в git
- Используйте переменные окружения
- Регулярно ротируйте ключи
- Создавайте отдельные ключи для разных приложений

```javascript
// ✅ Правильно
const API_KEY = process.env.DATAPARSEDESK_API_KEY;

// ❌ Неправильно
const API_KEY = 'dpd_1234567890abcdef';
```

### 2. Обработка ошибок

Всегда проверяйте статус ответа:

```javascript
async function safeApiCall() {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error.message);
    // Handle error appropriately
  }
}
```

### 3. Пагинация больших результатов

Для больших датасетов используйте пагинацию:

```javascript
async function getAllDatabases() {
  const allData = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await fetch(
      `${BASE_URL}/databases?page=${page}&limit=100`,
      { headers: { 'x-api-key': API_KEY } }
    ).then(r => r.json());

    allData.push(...result.data);
    hasMore = page < result.pagination.totalPages;
    page++;
  }

  return allData;
}
```

### 4. Rate Limiting

Реализуйте exponential backoff при получении 429:

```javascript
async function apiCallWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    return response;
  }

  throw new Error('Rate limit exceeded after retries');
}
```

## Мониторинг и аналитика

Отслеживайте использование API в Data Parse Desk:

1. **Settings → API Keys** - список всех ключей
2. **API Usage** tab - детальная статистика:
   - Количество запросов
   - Response times
   - Ошибки
   - Top endpoints
   - IP addresses

## OpenAPI Specification

Полная OpenAPI 3.0 спецификация доступна по адресу:

```
https://your-project.supabase.co/functions/v1/rest-api/openapi.json
```

Используйте с инструментами:
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Postman](https://www.postman.com/)
- [Insomnia](https://insomnia.rest/)

## Changelog

### v1.0.0 (2024-01-01)
- Первый релиз REST API
- Endpoints для databases, rows, projects
- API Key authentication
- Rate limiting
- Pagination support

## Поддержка

Если у вас возникли проблемы:

1. Проверьте [API Documentation](https://docs.dataparsedesk.com/api)
2. Посмотрите примеры в [GitHub Repository](https://github.com/dataparsedesk/examples)
3. Свяжитесь с поддержкой: support@dataparsedesk.com

## Roadmap

Планируемые функции:

- [ ] Webhook subscriptions через API
- [ ] Bulk operations (создание нескольких записей за раз)
- [ ] Advanced filtering и sorting
- [ ] GraphQL endpoint
- [ ] WebSocket real-time updates
- [ ] OAuth 2.0 authentication
