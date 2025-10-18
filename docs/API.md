# API Documentation

## Edge Functions

### 1. ai-orchestrator
**Purpose:** Orchestrates AI requests to Lovable AI Gateway  
**Authentication:** Required (`verify_jwt = true`)  
**Endpoint:** `/functions/v1/ai-orchestrator`

**Request:**
```json
{
  "type": "suggest" | "analyze" | "validate" | "transform" | "enrich" | "chat",
  "prompt": "string",
  "context": "object (optional)"
}
```

**Response:**
```json
{
  "result": "string",
  "creditsUsed": "number",
  "tokensUsed": "number"
}
```

**Supported Models:**
- `google/gemini-2.5-flash` (default)
- `google/gemini-2.5-pro`
- `google/gemini-2.5-flash-lite`
- `openai/gpt-5`
- `openai/gpt-5-mini`
- `openai/gpt-5-nano`

---

### 2. create-payment-intent
**Purpose:** Creates Stripe payment intent for credit purchases  
**Authentication:** Required (`verify_jwt = true`)  
**Endpoint:** `/functions/v1/create-payment-intent`

**Request:**
```json
{
  "amount": "number (in credits)"
}
```

**Response:**
```json
{
  "clientSecret": "string",
  "paymentIntentId": "string"
}
```

---

### 3. stripe-webhook
**Purpose:** Handles Stripe webhook events  
**Authentication:** Not required (`verify_jwt = false`)  
**Endpoint:** `/functions/v1/stripe-webhook`

**Events Handled:**
- `payment_intent.succeeded` - Adds credits to user account
- `payment_intent.payment_failed` - Logs failed payment

---

### 4. telegram-webhook
**Purpose:** Handles Telegram bot webhook events  
**Authentication:** Not required (`verify_jwt = false`)  
**Endpoint:** `/functions/v1/telegram-webhook`

**Supported Commands:**
- `/start` - Link Telegram account
- `/help` - Show help
- `/status` - Show account status

---

### 5. sync-storage
**Purpose:** Syncs files with external storage providers  
**Authentication:** Required (`verify_jwt = true`)  
**Endpoint:** `/functions/v1/sync-storage`

**Request:**
```json
{
  "providerId": "uuid",
  "action": "upload" | "download" | "list"
}
```

**Supported Providers:**
- DigitalOcean Spaces
- Google Drive
- Supabase Storage

---

### 6. process-voice
**Purpose:** Transcribes audio to text using Lovable AI  
**Authentication:** Required (`verify_jwt = true`)  
**Endpoint:** `/functions/v1/process-voice`

**Request:**
```json
{
  "audio": "base64 encoded audio"
}
```

**Response:**
```json
{
  "text": "string",
  "creditsUsed": "number"
}
```

---

### 7. process-ocr
**Purpose:** Extracts text from images using Lovable AI  
**Authentication:** Required (`verify_jwt = true`)  
**Endpoint:** `/functions/v1/process-ocr`

**Request:**
```json
{
  "image": "base64 encoded image",
  "extractStructured": "boolean (optional)"
}
```

**Response:**
```json
{
  "text": "string",
  "data": "object (if extractStructured=true)",
  "creditsUsed": "number"
}
```

---

### 8. generate-report
**Purpose:** Generates reports in various formats  
**Authentication:** Required (`verify_jwt = true`)  
**Endpoint:** `/functions/v1/generate-report`

**Request:**
```json
{
  "templateId": "uuid",
  "format": "pdf" | "excel" | "csv" | "html",
  "data": {
    "rows": "array",
    "name": "string"
  }
}
```

**Response:** Binary file (PDF, Excel, CSV, or HTML)

---

## Database Tables

### Projects
- `id`: UUID (PK)
- `user_id`: UUID (FK → auth.users)
- `name`: TEXT
- `description`: TEXT
- `icon`: TEXT
- `color`: TEXT
- `is_archived`: BOOLEAN
- `settings`: JSONB
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### Databases
- `id`: UUID (PK)
- `project_id`: UUID (FK → projects)
- `user_id`: UUID (FK → auth.users)
- `name`: TEXT
- `description`: TEXT
- `icon`: TEXT
- `color`: TEXT
- `tags`: TEXT[]
- `table_count`: INTEGER
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### User Credits
- `id`: UUID (PK)
- `user_id`: UUID (FK → auth.users)
- `free_credits`: NUMERIC
- `paid_credits`: NUMERIC
- `total_credits_used`: NUMERIC
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### Credit Transactions
- `id`: UUID (PK)
- `user_id`: UUID (FK → auth.users)
- `amount`: NUMERIC
- `transaction_type`: TEXT ('purchase', 'usage', 'refund')
- `operation_type`: TEXT
- `balance_after`: NUMERIC
- `stripe_payment_id`: TEXT
- `description`: TEXT
- `created_at`: TIMESTAMP

---

## Rate Limits

All Edge Functions respect rate limits:
- **AI Operations:** 100 requests/minute per user
- **File Operations:** 50 requests/minute per user
- **Storage Sync:** 20 requests/minute per user

---

## Error Codes

- `401` - Unauthorized
- `402` - Payment Required (insufficient credits)
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error
