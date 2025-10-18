# Integrations Guide

## 1. Stripe Integration

### Overview
Stripe integration enables credit purchases and payment processing.

### Setup Steps

1. **Create Stripe Account**
   ```bash
   Visit: https://stripe.com
   Sign up and verify your email
   ```

2. **Get API Keys**
   - Navigate to Dashboard → Developers → API keys
   - Copy "Secret key" (starts with `sk_test_` for test mode)
   - Add to Lovable Cloud secrets as `STRIPE_SECRET_KEY`

3. **Create Products and Prices**
   ```bash
   # Example: Create a 100 credits product
   Product ID: prod_XXXXX
   Price ID: price_XXXXX (100.00 USD)
   ```

4. **Setup Webhook**
   - URL: `https://[your-project].lovable.app/functions/v1/stripe-webhook`
   - Events to listen:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
   - Copy "Signing secret" and add as `STRIPE_WEBHOOK_SECRET`

### Usage in App

```typescript
import { supabase } from '@/integrations/supabase/client';

// Create payment intent
const { data, error } = await supabase.functions.invoke('create-payment-intent', {
  body: { amount: 100 } // 100 credits
});

// Use clientSecret with Stripe.js
const stripe = await loadStripe(publishableKey);
await stripe.confirmPayment({
  clientSecret: data.clientSecret,
  confirmParams: {
    return_url: window.location.origin + '/payment-success'
  }
});
```

### Testing

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

---

## 2. Telegram Bot Integration

### Overview
Telegram bot allows users to interact with the platform via Telegram.

### Setup Steps

1. **Create Bot with BotFather**
   ```
   1. Open Telegram
   2. Search for @BotFather
   3. Send: /newbot
   4. Follow instructions
   5. Copy API Token
   ```

2. **Configure Bot**
   - Add token to secrets as `TELEGRAM_BOT_TOKEN`
   - Set webhook:
     ```bash
     curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
       -H "Content-Type: application/json" \
       -d '{
         "url":"https://[project].lovable.app/functions/v1/telegram-webhook"
       }'
     ```

3. **Link Telegram Account**
   - Users open Settings → Integrations → Telegram
   - Click "Connect Telegram"
   - Get link code
   - Send `/start <code>` to bot

### Bot Commands

- `/start` - Link Telegram account
- `/help` - Show available commands
- `/status` - Check account status and credits
- `/import` - Upload file for import

### Usage Example

```typescript
// Get Telegram connection status
const { data: telegramAccount } = await supabase
  .from('telegram_accounts')
  .select('*')
  .eq('user_id', user.id)
  .single();

if (telegramAccount?.is_active) {
  console.log('Telegram connected:', telegramAccount.telegram_username);
}
```

---

## 3. Storage Providers Integration

### Overview
Sync files with external storage providers.

### Supported Providers

#### DigitalOcean Spaces
```typescript
{
  provider_type: 'digitalocean',
  config: {
    endpoint: 'https://fra1.digitaloceanspaces.com',
    bucket: 'my-bucket',
    accessKeyId: 'ACCESS_KEY',
    secretAccessKey: 'SECRET_KEY'
  }
}
```

#### Google Drive
```typescript
{
  provider_type: 'google_drive',
  config: {
    clientId: 'CLIENT_ID',
    clientSecret: 'CLIENT_SECRET',
    refreshToken: 'REFRESH_TOKEN',
    folderId: 'FOLDER_ID'
  }
}
```

#### Supabase Storage
```typescript
{
  provider_type: 'supabase',
  config: {
    bucket: 'my-bucket'
  }
}
```

### Setup Steps

1. **Add Storage Provider**
   ```typescript
   const { data, error } = await supabase
     .from('storage_providers')
     .insert({
       name: 'My DigitalOcean Space',
       provider_type: 'digitalocean',
       config: {
         endpoint: 'https://fra1.digitaloceanspaces.com',
         bucket: 'my-bucket',
         accessKeyId: 'ACCESS_KEY',
         secretAccessKey: 'SECRET_KEY'
       }
     });
   ```

2. **Sync Files**
   ```typescript
   const { data, error } = await supabase.functions.invoke('sync-storage', {
     body: {
       providerId: provider.id,
       action: 'upload',
       files: [/* file data */]
     }
   });
   ```

---

## 4. Lovable AI Integration

### Overview
Lovable AI provides access to advanced AI models without API keys.

### Supported Models

- `google/gemini-2.5-pro` - Best quality, multimodal
- `google/gemini-2.5-flash` - Balanced (default)
- `google/gemini-2.5-flash-lite` - Fast & cheap
- `openai/gpt-5` - Top-tier reasoning
- `openai/gpt-5-mini` - Balanced
- `openai/gpt-5-nano` - Fast & cheap

### Usage Example

```typescript
// AI Orchestrator
const { data, error } = await supabase.functions.invoke('ai-orchestrator', {
  body: {
    type: 'analyze',
    prompt: 'Analyze this sales data',
    context: { data: salesData }
  }
});

// Voice Transcription
const { data: voiceData } = await supabase.functions.invoke('process-voice', {
  body: {
    audio: base64Audio
  }
});

// OCR
const { data: ocrData } = await supabase.functions.invoke('process-ocr', {
  body: {
    image: base64Image,
    extractStructured: true
  }
});
```

### Credit System

- Free credits: 100 (on signup)
- Operations cost: 0.1-1.0 credits per request
- Purchase credits via Stripe

---

## 5. File Import/Export

### Supported Formats

**Import:**
- CSV
- Excel (.xlsx, .xls)
- JSON

**Export:**
- CSV
- Excel
- JSON
- PDF (reports)
- HTML (reports)

### Import Modes

1. **Data Only** - Import just the data
2. **Schema Only** - Import column structure
3. **Both** - Import schema and data

### Duplicate Handling

- **Skip** - Skip duplicate rows
- **Update** - Update existing rows
- **Create New** - Create new rows anyway

### Usage Example

```typescript
// Parse file
import { parseFile } from '@/utils/fileParser';

const result = await parseFile(file, {
  importMode: 'both',
  duplicateStrategy: 'update'
});

// Import to database
const { data, error } = await supabase.rpc('bulk_insert_table_rows', {
  p_database_id: databaseId,
  p_rows: result.data
});
```

---

## 6. Realtime Features

### Subscribe to Changes

```typescript
const channel = supabase
  .channel('my-channel')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'credit_transactions'
  }, (payload) => {
    console.log('Change received:', payload);
  })
  .subscribe();

// Cleanup
supabase.removeChannel(channel);
```

### Presence Tracking

```typescript
const channel = supabase.channel('room-1');

// Track presence
await channel.track({
  user_id: user.id,
  online_at: new Date().toISOString()
});

// Listen to changes
channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState();
  console.log('Online users:', state);
});

await channel.subscribe();
```

---

## 7. Authentication

### Email/Password

```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    emailRedirectTo: window.location.origin
  }
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Sign out
await supabase.auth.signOut();
```

### Session Management

```typescript
// Get current session
const { data: { session } } = await supabase.auth.getSession();

// Listen to auth changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, session);
});
```

---

## 8. RLS Policies

All tables have Row-Level Security (RLS) enabled.

### User-Owned Resources

```sql
-- Users can only access their own data
CREATE POLICY "Users can manage own projects"
ON projects
FOR ALL
USING (auth.uid() = user_id);
```

### Shared Resources

```sql
-- Project members can access shared projects
CREATE POLICY "Members can view projects"
ON projects
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = projects.id
    AND user_id = auth.uid()
  )
);
```

---

## 9. Rate Limiting

Rate limits are enforced at the Edge Function level:

- **AI Operations:** 100/min per user
- **File Operations:** 50/min per user
- **Storage Sync:** 20/min per user

Handle rate limit errors:

```typescript
try {
  const { data, error } = await supabase.functions.invoke('ai-orchestrator', {
    body: { type: 'analyze', prompt: 'Test' }
  });
} catch (error) {
  if (error.status === 429) {
    toast.error('Rate limit exceeded. Please try again later.');
  }
}
```

---

## 10. Error Handling

Best practices for error handling:

```typescript
try {
  const { data, error } = await supabase
    .from('projects')
    .insert({ name: 'New Project' });

  if (error) throw error;

  toast.success('Project created!');
} catch (error) {
  console.error('Error:', error);
  
  if (error.code === '23505') {
    toast.error('Project already exists');
  } else if (error.code === '42501') {
    toast.error('Permission denied');
  } else {
    toast.error('An error occurred');
  }
}
```
