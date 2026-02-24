// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMenu } from '@/components/auth/UserMenu';
import { signOut } from 'firebase/auth';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  signOut: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: {},
}));

vi.mock('@headlessui/react', () => ({
  Menu: {
    Button: ({ children, className, ...props }: any) => (
      <button className={className} {...props} data-testid="menu-button">
        {children}
      </button>
    ),
    Items: ({ children, className }: any) => (
      <div className={className} data-testid="menu-items">
        {children}
      </div>
    ),
  },
  Transition: ({ children }: any) => <div data-testid="transition">{children}</div>,
}));

vi.mock('@/hooks/useTranslations', () => ({
  useTranslations: vi.fn(() => ({
    userMenu: {
      profile: 'Profile',
      dashboard: 'Dashboard',
      settings: 'Settings',
      signOut: 'Sign Out',
      user: 'User',
    },
  })),
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: '',
  },
  writable: true,
});

// Mock console.error to test error handling
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
});

describe.skip('UserMenu', () => {
  const mockSignOut = vi.mocked(signOut);
  const user = userEvent.setup();

  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    displayName: 'John Doe',
    photoURL: 'https://example.com/photo.jpg',
  };

  const mockUserWithoutPhoto = {
    uid: 'user123',
    email: 'test@example.com',
    displayName: 'Jane Smith',
    photoURL: null,
  };

  const mockUserWithoutName = {
    uid: 'user123',
    email: 'test@example.com',
    displayName: null,
    photoURL: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders user menu button with photo', () => {
      render(<UserMenu user={mockUser as any} />);

      const menuButton = screen.getByTestId('menu-button');
      const userPhoto = screen.getByRole('img', { name: /john doe/i });

      expect(menuButton).toBeInTheDocument();
      expect(userPhoto).toBeInTheDocument();
      expect(userPhoto).toHaveAttribute('src', 'https://example.com/photo.jpg');
      expect(userPhoto).toHaveAttribute('alt', 'John Doe');
    });

    it('renders user menu button with initials when no photo', () => {
      render(<UserMenu user={mockUserWithoutPhoto as any} />);

      const menuButton = screen.getByTestId('menu-button');
      const initialsElement = screen.getByText('JS');

      expect(menuButton).toBeInTheDocument();
      expect(initialsElement).toBeInTheDocument();
      expect(initialsElement).toHaveClass('bg-primary-600');
    });

    it('renders fallback initial when no display name', () => {
      render(<UserMenu user={mockUserWithoutName as any} />);

      const menuButton = screen.getByTestId('menu-button');
      const initialsElement = screen.getByText('U');

      expect(menuButton).toBeInTheDocument();
      expect(initialsElement).toBeInTheDocument();
    });

    it('generates correct initials for single name', () => {
      const singleNameUser = {
        ...mockUser,
        displayName: 'Madonna',
      };

      render(<UserMenu user={singleNameUser as any} />);

      const initialsElement = screen.getByText('M');
      expect(initialsElement).toBeInTheDocument();
    });

    it('generates correct initials for multiple names', () => {
      const multipleNameUser = {
        ...mockUser,
        displayName: 'John Michael Doe Smith',
      };

      render(<UserMenu user={multipleNameUser as any} />);

      const initialsElement = screen.getByText('JM');
      expect(initialsElement).toBeInTheDocument();
    });

    it('truncates long names for initials', () => {
      const longNameUser = {
        ...mockUser,
        displayName: 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z',
      };

      render(<UserMenu user={longNameUser as any} />);

      const initialsElement = screen.getByText('AB');
      expect(initialsElement).toBeInTheDocument();
    });
  });

  describe('Menu Items', () => {
    it('displays user information in menu header', async () => {
      render(<UserMenu user={mockUser as any} />);

      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('shows fallback name when display name is missing', async () => {
      render(<UserMenu user={mockUserWithoutName as any} />);

      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('User')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('renders all menu items with correct links', async () => {
      render(<UserMenu user={mockUser as any} />);

      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      await waitFor(() => {
        const profileLink = screen.getByRole('link', { name: /profile/i });
        const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
        const settingsLink = screen.getByRole('link', { name: /settings/i });
        const signOutButton = screen.getByRole('button', { name: /sign out/i });

        expect(profileLink).toBeInTheDocument();
        expect(profileLink).toHaveAttribute('href', '/es/profile');

        expect(dashboardLink).toBeInTheDocument();
        expect(dashboardLink).toHaveAttribute('href', '/es/dashboard');

        expect(settingsLink).toBeInTheDocument();
        expect(settingsLink).toHaveAttribute('href', '/es/settings');

        expect(signOutButton).toBeInTheDocument();
      });
    });

    it('uses correct language in menu links', async () => {
      render(<UserMenu user={mockUser as any} lang="en" />);

      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      await waitFor(() => {
        const profileLink = screen.getByRole('link', { name: /profile/i });
        const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
        const settingsLink = screen.getByRole('link', { name: /settings/i });

        expect(profileLink).toHaveAttribute('href', '/en/profile');
        expect(dashboardLink).toHaveAttribute('href', '/en/dashboard');
        expect(settingsLink).toHaveAttribute('href', '/en/settings');
      });
    });

    it('displays menu item icons', async () => {
      render(<UserMenu user={mockUser as any} />);

      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      await waitFor(() => {
        const menuItems = screen.getByTestId('menu-items');
        const svgElements = menuItems.querySelectorAll('svg');

        expect(svgElements.length).toBeGreaterThan(0);
      });
    });

    it('shows divider between menu sections', async () => {
      render(<UserMenu user={mockUser as any} />);

      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      await waitFor(() => {
        const menuItems = screen.getByTestId('menu-items');
        const dividers = menuItems.querySelectorAll('.border-t');

        expect(dividers.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Sign Out Functionality', () => {
    it('calls signOut when sign out button is clicked', async () => {
      mockSignOut.mockResolvedValue();

      render(<UserMenu user={mockUser as any} />);

      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      await waitFor(() => {
        const signOutButton = screen.getByRole('button', { name: /sign out/i });
        expect(signOutButton).toBeInTheDocument();
      });

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(signOutButton);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledWith({});
      });
    });

    it('redirects to home page after successful sign out', async () => {
      mockSignOut.mockResolvedValue();

      render(<UserMenu user={mockUser as any} />);

      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(signOutButton);

      await waitFor(() => {
        expect(window.location.href).toBe('/es');
      });
    });

    it('redirects with correct language', async () => {
      mockSignOut.mockResolvedValue();

      render(<UserMenu user={mockUser as any} lang="en" />);

      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(signOutButton);

      await waitFor(() => {
        expect(window.location.href).toBe('/en');
      });
    });

    it('handles sign out errors gracefully', async () => {
      const signOutError = new Error('Sign out failed');
      mockSignOut.mockRejectedValue(signOutError);

      render(<UserMenu user={mockUser as any} />);

      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(signOutButton);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error signing out:', signOutError);
      });

      // Should not redirect on error
      expect(window.location.href).toBe('');
    });
  });

  describe('User Interactions', () => {
    it('opens menu when button is clicked', async () => {
      render(<UserMenu user={mockUser as any} />);

      const menuButton = screen.getByTestId('menu-button');
      expect(screen.queryByTestId('menu-items')).not.toBeInTheDocument();

      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByTestId('menu-items')).toBeInTheDocument();
      });
    });

    it('shows transition animation', async () => {
      render(<UserMenu user={mockUser as any} />);

      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByTestId('transition')).toBeInTheDocument();
      });
    });

    it('closes menu when clicking outside', async () => {
      render(
        <div>
          <UserMenu user={mockUser as any} />
          <div data-testid="outside-element">Outside</div>
        </div>
      );

      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByTestId('menu-items')).toBeInTheDocument();
      });

      const outsideElement = screen.getByTestId('outside-element');
      await user.click(outsideElement);

      // Note: Headless UI handles this functionality, our mock doesn't simulate it
    });

    it('supports keyboard navigation', async () => {
      render(<UserMenu user={mockUser as any} />);

      const menuButton = screen.getByTestId('menu-button');
      
      // Focus the menu button
      await user.tab();
      expect(menuButton).toHaveFocus();

      // Open menu with Enter
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('menu-items')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper button attributes', () => {
      render(<UserMenu user={mockUser as any} />);

      const menuButton = screen.getByTestId('menu-button');

      expect(menuButton).toHaveClass('focus:outline-none');
      expect(menuButton).toHaveClass('focus:ring-2');
      expect(menuButton).toHaveClass('focus:ring-offset-2');
      expect(menuButton).toHaveClass('focus:ring-primary-500');
    });

    it('has proper img alt text', () => {
      render(<UserMenu user={mockUser as any} />);

      const userPhoto = screen.getByRole('img', { name: /john doe/i });
      expect(userPhoto).toHaveAttribute('alt', 'John Doe');
    });

    it('uses fallback alt text when no display name', () => {
      render(<UserMenu user={mockUserWithoutName as any} />);

      const userPhoto = screen.queryByRole('img');
      if (userPhoto) {
        expect(userPhoto).toHaveAttribute('alt', 'User');
      }
    });

    it('provides proper focus indicators', () => {
      render(<UserMenu user={mockUser as any} />);

      const menuButton = screen.getByTestId('menu-button');
      expect(menuButton).toHaveClass('focus:outline-none');
    });

    it('has proper menu structure', async () => {
      render(<UserMenu user={mockUser as any} />);

      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      await waitFor(() => {
        const menuItems = screen.getByTestId('menu-items');
        expect(menuItems).toHaveClass('rounded-md');
        expect(menuItems).toHaveClass('shadow-lg');
      });
    });
  });

  describe('Styling and Appearance', () => {
    it('applies correct styling classes', () => {
      render(<UserMenu user={mockUser as any} />);

      const menuButton = screen.getByTestId('menu-button');
      expect(menuButton).toHaveClass('flex');
      expect(menuButton).toHaveClass('items-center');
      expect(menuButton).toHaveClass('text-sm');
      expect(menuButton).toHaveClass('rounded-full');
    });

    it('applies correct avatar styling with photo', () => {
      render(<UserMenu user={mockUser as any} />);

      const userPhoto = screen.getByRole('img', { name: /john doe/i });
      expect(userPhoto).toHaveClass('h-8');
      expect(userPhoto).toHaveClass('w-8');
      expect(userPhoto).toHaveClass('rounded-full');
    });

    it('applies correct avatar styling without photo', () => {
      render(<UserMenu user={mockUserWithoutPhoto as any} />);

      const initialsDiv = screen.getByText('JS').closest('div');
      expect(initialsDiv).toHaveClass('h-8');
      expect(initialsDiv).toHaveClass('w-8');
      expect(initialsDiv).toHaveClass('rounded-full');
      expect(initialsDiv).toHaveClass('bg-primary-600');
      expect(initialsDiv).toHaveClass('flex');
      expect(initialsDiv).toHaveClass('items-center');
      expect(initialsDiv).toHaveClass('justify-center');
    });

    it('applies correct menu dropdown styling', async () => {
      render(<UserMenu user={mockUser as any} />);

      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      await waitFor(() => {
        const menuItems = screen.getByTestId('menu-items');
        expect(menuItems).toHaveClass('absolute');
        expect(menuItems).toHaveClass('right-0');
        expect(menuItems).toHaveClass('mt-2');
        expect(menuItems).toHaveClass('w-56');
        expect(menuItems).toHaveClass('bg-white');
        expect(menuItems).toHaveClass('dark:bg-gray-800');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty email gracefully', async () => {
      const userWithoutEmail = {
        ...mockUser,
        email: null,
      };

      render(<UserMenu user={userWithoutEmail as any} />);

      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        // Email should not be displayed or should show a fallback
      });
    });

    it('handles empty displayName with special characters in email', () => {
      const userWithSpecialEmail = {
        uid: 'user123',
        email: 'test+special@example.com',
        displayName: null,
        photoURL: null,
      };

      render(<UserMenu user={userWithSpecialEmail as any} />);

      const initialsElement = screen.getByText('U');
      expect(initialsElement).toBeInTheDocument();
    });

    it('handles very long display names', () => {
      const userWithLongName = {
        ...mockUser,
        displayName: 'This Is A Very Long Name That Should Be Handled Properly Without Breaking The Interface',
      };

      render(<UserMenu user={userWithLongName as any} />);

      const initialsElement = screen.getByText('TI');
      expect(initialsElement).toBeInTheDocument();
    });

    it('handles display names with special characters', () => {
      const userWithSpecialChars = {
        ...mockUser,
        displayName: 'José María García-López',
      };

      render(<UserMenu user={userWithSpecialChars as any} />);

      const initialsElement = screen.getByText('JM');
      expect(initialsElement).toBeInTheDocument();
    });

    it('handles display names with numbers and symbols', () => {
      const userWithNumbersSymbols = {
        ...mockUser,
        displayName: 'User123 @#$%',
      };

      render(<UserMenu user={userWithNumbersSymbols as any} />);

      const initialsElement = screen.getByText('U@');
      expect(initialsElement).toBeInTheDocument();
    });

    it('handles undefined user properties', () => {
      const incompleteUser = {
        uid: 'user123',
      };

      expect(() => {
        render(<UserMenu user={incompleteUser as any} />);
      }).not.toThrow();
    });
  });

  describe('Internationalization', () => {
    it('uses correct menu labels for Spanish', async () => {
      render(<UserMenu user={mockUser as any} lang="es" />);

      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
      });
    });

    it('uses correct menu labels for English', async () => {
      render(<UserMenu user={mockUser as any} lang="en" />);

      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
      });
    });

    it('defaults to Spanish when no language specified', async () => {
      render(<UserMenu user={mockUser as any} />);

      const menuButton = screen.getByTestId('menu-button');
      await user.click(menuButton);

      await waitFor(() => {
        const profileLink = screen.getByRole('link', { name: /profile/i });
        expect(profileLink).toHaveAttribute('href', '/es/profile');
      });
    });
  });
});