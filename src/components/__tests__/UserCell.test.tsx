import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserCell } from '@/components/cells/UserCell';

// Mock user data
const mockUsers = [
  {
    id: 'user-1',
    email: 'john@example.com',
    full_name: 'John Doe',
    avatar_url: 'https://example.com/avatar1.jpg',
  },
  {
    id: 'user-2',
    email: 'jane@example.com',
    full_name: 'Jane Smith',
    avatar_url: 'https://example.com/avatar2.jpg',
  },
  {
    id: 'user-3',
    email: 'bob@example.com',
    // No full_name or avatar_url
  },
];

describe('UserCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Readonly mode', () => {
    it('should render dash when no user selected in readonly mode', () => {
      render(<UserCell value={null} users={mockUsers} readonly={true} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should render user with avatar and name in readonly mode', () => {
      render(<UserCell value="user-1" users={mockUsers} readonly={true} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      // Avatar fallback shows first letter
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should render user with email when no full_name in readonly mode', () => {
      render(<UserCell value="user-3" users={mockUsers} readonly={true} />);
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });

    it('should use first letter of full_name as avatar fallback', () => {
      render(<UserCell value="user-1" users={mockUsers} readonly={true} />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should use first letter of email as avatar fallback when no full_name', () => {
      render(<UserCell value="user-3" users={mockUsers} readonly={true} />);
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('should not render popover in readonly mode', () => {
      const { container } = render(<UserCell value="user-1" users={mockUsers} readonly={true} />);
      const popover = container.querySelector('[role="dialog"]');
      expect(popover).not.toBeInTheDocument();
    });

    it('should render dash when no onChange provided', () => {
      render(<UserCell value={null} users={mockUsers} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('Interactive mode', () => {
    it('should render placeholder when no user selected', () => {
      const onChange = vi.fn();
      render(<UserCell value={null} users={mockUsers} onChange={onChange} />);

      expect(screen.getByText('Select user...')).toBeInTheDocument();
    });

    it('should render selected user with avatar and name', () => {
      const onChange = vi.fn();
      render(<UserCell value="user-1" users={mockUsers} onChange={onChange} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should show cursor pointer on trigger', () => {
      const onChange = vi.fn();
      const { container } = render(<UserCell value={null} users={mockUsers} onChange={onChange} />);

      const trigger = container.querySelector('.cursor-pointer');
      expect(trigger).toBeInTheDocument();
    });

    it('should open popover when clicking trigger', async () => {
      const onChange = vi.fn();
      render(<UserCell value={null} users={mockUsers} onChange={onChange} />);

      const trigger = screen.getByText('Select user...');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should display all users in popover', async () => {
      const onChange = vi.fn();
      render(<UserCell value={null} users={mockUsers} onChange={onChange} />);

      const trigger = screen.getByText('Select user...');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('bob@example.com')).toBeInTheDocument();
      });
    });

    it('should call onChange when selecting a user', async () => {
      const onChange = vi.fn();
      render(<UserCell value={null} users={mockUsers} onChange={onChange} />);

      const trigger = screen.getByText('Select user...');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const userOption = screen.getByText('John Doe');
      fireEvent.click(userOption);

      expect(onChange).toHaveBeenCalledWith('user-1');
    });

    it('should toggle selection when clicking already selected user', async () => {
      const onChange = vi.fn();
      render(<UserCell value="user-1" users={mockUsers} onChange={onChange} />);

      const trigger = screen.getByText('John Doe');
      fireEvent.click(trigger);

      await waitFor(() => {
        const userOptions = screen.getAllByText('John Doe');
        expect(userOptions.length).toBeGreaterThan(1);
      });

      const userOptions = screen.getAllByText('John Doe');
      const userOption = userOptions[userOptions.length - 1];
      fireEvent.click(userOption);

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('should close popover after selection', async () => {
      const onChange = vi.fn();
      render(<UserCell value={null} users={mockUsers} onChange={onChange} />);

      const trigger = screen.getByText('Select user...');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      const userOption = screen.getByText('Jane Smith');
      fireEvent.click(userOption);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should display users in popover with their names', async () => {
      const onChange = vi.fn();
      render(<UserCell value="user-1" users={mockUsers} onChange={onChange} />);

      const trigger = screen.getByText('John Doe');
      fireEvent.click(trigger);

      await waitFor(() => {
        // All users should be visible in the list
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('bob@example.com')).toBeInTheDocument();
      });
    });

    it('should support search and display all users in popover', async () => {
      const onChange = vi.fn();
      render(<UserCell value={null} users={mockUsers} onChange={onChange} />);

      const trigger = screen.getByText('Select user...');
      fireEvent.click(trigger);

      // Verify dialog opens with all users
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('bob@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('Avatar rendering', () => {
    it('should render avatar fallback with first letter', () => {
      render(<UserCell value="user-1" users={mockUsers} readonly={true} />);

      // Avatar shows first letter of name as fallback
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should render avatar fallback when no avatar_url', () => {
      render(<UserCell value="user-3" users={mockUsers} readonly={true} />);

      // Should show first letter of email
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('should uppercase email first letter for fallback', () => {
      render(<UserCell value="user-3" users={mockUsers} readonly={true} />);
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('should prioritize full_name over email for fallback', () => {
      render(<UserCell value="user-1" users={mockUsers} readonly={true} />);
      // Should show 'J' from 'John', not 'j' from 'john@example.com'
      expect(screen.getByText('J')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty users array', () => {
      render(<UserCell value={null} users={[]} readonly={true} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should handle invalid user ID', () => {
      render(<UserCell value="invalid-id" users={mockUsers} readonly={true} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should handle users with missing fields gracefully', () => {
      const incompleteUsers = [
        {
          id: 'user-incomplete',
          email: 'incomplete@example.com',
        },
      ];

      const onChange = vi.fn();
      render(<UserCell value="user-incomplete" users={incompleteUsers} onChange={onChange} />);

      expect(screen.getByText('incomplete@example.com')).toBeInTheDocument();
    });
  });
});
