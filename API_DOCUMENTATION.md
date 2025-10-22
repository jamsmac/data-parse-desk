# Data Parse Desk 2.0 - API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Database Management API](#database-management-api)
4. [Table Data API](#table-data-api)
5. [Column Management API](#column-management-api)
6. [Computed Columns API](#computed-columns-api)
7. [Filter Presets API](#filter-presets-api)
8. [Validation Rules API](#validation-rules-api)
9. [Collaboration API](#collaboration-api)
10. [Import/Export API](#import-export-api)
11. [Edge Functions API](#edge-functions-api)
12. [PostgreSQL Functions Reference](#postgresql-functions-reference)
13. [Error Handling](#error-handling)
14. [Rate Limits](#rate-limits)

---

## Overview

Data Parse Desk 2.0 provides a comprehensive REST API built on Supabase, offering:

- **RESTful endpoints** via Supabase PostgREST
- **Real-time subscriptions** via Supabase Realtime
- **Edge Functions** for complex operations (Deno runtime)
- **PostgreSQL RPC functions** for server-side logic
- **Row Level Security (RLS)** for data protection

**Base URL**: `https://[PROJECT_ID].supabase.co`

**API Endpoints**:
- REST API: `https://[PROJECT_ID].supabase.co/rest/v1/`
- Edge Functions: `https://[PROJECT_ID].supabase.co/functions/v1/`
- Realtime: `wss://[PROJECT_ID].supabase.co/realtime/v1/`

---

## Authentication

All API requests require authentication via JWT tokens.

### Authentication Headers

```typescript
const headers = {
  'apikey': 'YOUR_SUPABASE_ANON_KEY',
  'Authorization': `Bearer ${session.access_token}`,
  'Content-Type': 'application/json'
};
```

### Sign Up

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure_password',
  options: {
    data: {
      full_name: 'John Doe'
    }
  }
});
```

### Sign In

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure_password'
});
```

### Get Current User

```typescript
const { data: { user } } = await supabase.auth.getUser();
```

### Sign Out

```typescript
await supabase.auth.signOut();
```

---

## Database Management API

### List Databases

Get all databases accessible to the current user.

**Endpoint**: `GET /rest/v1/databases`

**Query Parameters**:
- `select` - Columns to return (default: `*`)
- `order` - Sorting (e.g., `created_at.desc`)
- `limit` - Max results (default: 100)

**Example**:

```typescript
const { data: databases, error } = await supabase
  .from('databases')
  .select('*')
  .order('created_at', { ascending: false });

// Response
[
  {
    id: 'db-uuid-123',
    name: 'Customer Database',
    description: 'Main customer records',
    project_id: 'project-uuid-456',
    schema: {...},
    created_at: '2025-01-15T10:30:00Z',
    updated_at: '2025-01-20T14:22:00Z'
  }
]
```

### Create Database

**Endpoint**: `POST /rest/v1/databases`

**Request Body**:

```typescript
interface CreateDatabaseRequest {
  name: string;
  description?: string;
  project_id?: string;
  schema: {
    columns: Column[];
  };
}

const { data, error } = await supabase
  .from('databases')
  .insert({
    name: 'New Database',
    description: 'Product inventory',
    schema: {
      columns: [
        {
          name: 'product_name',
          type: 'text',
          required: true
        },
        {
          name: 'price',
          type: 'number',
          required: true
        }
      ]
    }
  })
  .select()
  .single();
```

### Get Database

**Endpoint**: `GET /rest/v1/databases?id=eq.{database_id}`

```typescript
const { data: database, error } = await supabase
  .from('databases')
  .select('*')
  .eq('id', databaseId)
  .single();
```

### Update Database

**Endpoint**: `PATCH /rest/v1/databases?id=eq.{database_id}`

```typescript
const { data, error } = await supabase
  .from('databases')
  .update({
    name: 'Updated Name',
    description: 'Updated description',
    schema: updatedSchema
  })
  .eq('id', databaseId)
  .select()
  .single();
```

### Delete Database

**Endpoint**: `DELETE /rest/v1/databases?id=eq.{database_id}`

```typescript
const { error } = await supabase
  .from('databases')
  .delete()
  .eq('id', databaseId);
```

---

## Table Data API

### Query Table Data

**Endpoint**: `GET /rest/v1/table_data`

**Advanced Filtering**:

```typescript
// Simple filter
const { data, error } = await supabase
  .from('table_data')
  .select('*')
  .eq('database_id', databaseId)
  .gte('data->price', 100)
  .order('created_at', { ascending: false });

// Complex JSONB queries
const { data, error } = await supabase
  .from('table_data')
  .select('*')
  .eq('database_id', databaseId)
  .filter('data->>status', 'eq', 'active')
  .filter('data->>category', 'in', '("electronics","computers")');

// Full-text search
const { data, error } = await supabase
  .from('table_data')
  .select('*')
  .eq('database_id', databaseId)
  .textSearch('data', 'laptop | computer', {
    type: 'websearch',
    config: 'english'
  });
```

### Insert Row

**Endpoint**: `POST /rest/v1/table_data`

```typescript
const { data, error } = await supabase
  .from('table_data')
  .insert({
    database_id: databaseId,
    data: {
      product_name: 'Laptop',
      price: 1299.99,
      category: 'Electronics',
      in_stock: true
    }
  })
  .select()
  .single();

// Response
{
  id: 'row-uuid-789',
  database_id: 'db-uuid-123',
  data: {
    product_name: 'Laptop',
    price: 1299.99,
    category: 'Electronics',
    in_stock: true
  },
  created_at: '2025-01-22T10:30:00Z',
  updated_at: '2025-01-22T10:30:00Z'
}
```

### Bulk Insert

```typescript
const rows = [
  { database_id: databaseId, data: { name: 'Product 1', price: 10 } },
  { database_id: databaseId, data: { name: 'Product 2', price: 20 } },
  { database_id: databaseId, data: { name: 'Product 3', price: 30 } }
];

const { data, error } = await supabase
  .from('table_data')
  .insert(rows)
  .select();
```

### Update Row

**Endpoint**: `PATCH /rest/v1/table_data?id=eq.{row_id}`

```typescript
const { data, error } = await supabase
  .from('table_data')
  .update({
    data: {
      ...existingData,
      price: 999.99,
      updated_by: userId
    }
  })
  .eq('id', rowId)
  .select()
  .single();
```

### Update Specific Field

```typescript
// Update single JSONB field
const { data, error } = await supabase
  .rpc('update_table_data_field', {
    p_row_id: rowId,
    p_field_name: 'price',
    p_field_value: '1299.99'
  });
```

### Delete Row

**Endpoint**: `DELETE /rest/v1/table_data?id=eq.{row_id}`

```typescript
const { error } = await supabase
  .from('table_data')
  .delete()
  .eq('id', rowId);
```

### Bulk Delete

```typescript
const { error } = await supabase
  .from('table_data')
  .delete()
  .in('id', rowIds);
```

---

## Column Management API

### Get Database Schema

```typescript
const { data: database, error } = await supabase
  .from('databases')
  .select('schema')
  .eq('id', databaseId)
  .single();

const columns = database.schema.columns;
```

### Add Column

```typescript
const { data, error } = await supabase.rpc('add_column_to_database', {
  p_database_id: databaseId,
  p_column_name: 'discount_percentage',
  p_column_type: 'number',
  p_required: false,
  p_default_value: '0'
});
```

### Update Column

```typescript
const { data, error } = await supabase.rpc('update_column_definition', {
  p_database_id: databaseId,
  p_column_name: 'price',
  p_new_definition: {
    name: 'price',
    type: 'number',
    required: true,
    validation: {
      min_value: 0,
      max_value: 100000
    }
  }
});
```

### Delete Column

```typescript
const { data, error } = await supabase.rpc('delete_column_from_database', {
  p_database_id: databaseId,
  p_column_name: 'old_column'
});
```

---

## Computed Columns API

Computed columns include Lookup and Rollup formulas.

### Create Lookup Column

**Lookup**: Similar to Excel's VLOOKUP - gets a value from a related table.

```typescript
const { data, error } = await supabase
  .from('columns')
  .insert({
    database_id: databaseId,
    name: 'customer_email',
    type: 'lookup',
    config: {
      source_database_id: 'customers-db-uuid',
      source_column: 'email',
      relation_column: 'customer_id',
      lookup_column: 'id'
    }
  })
  .select()
  .single();
```

**Example Use Case**: In an Orders table, lookup customer email based on customer_id.

### Create Rollup Column

**Rollup**: Similar to Excel's SUMIF/COUNTIF - aggregates values from related records.

```typescript
const { data, error } = await supabase
  .from('columns')
  .insert({
    database_id: databaseId,
    name: 'total_order_value',
    type: 'rollup',
    config: {
      source_database_id: 'orders-db-uuid',
      source_column: 'amount',
      relation_column: 'customer_id',
      lookup_column: 'id',
      aggregation: 'sum', // sum, count, avg, min, max, countunique
      filter: {
        column: 'status',
        operator: 'equals',
        value: 'completed'
      }
    }
  })
  .select()
  .single();
```

**Aggregation Types**:
- `sum` - Sum all values
- `count` - Count all records
- `avg` - Average of values
- `min` - Minimum value
- `max` - Maximum value
- `countunique` - Count unique values

### Calculate Computed Values

**Using Edge Function**:

```typescript
const response = await fetch(
  'https://[PROJECT_ID].supabase.co/functions/v1/calculate-computed-columns',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      database_id: databaseId,
      row_id: rowId // Optional: calculate for specific row
    })
  }
);

const result = await response.json();
```

### Calculate with PostgreSQL Function

```typescript
const { data, error } = await supabase.rpc('calculate_lookup_value', {
  p_database_id: databaseId,
  p_row_id: rowId,
  p_column_name: 'customer_email'
});

const { data, error } = await supabase.rpc('calculate_rollup_value', {
  p_database_id: databaseId,
  p_row_id: rowId,
  p_column_name: 'total_order_value'
});
```

---

## Filter Presets API

Save and reuse complex filter configurations.

### List Filter Presets

```typescript
const { data: presets, error } = await supabase
  .from('filter_presets')
  .select('*')
  .eq('database_id', databaseId)
  .or(`user_id.eq.${userId},is_public.eq.true`);

// Response
[
  {
    id: 'preset-uuid-123',
    database_id: 'db-uuid-456',
    user_id: 'user-uuid-789',
    name: 'High Value Orders',
    description: 'Orders over $1000 with active status',
    filters: [
      {
        id: 'group-1',
        logic: 'AND',
        filters: [
          { column: 'amount', operator: 'gte', value: 1000 },
          { column: 'status', operator: 'equals', value: 'active' }
        ]
      }
    ],
    is_public: false,
    created_at: '2025-01-20T10:00:00Z'
  }
]
```

### Create Filter Preset

```typescript
const { data, error } = await supabase
  .from('filter_presets')
  .insert({
    database_id: databaseId,
    name: 'Electronics in Stock',
    description: 'All electronics currently in stock',
    filters: [
      {
        id: 'group-1',
        logic: 'AND',
        filters: [
          { column: 'category', operator: 'equals', value: 'Electronics' },
          { column: 'in_stock', operator: 'isTrue', value: null }
        ]
      }
    ],
    is_public: true
  })
  .select()
  .single();
```

### Apply Filter Preset

```typescript
// Load preset
const { data: preset, error } = await supabase
  .from('filter_presets')
  .select('filters')
  .eq('id', presetId)
  .single();

// Apply filters
let query = supabase
  .from('table_data')
  .select('*')
  .eq('database_id', databaseId);

preset.filters.forEach(group => {
  group.filters.forEach(filter => {
    query = query[filter.operator](
      `data->>${filter.column}`,
      filter.value
    );
  });
});

const { data, error: queryError } = await query;
```

### Update Filter Preset

```typescript
const { data, error } = await supabase
  .from('filter_presets')
  .update({
    name: 'Updated Name',
    filters: updatedFilters
  })
  .eq('id', presetId)
  .select()
  .single();
```

### Delete Filter Preset

```typescript
const { error } = await supabase
  .from('filter_presets')
  .delete()
  .eq('id', presetId);
```

---

## Validation Rules API

Define and enforce data validation rules.

### List Validation Rules

```typescript
const { data: rules, error } = await supabase
  .from('validation_rules')
  .select('*')
  .eq('database_id', databaseId)
  .order('column_name');

// Response
[
  {
    id: 'rule-uuid-123',
    database_id: 'db-uuid-456',
    column_name: 'email',
    rule_type: 'email',
    params: {},
    error_message: 'Please enter a valid email address',
    is_active: true
  },
  {
    id: 'rule-uuid-124',
    database_id: 'db-uuid-456',
    column_name: 'price',
    rule_type: 'min_value',
    params: { min: 0 },
    error_message: 'Price must be positive',
    is_active: true
  }
]
```

### Create Validation Rule

```typescript
// Email validation
const { data, error } = await supabase
  .from('validation_rules')
  .insert({
    database_id: databaseId,
    column_name: 'email',
    rule_type: 'email',
    params: {},
    error_message: 'Please enter a valid email address'
  })
  .select()
  .single();

// Min/Max value
const { data, error } = await supabase
  .from('validation_rules')
  .insert({
    database_id: databaseId,
    column_name: 'age',
    rule_type: 'min_value',
    params: { min: 18, max: 120 },
    error_message: 'Age must be between 18 and 120'
  })
  .select()
  .single();

// Regex pattern
const { data, error } = await supabase
  .from('validation_rules')
  .insert({
    database_id: databaseId,
    column_name: 'phone',
    rule_type: 'regex',
    params: { pattern: '^\\+?[1-9]\\d{1,14}$' },
    error_message: 'Please enter a valid phone number'
  })
  .select()
  .single();

// Custom function
const { data, error } = await supabase
  .from('validation_rules')
  .insert({
    database_id: databaseId,
    column_name: 'product_code',
    rule_type: 'custom_function',
    params: { function_name: 'validate_product_code' },
    error_message: 'Invalid product code format'
  })
  .select()
  .single();
```

### Validation Rule Types

| Type | Params | Description |
|------|--------|-------------|
| `required` | - | Field cannot be empty |
| `unique` | - | Value must be unique in column |
| `email` | - | Valid email format |
| `url` | - | Valid URL format |
| `phone` | - | Valid phone number |
| `regex` | `pattern` | Matches regex pattern |
| `min_length` | `min` | Minimum text length |
| `max_length` | `max` | Maximum text length |
| `min_value` | `min` | Minimum numeric value |
| `max_value` | `max` | Maximum numeric value |
| `date_range` | `min_date`, `max_date` | Date within range |
| `custom_function` | `function_name` | Custom PostgreSQL function |

### Validate Row

**Before Insert/Update**:

```typescript
const { data: result, error } = await supabase.rpc('validate_row', {
  p_database_id: databaseId,
  p_row_data: {
    email: 'user@example.com',
    price: 99.99,
    age: 25
  }
});

// Response
{
  valid: true,
  errors: null
}

// Or if validation fails:
{
  valid: false,
  errors: {
    email: ['Please enter a valid email address'],
    price: ['Price must be positive']
  }
}
```

### Disable/Enable Validation

```typescript
// Disable for bulk import
const { error } = await supabase.rpc('exec_sql', {
  sql: "SET LOCAL app.skip_validation = 'true';"
});

// Insert data without validation
await supabase.from('table_data').insert(bulkData);

// Re-enable (automatic after transaction)
```

---

## Collaboration API

Real-time collaboration features including presence tracking and comments.

### User Presence

#### Update Presence

```typescript
const { error } = await supabase
  .from('user_presence')
  .upsert({
    user_id: userId,
    database_id: databaseId,
    project_id: projectId,
    status: 'active',
    current_view: 'table',
    cursor_x: mouseX,
    cursor_y: mouseY,
    last_seen_at: new Date().toISOString()
  });
```

#### Subscribe to Presence Changes

```typescript
const channel = supabase
  .channel(`presence:${databaseId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'user_presence',
      filter: `database_id=eq.${databaseId}`
    },
    (payload) => {
      console.log('Presence changed:', payload);
      // Update UI with active users
    }
  )
  .subscribe();
```

#### Get Active Users

```typescript
const { data: activeUsers, error } = await supabase
  .from('user_presence')
  .select(`
    *,
    user:user_id (
      id,
      email,
      full_name,
      avatar_url
    )
  `)
  .eq('database_id', databaseId)
  .gte('last_seen_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
  .order('last_seen_at', { ascending: false });
```

### Comments

#### List Comments

```typescript
// Database-level comments
const { data: comments, error } = await supabase
  .from('comments')
  .select(`
    *,
    user:user_id (
      id,
      email,
      full_name,
      avatar_url
    )
  `)
  .eq('database_id', databaseId)
  .is('row_id', null)
  .order('created_at', { ascending: true });

// Row-level comments
const { data: rowComments, error } = await supabase
  .from('comments')
  .select(`
    *,
    user:user_id (
      id,
      email,
      full_name,
      avatar_url
    )
  `)
  .eq('database_id', databaseId)
  .eq('row_id', rowId)
  .order('created_at', { ascending: true });
```

#### Add Comment

```typescript
const { data, error } = await supabase
  .from('comments')
  .insert({
    database_id: databaseId,
    row_id: rowId, // Optional: null for database-level comments
    content: 'This needs review',
    parent_id: null // For replies, set to parent comment ID
  })
  .select(`
    *,
    user:user_id (
      id,
      email,
      full_name,
      avatar_url
    )
  `)
  .single();
```

#### Add Reply

```typescript
const { data, error } = await supabase
  .from('comments')
  .insert({
    database_id: databaseId,
    row_id: rowId,
    content: 'I agree, will update',
    parent_id: parentCommentId
  })
  .select()
  .single();
```

#### Update Comment

```typescript
const { data, error } = await supabase
  .from('comments')
  .update({ content: 'Updated content' })
  .eq('id', commentId)
  .select()
  .single();
```

#### Delete Comment

```typescript
const { error } = await supabase
  .from('comments')
  .delete()
  .eq('id', commentId);
```

#### Resolve Comment

```typescript
const { data, error } = await supabase
  .from('comments')
  .update({
    resolved: true,
    resolved_by: userId,
    resolved_at: new Date().toISOString()
  })
  .eq('id', commentId)
  .select()
  .single();
```

#### Add Reaction

```typescript
// Get current reactions
const { data: comment } = await supabase
  .from('comments')
  .select('reactions')
  .eq('id', commentId)
  .single();

const reactions = { ...(comment.reactions || {}) };
const emoji = '👍';

if (!reactions[emoji]) {
  reactions[emoji] = [];
}

if (!reactions[emoji].includes(userId)) {
  reactions[emoji].push(userId);
}

// Update reactions
const { error } = await supabase
  .from('comments')
  .update({ reactions })
  .eq('id', commentId);
```

### Activity Feed

#### Get Recent Activity

```typescript
const { data: activities, error } = await supabase
  .from('activity_feed')
  .select(`
    *,
    user:user_id (
      id,
      email,
      full_name,
      avatar_url
    )
  `)
  .eq('database_id', databaseId)
  .order('created_at', { ascending: false })
  .limit(50);

// Response
[
  {
    id: 'activity-uuid-123',
    user_id: 'user-uuid-456',
    database_id: 'db-uuid-789',
    action: 'update',
    entity_type: 'row',
    entity_id: 'row-uuid-101',
    details: {
      fields_changed: ['price', 'status'],
      old_values: { price: 99.99, status: 'draft' },
      new_values: { price: 89.99, status: 'active' }
    },
    created_at: '2025-01-22T15:30:00Z',
    user: {
      full_name: 'John Doe',
      avatar_url: '...'
    }
  }
]
```

#### Subscribe to Activity

```typescript
const channel = supabase
  .channel(`activity:${databaseId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'activity_feed',
      filter: `database_id=eq.${databaseId}`
    },
    (payload) => {
      console.log('New activity:', payload.new);
      // Update activity feed UI
    }
  )
  .subscribe();
```

---

## Import/Export API

### Import CSV with AI Detection

**Edge Function**: `analyze-csv-schema`

```typescript
const formData = new FormData();
formData.append('file', csvFile);
formData.append('databaseId', databaseId);

const response = await fetch(
  'https://[PROJECT_ID].supabase.co/functions/v1/analyze-csv-schema',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    },
    body: formData
  }
);

const result = await response.json();

// Response
{
  success: true,
  schema: {
    columns: [
      {
        name: 'email',
        type: 'text',
        detectedType: 'email',
        confidence: 0.95,
        suggestions: ['Appears to be email addresses']
      },
      {
        name: 'amount',
        type: 'number',
        detectedType: 'currency',
        confidence: 0.88,
        suggestions: ['Detected as monetary values']
      }
    ]
  },
  preview: [
    { email: 'user1@example.com', amount: 99.99 },
    { email: 'user2@example.com', amount: 149.99 }
  ]
}
```

### Import Data

**Edge Function**: `import-data`

```typescript
const response = await fetch(
  'https://[PROJECT_ID].supabase.co/functions/v1/import-data',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      database_id: databaseId,
      data: [
        { product_name: 'Laptop', price: 1299.99 },
        { product_name: 'Mouse', price: 29.99 },
        { product_name: 'Keyboard', price: 89.99 }
      ],
      skip_validation: false,
      update_on_conflict: false
    })
  }
);

const result = await response.json();

// Response
{
  success: true,
  imported: 3,
  failed: 0,
  errors: []
}
```

### Export Data

**Edge Function**: `export-data`

```typescript
const response = await fetch(
  'https://[PROJECT_ID].supabase.co/functions/v1/export-data',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      database_id: databaseId,
      format: 'csv', // csv, json, excel
      filters: {
        column: 'status',
        operator: 'equals',
        value: 'active'
      },
      columns: ['product_name', 'price', 'category'] // Optional: select specific columns
    })
  }
);

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `export_${Date.now()}.csv`;
a.click();
```

---

## Edge Functions API

All Edge Functions use Deno runtime and require authentication.

### Available Edge Functions

#### 1. `analyze-csv-schema`

Analyzes CSV files using Google Gemini AI to detect column types.

**Endpoint**: `POST /functions/v1/analyze-csv-schema`

**Content-Type**: `multipart/form-data`

**Body**:
- `file`: CSV file
- `databaseId`: Database UUID (optional)

**Response**:
```typescript
{
  success: boolean;
  schema: {
    columns: Array<{
      name: string;
      type: string;
      detectedType: string;
      confidence: number;
      suggestions: string[];
    }>;
  };
  preview: Array<Record<string, any>>;
}
```

#### 2. `calculate-computed-columns`

Calculates lookup and rollup column values.

**Endpoint**: `POST /functions/v1/calculate-computed-columns`

**Body**:
```typescript
{
  database_id: string;
  row_id?: string; // Optional: calculate for specific row
}
```

**Response**:
```typescript
{
  success: boolean;
  calculated: number;
  results: Array<{
    row_id: string;
    column: string;
    value: any;
  }>;
}
```

#### 3. `import-data`

Bulk import data with optional validation.

**Endpoint**: `POST /functions/v1/import-data`

**Body**:
```typescript
{
  database_id: string;
  data: Array<Record<string, any>>;
  skip_validation?: boolean;
  update_on_conflict?: boolean;
}
```

#### 4. `export-data`

Export data in various formats.

**Endpoint**: `POST /functions/v1/export-data`

**Body**:
```typescript
{
  database_id: string;
  format: 'csv' | 'json' | 'excel';
  filters?: FilterGroup[];
  columns?: string[];
}
```

---

## PostgreSQL Functions Reference

### Computed Column Functions

#### `calculate_lookup_value`

```sql
SELECT * FROM calculate_lookup_value(
  p_database_id UUID,
  p_row_id UUID,
  p_column_name TEXT
);
```

**Returns**: The looked-up value from the related table.

#### `calculate_rollup_value`

```sql
SELECT * FROM calculate_rollup_value(
  p_database_id UUID,
  p_row_id UUID,
  p_column_name TEXT
);
```

**Returns**: Aggregated value based on rollup configuration.

### Validation Functions

#### `validate_value`

```sql
SELECT validate_value(
  p_value TEXT,
  p_rule_type TEXT,
  p_params JSONB
);
```

**Returns**: `BOOLEAN` - true if value passes validation.

**Example**:
```sql
SELECT validate_value('user@example.com', 'email', '{}');
-- Returns: true

SELECT validate_value('invalid-email', 'email', '{}');
-- Returns: false
```

#### `validate_row`

```sql
SELECT * FROM validate_row(
  p_database_id UUID,
  p_row_data JSONB
);
```

**Returns**: Table with columns:
- `valid` (BOOLEAN)
- `errors` (JSONB)

**Example**:
```sql
SELECT * FROM validate_row(
  'db-uuid-123',
  '{"email": "user@example.com", "age": 25}'::jsonb
);

-- Returns:
-- valid | errors
-- ------|--------
-- true  | null
```

### Relation Resolution

#### `resolve_relations_batch`

Efficiently loads related records in batch.

```sql
SELECT * FROM resolve_relations_batch(
  p_database_id UUID,
  p_row_ids UUID[],
  p_relation_columns TEXT[]
);
```

**Returns**: JSONB with resolved relations.

**Example**:
```sql
SELECT * FROM resolve_relations_batch(
  'db-uuid-123',
  ARRAY['row-1', 'row-2', 'row-3']::UUID[],
  ARRAY['customer_id', 'product_id']
);
```

### Utility Functions

#### `add_column_to_database`

```sql
SELECT add_column_to_database(
  p_database_id UUID,
  p_column_name TEXT,
  p_column_type TEXT,
  p_required BOOLEAN DEFAULT FALSE,
  p_default_value TEXT DEFAULT NULL
);
```

#### `update_column_definition`

```sql
SELECT update_column_definition(
  p_database_id UUID,
  p_column_name TEXT,
  p_new_definition JSONB
);
```

#### `delete_column_from_database`

```sql
SELECT delete_column_from_database(
  p_database_id UUID,
  p_column_name TEXT
);
```

---

## Error Handling

### Standard Error Response

```typescript
{
  error: {
    message: string;
    code: string;
    details?: any;
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `PGRST116` | Row not found |
| `PGRST204` | No content / empty result |
| `23505` | Unique constraint violation |
| `23503` | Foreign key violation |
| `42501` | Insufficient privileges |
| `P0001` | Raised exception (validation error) |

### Error Handling Examples

```typescript
try {
  const { data, error } = await supabase
    .from('table_data')
    .insert(rowData)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This record already exists');
    } else if (error.code === 'P0001') {
      // Validation error
      throw new Error(error.message);
    } else {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  return data;
} catch (err) {
  console.error('Operation failed:', err);
  // Show user-friendly error
}
```

### Validation Errors

When validation fails, errors are returned in structured format:

```typescript
{
  valid: false,
  errors: {
    email: ['Please enter a valid email address'],
    price: ['Price must be positive', 'Price cannot exceed 100000'],
    age: ['Age must be at least 18']
  }
}
```

---

## Rate Limits

### Default Limits

- **REST API**:
  - Anonymous: 100 requests/minute
  - Authenticated: 1000 requests/minute

- **Edge Functions**:
  - 500 invocations/minute per function

- **Realtime**:
  - 100 messages/second per connection

### Rate Limit Headers

Response headers include rate limit information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1642867200
```

### Best Practices

1. **Batch Operations**: Use bulk insert/update instead of multiple single operations
2. **Caching**: Cache frequently accessed data client-side
3. **Pagination**: Use limit/offset or cursor-based pagination
4. **Debouncing**: Debounce user input before making API calls
5. **Realtime**: Use Realtime subscriptions instead of polling

### Pagination Example

```typescript
const PAGE_SIZE = 50;
let page = 0;

const { data, error } = await supabase
  .from('table_data')
  .select('*', { count: 'exact' })
  .eq('database_id', databaseId)
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  .order('created_at', { ascending: false });

// Response includes total count
const totalPages = Math.ceil(data.length / PAGE_SIZE);
```

---

## Complete Example: CRUD Application

### Initialize Client

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://[PROJECT_ID].supabase.co',
  'YOUR_SUPABASE_ANON_KEY'
);
```

### Create Database and Add Data

```typescript
async function createProductDatabase() {
  // 1. Create database
  const { data: database, error: dbError } = await supabase
    .from('databases')
    .insert({
      name: 'Products',
      description: 'Product inventory management',
      schema: {
        columns: [
          { name: 'product_name', type: 'text', required: true },
          { name: 'sku', type: 'text', required: true },
          { name: 'price', type: 'number', required: true },
          { name: 'category', type: 'select', options: ['Electronics', 'Clothing', 'Home'] },
          { name: 'in_stock', type: 'boolean', default: true }
        ]
      }
    })
    .select()
    .single();

  if (dbError) throw dbError;

  // 2. Add validation rules
  await supabase.from('validation_rules').insert([
    {
      database_id: database.id,
      column_name: 'price',
      rule_type: 'min_value',
      params: { min: 0 },
      error_message: 'Price must be positive'
    },
    {
      database_id: database.id,
      column_name: 'sku',
      rule_type: 'unique',
      params: {},
      error_message: 'SKU must be unique'
    }
  ]);

  // 3. Insert products
  const { data: products, error: insertError } = await supabase
    .from('table_data')
    .insert([
      {
        database_id: database.id,
        data: {
          product_name: 'Wireless Mouse',
          sku: 'WM-001',
          price: 29.99,
          category: 'Electronics',
          in_stock: true
        }
      },
      {
        database_id: database.id,
        data: {
          product_name: 'USB Keyboard',
          sku: 'KB-001',
          price: 49.99,
          category: 'Electronics',
          in_stock: true
        }
      }
    ])
    .select();

  return { database, products };
}
```

### Query with Filters

```typescript
async function searchProducts(databaseId: string, searchTerm: string) {
  const { data, error } = await supabase
    .from('table_data')
    .select('*')
    .eq('database_id', databaseId)
    .or(`data->>product_name.ilike.%${searchTerm}%,data->>sku.ilike.%${searchTerm}%`)
    .eq('data->>in_stock', 'true')
    .order('data->>price', { ascending: true });

  return data;
}
```

### Real-time Updates

```typescript
function subscribeToProducts(databaseId: string, callback: (product: any) => void) {
  const channel = supabase
    .channel(`products:${databaseId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'table_data',
        filter: `database_id=eq.${databaseId}`
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
```

---

## Additional Resources

- **Supabase Documentation**: https://supabase.com/docs
- **PostgREST API Reference**: https://postgrest.org/en/stable/api.html
- **PostgreSQL JSONB Functions**: https://www.postgresql.org/docs/current/functions-json.html
- **Realtime Documentation**: https://supabase.com/docs/guides/realtime

---

**Last Updated**: 2025-01-22
**API Version**: 2.0
**Supabase Version**: Latest (2025)
