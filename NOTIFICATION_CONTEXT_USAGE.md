# NotificationContext Usage Guide

## Overview

The `NotificationContext` provides a centralized, type-safe notification system for the entire application. It wraps the `sonner` library with a cleaner API and makes it easier to manage toast notifications consistently.

## Installation

The NotificationProvider is already integrated in `App.tsx` and wraps all application content, making notifications available throughout the app.

## Basic Usage

### Import the hook

```typescript
import { useNotification } from '@/contexts/NotificationContext';
```

### Use in your component

```typescript
function MyComponent() {
  const notifications = useNotification();

  const handleSuccess = () => {
    notifications.success('Operation completed successfully!');
  };

  const handleError = () => {
    notifications.error('Something went wrong!');
  };

  return (
    <div>
      <button onClick={handleSuccess}>Success</button>
      <button onClick={handleError}>Error</button>
    </div>
  );
}
```

## API Reference

### Methods

#### `success(message, options?)`
Display a success notification with a green checkmark icon.

```typescript
notifications.success('Data saved successfully!');

// With options
notifications.success('Profile updated!', {
  description: 'Your changes have been saved',
  duration: 5000
});
```

#### `error(message, options?)`
Display an error notification with a red error icon.

```typescript
notifications.error('Failed to save data');

// With description
notifications.error('Authentication failed', {
  description: 'Please check your credentials and try again'
});
```

#### `info(message, options?)`
Display an informational notification with a blue info icon.

```typescript
notifications.info('New feature available!', {
  description: 'Check out our new dashboard'
});
```

#### `warning(message, options?)`
Display a warning notification with a yellow warning icon.

```typescript
notifications.warning('Low storage space', {
  description: 'Consider upgrading your plan'
});
```

#### `loading(message, options?)`
Display a loading notification with a spinner. Returns an ID that can be used to dismiss it later.

```typescript
const loadingId = notifications.loading('Uploading files...');

// Later, dismiss it
setTimeout(() => {
  notifications.dismiss(loadingId);
  notifications.success('Upload complete!');
}, 2000);
```

#### `dismiss(toastId?)`
Dismiss a specific notification by ID, or all notifications if no ID is provided.

```typescript
// Dismiss specific notification
const id = notifications.loading('Processing...');
notifications.dismiss(id);

// Dismiss all notifications
notifications.dismiss();
```

#### `promise(promise, messages)`
Display notifications based on promise state. Automatically shows loading, then success or error.

```typescript
const uploadFile = async (file: File) => {
  // Your async operation
  return await api.upload(file);
};

notifications.promise(
  uploadFile(myFile),
  {
    loading: 'Uploading file...',
    success: 'File uploaded successfully!',
    error: 'Failed to upload file'
  }
);
```

## NotificationOptions

All notification methods accept an optional `options` parameter:

```typescript
interface NotificationOptions {
  // Additional description text shown below the main message
  description?: string;

  // Action button configuration
  action?: {
    label: string;
    onClick: () => void;
  };

  // Duration in milliseconds before auto-dismiss
  duration?: number;

  // If true, notification won't auto-dismiss
  important?: boolean;
}
```

### Examples with Options

#### With Description
```typescript
notifications.success('Changes saved', {
  description: 'Your profile has been updated successfully'
});
```

#### With Action Button
```typescript
notifications.info('New message received', {
  description: 'You have a new message from John',
  action: {
    label: 'View',
    onClick: () => navigateToMessages()
  }
});
```

#### Custom Duration
```typescript
notifications.warning('Session expiring soon', {
  duration: 10000 // 10 seconds
});
```

#### Important (Won't Auto-dismiss)
```typescript
notifications.error('Critical system error', {
  description: 'Please contact support',
  important: true // Will stay until manually dismissed
});
```

## Real-World Examples

### Form Submission
```typescript
const handleSubmit = async (data: FormData) => {
  const loadingId = notifications.loading('Saving changes...');

  try {
    await saveData(data);
    notifications.dismiss(loadingId);
    notifications.success('Data saved successfully!', {
      description: 'Your changes have been applied'
    });
  } catch (error) {
    notifications.dismiss(loadingId);
    notifications.error('Failed to save data', {
      description: error.message
    });
  }
};
```

### Using Promise Helper
```typescript
const handleSubmit = async (data: FormData) => {
  await notifications.promise(
    saveData(data),
    {
      loading: 'Saving changes...',
      success: 'Data saved successfully!',
      error: 'Failed to save data'
    }
  );
};
```

### Delete Confirmation
```typescript
const handleDelete = async (id: string) => {
  notifications.warning('Are you sure?', {
    description: 'This action cannot be undone',
    action: {
      label: 'Delete',
      onClick: async () => {
        await notifications.promise(
          deleteItem(id),
          {
            loading: 'Deleting...',
            success: 'Item deleted successfully',
            error: 'Failed to delete item'
          }
        );
      }
    }
  });
};
```

## Backward Compatibility

The existing `toast` imports from `sonner` continue to work:

```typescript
// This still works
import { toast } from 'sonner';
toast.success('Hello!');

// But this is recommended
import { useNotification } from '@/contexts/NotificationContext';
const notifications = useNotification();
notifications.success('Hello!');
```

## Migration from Direct Toast Calls

### Before
```typescript
import { toast } from 'sonner';

function MyComponent() {
  const handleSave = () => {
    toast.success('Saved!');
  };
}
```

### After
```typescript
import { useNotification } from '@/contexts/NotificationContext';

function MyComponent() {
  const notifications = useNotification();

  const handleSave = () => {
    notifications.success('Saved!');
  };
}
```

## Benefits

1. **Type Safety**: Full TypeScript support with autocomplete
2. **Centralized Management**: All notifications go through one system
3. **Consistent API**: Same interface across the entire app
4. **Easy Testing**: Mock the context in tests
5. **Future-Proof**: Easy to swap notification libraries without changing components
6. **Better DX**: Cleaner, more discoverable API

## Testing

### Mocking in Tests
```typescript
import { NotificationContext } from '@/contexts/NotificationContext';

const mockNotifications = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  loading: jest.fn(),
  dismiss: jest.fn(),
  promise: jest.fn(),
};

// Wrap your component with the mock
<NotificationContext.Provider value={mockNotifications}>
  <YourComponent />
</NotificationContext.Provider>
```

## Best Practices

1. **Use descriptive messages**: Make it clear what happened
2. **Add descriptions for complex scenarios**: Help users understand what to do next
3. **Use appropriate types**: success for positive actions, error for failures, etc.
4. **Handle loading states**: Use loading notifications for async operations
5. **Don't overuse**: Only show notifications for important events
6. **Keep messages short**: Use description for details
7. **Add actions when helpful**: Let users take immediate action from notifications

## Common Patterns

### Async Operation with Loading
```typescript
const handleOperation = async () => {
  const id = notifications.loading('Processing...');
  try {
    await operation();
    notifications.dismiss(id);
    notifications.success('Done!');
  } catch (error) {
    notifications.dismiss(id);
    notifications.error('Failed', { description: error.message });
  }
};
```

### Optimistic Updates
```typescript
const handleUpdate = async (data: Data) => {
  // Show success immediately
  notifications.success('Updated!');

  try {
    await updateData(data);
  } catch (error) {
    // Undo optimistic update and show error
    notifications.error('Failed to update', {
      description: 'Changes were reverted'
    });
  }
};
```

### Chained Operations
```typescript
const handleProcess = async () => {
  await notifications.promise(step1(), {
    loading: 'Step 1...',
    success: 'Step 1 complete',
    error: 'Step 1 failed'
  });

  await notifications.promise(step2(), {
    loading: 'Step 2...',
    success: 'Step 2 complete',
    error: 'Step 2 failed'
  });

  notifications.success('All steps completed!');
};
```
