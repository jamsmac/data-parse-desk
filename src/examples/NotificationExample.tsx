/**
 * Example component demonstrating NotificationContext usage
 * This file is for reference only and is not imported in the application
 */

import { useNotification } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function NotificationExample() {
  const notifications = useNotification();

  // Example 1: Basic notifications
  const handleBasicNotifications = () => {
    notifications.success('Success notification');
    setTimeout(() => notifications.error('Error notification'), 1000);
    setTimeout(() => notifications.info('Info notification'), 2000);
    setTimeout(() => notifications.warning('Warning notification'), 3000);
  };

  // Example 2: With descriptions
  const handleWithDescription = () => {
    notifications.success('Profile updated', {
      description: 'Your changes have been saved successfully'
    });
  };

  // Example 3: With action button
  const handleWithAction = () => {
    notifications.info('New feature available', {
      description: 'Check out our new dashboard',
      action: {
        label: 'View',
        onClick: () => alert('Navigating to new feature...')
      }
    });
  };

  // Example 4: Loading notification
  const handleLoading = () => {
    const loadingId = notifications.loading('Processing your request...');

    setTimeout(() => {
      notifications.dismiss(loadingId);
      notifications.success('Request processed successfully!');
    }, 3000);
  };

  // Example 5: Promise-based notification
  const handlePromise = async () => {
    const simulateAsync = () =>
      new Promise((resolve) => setTimeout(resolve, 2000));

    await notifications.promise(simulateAsync(), {
      loading: 'Uploading file...',
      success: 'File uploaded successfully!',
      error: 'Failed to upload file'
    });
  };

  // Example 6: Important notification (won't auto-dismiss)
  const handleImportant = () => {
    notifications.error('Critical system error', {
      description: 'Please contact support immediately',
      important: true,
      action: {
        label: 'Contact Support',
        onClick: () => alert('Opening support form...')
      }
    });
  };

  // Example 7: Custom duration
  const handleCustomDuration = () => {
    notifications.warning('Session expiring soon', {
      description: 'You will be logged out in 30 seconds',
      duration: 10000 // 10 seconds
    });
  };

  // Example 8: Real-world form submission
  const handleFormSubmit = async () => {
    const loadingId = notifications.loading('Saving changes...');

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      notifications.dismiss(loadingId);
      notifications.success('Data saved successfully!', {
        description: 'Your changes have been applied'
      });
    } catch (error) {
      notifications.dismiss(loadingId);
      notifications.error('Failed to save data', {
        description: 'Please try again later'
      });
    }
  };

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Notification System Examples</CardTitle>
          <CardDescription>
            Click the buttons below to see different notification patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={handleBasicNotifications}>
              1. Basic Notifications
            </Button>

            <Button onClick={handleWithDescription}>
              2. With Description
            </Button>

            <Button onClick={handleWithAction}>
              3. With Action Button
            </Button>

            <Button onClick={handleLoading}>
              4. Loading Notification
            </Button>

            <Button onClick={handlePromise}>
              5. Promise-based
            </Button>

            <Button onClick={handleImportant} variant="destructive">
              6. Important (No Auto-dismiss)
            </Button>

            <Button onClick={handleCustomDuration} variant="outline">
              7. Custom Duration
            </Button>

            <Button onClick={handleFormSubmit} variant="secondary">
              8. Form Submission Pattern
            </Button>

            <Button
              onClick={() => notifications.dismiss()}
              variant="ghost"
              className="col-span-2"
            >
              Dismiss All Notifications
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Usage Example</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
            <code>{`import { useNotification } from '@/contexts/NotificationContext';

function MyComponent() {
  const notifications = useNotification();

  const handleSave = async () => {
    await notifications.promise(
      saveData(),
      {
        loading: 'Saving...',
        success: 'Saved successfully!',
        error: 'Failed to save'
      }
    );
  };

  return <button onClick={handleSave}>Save</button>;
}`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
