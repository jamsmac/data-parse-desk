import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useRateLimitedMutation,
  useRateLimitedDatabaseMutation,
  useRateLimitedDataMutation,
  useRateLimitedFileMutation,
  useRateLimitedAuthMutation,
} from '../useRateLimitedMutation';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
  }),
}));

vi.mock('@/lib/rateLimit', () => ({
  rateLimitedSupabaseCall: vi.fn((operation, userId, fn) => fn()),
  RateLimitConfigs: {
    createDatabase: {},
    updateDatabase: {},
    deleteDatabase: {},
    insertData: {},
    bulkOperations: {},
    fileUpload: {},
    fileDownload: {},
    login: {},
    register: {},
    passwordReset: {},
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useRateLimitedMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute mutation successfully', async () => {
    const mockMutationFn = vi.fn().mockResolvedValue({ success: true });

    const { result } = renderHook(
      () => useRateLimitedMutation('createDatabase', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ name: 'test' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockMutationFn).toHaveBeenCalledWith({ name: 'test' });
  });

  it('should handle rate limit error with toast', async () => {
    const { rateLimitedSupabaseCall } = await import('@/lib/rateLimit');

    const rateLimitError = new Error('Rate limit exceeded');
    (rateLimitError as any).code = 'RATE_LIMIT_EXCEEDED';
    (rateLimitError as any).resetTime = 5000;

    (rateLimitedSupabaseCall as any).mockRejectedValue(rateLimitError);

    const mockMutationFn = vi.fn();

    const { result } = renderHook(
      () => useRateLimitedMutation('createDatabase', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ name: 'test' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Слишком много запросов'),
      expect.objectContaining({
        description: expect.stringContaining('секунд'),
      })
    );
  });

  it('should call custom onError for rate limit', async () => {
    const { rateLimitedSupabaseCall } = await import('@/lib/rateLimit');
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const rateLimitError = new Error('Rate limit exceeded');
    (rateLimitError as any).code = 'RATE_LIMIT_EXCEEDED';
    (rateLimitError as any).remaining = 0;
    (rateLimitError as any).resetTime = 3000;

    (rateLimitedSupabaseCall as any).mockRejectedValue(rateLimitError);

    const mockMutationFn = vi.fn();
    const mockOnError = vi.fn();

    const { result } = renderHook(
      () =>
        useRateLimitedMutation('createDatabase', mockMutationFn, {
          onError: mockOnError,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ name: 'test' });
    });

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalled();
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Rate limit exceeded:',
      expect.objectContaining({
        operation: 'createDatabase',
        remaining: 0,
        resetTime: 3000,
      })
    );

    consoleWarnSpy.mockRestore();
  });

  it('should handle non-rate-limit errors', async () => {
    const { rateLimitedSupabaseCall } = await import('@/lib/rateLimit');

    const regularError = new Error('Regular error');
    (rateLimitedSupabaseCall as any).mockRejectedValue(regularError);

    const mockMutationFn = vi.fn();

    const { result } = renderHook(
      () => useRateLimitedMutation('createDatabase', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ name: 'test' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Should show rate limit toast
    expect(toast.error).toHaveBeenCalled();
  });
});

describe('useRateLimitedDatabaseMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show success toast on successful operation', async () => {
    const mockMutationFn = vi.fn().mockResolvedValue({ success: true });

    const { result } = renderHook(
      () => useRateLimitedDatabaseMutation('createDatabase', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ name: 'test' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(toast.success).toHaveBeenCalledWith('Операция выполнена успешно');
  });

  it('should show error toast on failure', async () => {
    const { rateLimitedSupabaseCall } = await import('@/lib/rateLimit');

    const error = new Error('Database error');
    (rateLimitedSupabaseCall as any).mockRejectedValue(error);

    const mockMutationFn = vi.fn();

    const { result } = renderHook(
      () => useRateLimitedDatabaseMutation('createDatabase', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ name: 'test' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Ошибка операции',
      expect.objectContaining({
        description: 'Database error',
      })
    );
  });

  it('should not show error toast for rate limit errors', async () => {
    const { rateLimitedSupabaseCall } = await import('@/lib/rateLimit');

    const rateLimitError = new Error('Rate limit exceeded');
    (rateLimitError as any).code = 'RATE_LIMIT_EXCEEDED';
    (rateLimitError as any).resetTime = 5000;

    (rateLimitedSupabaseCall as any).mockRejectedValue(rateLimitError);

    const mockMutationFn = vi.fn();

    const { result } = renderHook(
      () => useRateLimitedDatabaseMutation('createDatabase', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ name: 'test' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Should only show rate limit toast, not operation error toast
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Слишком много запросов'),
      expect.any(Object)
    );
  });

  it('should work with updateDatabase operation', async () => {
    const mockMutationFn = vi.fn().mockResolvedValue({ success: true });

    const { result } = renderHook(
      () => useRateLimitedDatabaseMutation('updateDatabase', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ id: '123', name: 'updated' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockMutationFn).toHaveBeenCalledWith({ id: '123', name: 'updated' });
  });

  it('should work with deleteDatabase operation', async () => {
    const mockMutationFn = vi.fn().mockResolvedValue({ success: true });

    const { result } = renderHook(
      () => useRateLimitedDatabaseMutation('deleteDatabase', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ id: '123' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockMutationFn).toHaveBeenCalledWith({ id: '123' });
  });
});

describe('useRateLimitedDataMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle insertData operation', async () => {
    const mockMutationFn = vi.fn().mockResolvedValue({ success: true });

    const { result } = renderHook(
      () => useRateLimitedDataMutation('insertData', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ data: [1, 2, 3] });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockMutationFn).toHaveBeenCalledWith({ data: [1, 2, 3] });
  });

  it('should handle bulkOperations', async () => {
    const mockMutationFn = vi.fn().mockResolvedValue({ success: true });

    const { result } = renderHook(
      () => useRateLimitedDataMutation('bulkOperations', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ operations: [] });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should show error toast on failure', async () => {
    const { rateLimitedSupabaseCall } = await import('@/lib/rateLimit');

    const error = new Error('Data error');
    (rateLimitedSupabaseCall as any).mockRejectedValue(error);

    const mockMutationFn = vi.fn();

    const { result } = renderHook(
      () => useRateLimitedDataMutation('insertData', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ data: [] });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Ошибка при работе с данными',
      expect.objectContaining({
        description: 'Data error',
      })
    );
  });
});

describe('useRateLimitedFileMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle fileUpload operation', async () => {
    const mockMutationFn = vi.fn().mockResolvedValue({ url: 'http://example.com/file' });

    const { result } = renderHook(
      () => useRateLimitedFileMutation('fileUpload', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ file: new Blob() });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle fileDownload operation', async () => {
    const mockMutationFn = vi.fn().mockResolvedValue({ data: new Blob() });

    const { result } = renderHook(
      () => useRateLimitedFileMutation('fileDownload', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ fileId: '123' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should show error toast on file error', async () => {
    const { rateLimitedSupabaseCall } = await import('@/lib/rateLimit');

    const error = new Error('File too large');
    (rateLimitedSupabaseCall as any).mockRejectedValue(error);

    const mockMutationFn = vi.fn();

    const { result } = renderHook(
      () => useRateLimitedFileMutation('fileUpload', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ file: new Blob() });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Ошибка при работе с файлом',
      expect.objectContaining({
        description: 'File too large',
      })
    );
  });
});

describe('useRateLimitedAuthMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle login operation', async () => {
    const mockMutationFn = vi.fn().mockResolvedValue({ user: { id: '123' } });

    const { result } = renderHook(
      () => useRateLimitedAuthMutation('login', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ email: 'test@example.com', password: 'password' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle register operation', async () => {
    const mockMutationFn = vi.fn().mockResolvedValue({ user: { id: '123' } });

    const { result } = renderHook(
      () => useRateLimitedAuthMutation('register', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ email: 'test@example.com', password: 'password' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle passwordReset operation', async () => {
    const mockMutationFn = vi.fn().mockResolvedValue({ success: true });

    const { result } = renderHook(
      () => useRateLimitedAuthMutation('passwordReset', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ email: 'test@example.com' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should show security message for rate limit errors', async () => {
    const { rateLimitedSupabaseCall } = await import('@/lib/rateLimit');

    const rateLimitError = new Error('Rate limit exceeded');
    (rateLimitError as any).code = 'RATE_LIMIT_EXCEEDED';
    (rateLimitError as any).resetTime = 10000;

    (rateLimitedSupabaseCall as any).mockRejectedValue(rateLimitError);

    const mockMutationFn = vi.fn();

    const { result } = renderHook(
      () => useRateLimitedAuthMutation('login', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ email: 'test@example.com', password: 'password' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Should show both rate limit toast and security message
    expect(toast.error).toHaveBeenCalledWith(
      'Слишком много попыток',
      expect.objectContaining({
        description: expect.stringContaining('В целях безопасности'),
      })
    );
  });

  it('should show auth error for non-rate-limit errors', async () => {
    const { rateLimitedSupabaseCall } = await import('@/lib/rateLimit');

    const error = new Error('Invalid credentials');
    (rateLimitedSupabaseCall as any).mockRejectedValue(error);

    const mockMutationFn = vi.fn();

    const { result } = renderHook(
      () => useRateLimitedAuthMutation('login', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ email: 'test@example.com', password: 'wrong' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Ошибка аутентификации',
      expect.objectContaining({
        description: 'Invalid credentials',
      })
    );
  });
});

describe('Edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle unknown error type', async () => {
    const { rateLimitedSupabaseCall } = await import('@/lib/rateLimit');

    (rateLimitedSupabaseCall as any).mockRejectedValue('string error');

    const mockMutationFn = vi.fn();

    const { result } = renderHook(
      () => useRateLimitedDatabaseMutation('createDatabase', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ name: 'test' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Ошибка операции',
      expect.objectContaining({
        description: 'Неизвестная ошибка',
      })
    );
  });

  it('should pass user ID to rate limiter', async () => {
    const { rateLimitedSupabaseCall } = await import('@/lib/rateLimit');
    const mockMutationFn = vi.fn().mockResolvedValue({ success: true });

    const { result } = renderHook(
      () => useRateLimitedMutation('createDatabase', mockMutationFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      result.current.mutate({ name: 'test' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(rateLimitedSupabaseCall).toHaveBeenCalledWith(
      'createDatabase',
      'user-123',
      expect.any(Function)
    );
  });
});
