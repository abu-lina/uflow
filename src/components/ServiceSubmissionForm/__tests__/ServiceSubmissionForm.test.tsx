import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ServiceSubmissionForm from '../index';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AuthProvider } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test-image.jpg' } }),
      }),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } },
      }),
    },
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id' },
    isLoading: false,
  })),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

// Mock fetch for API calls
global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ id: 'test-service-id' }),
  })
);

describe('ServiceSubmissionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  test('renders the form with correct steps', () => {
    render(<ServiceSubmissionForm />);
    
    // Check if the first step is shown
    expect(screen.getByText('Service Name')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    
    // Check if the step indicator shows step 1
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
  });
  
  test('validates required fields on first step', async () => {
    render(<ServiceSubmissionForm />);
    
    // Click continue without filling required fields
    fireEvent.click(screen.getByText('Continue'));
    
    // Wait for validation errors
    await waitFor(() => {
      expect(screen.getByText('Service name must be at least 5 characters')).toBeInTheDocument();
      expect(screen.getByText('Please select a category')).toBeInTheDocument();
    });
  });
  
  test('navigates to the next step after filling required fields', async () => {
    render(<ServiceSubmissionForm />);
    
    // Fill out the first step
    fireEvent.change(screen.getByLabelText(/Service Name/i), {
      target: { value: 'Test Service' },
    });
    
    fireEvent.change(screen.getByLabelText(/Category/i), {
      target: { value: 'technology' },
    });
    
    // Click continue
    fireEvent.click(screen.getByText('Continue'));
    
    // Check if we're on step 2
    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
    });
  });
  
  test('completes the form submission process', async () => {
    const router = useRouter();
    render(<ServiceSubmissionForm />);
    
    // Step 1: Fill basic info
    fireEvent.change(screen.getByLabelText(/Service Name/i), {
      target: { value: 'Complete Test Service' },
    });
    
    fireEvent.change(screen.getByLabelText(/Category/i), {
      target: { value: 'education' },
    });
    
    fireEvent.click(screen.getByText('Continue'));
    
    // Step 2: Fill service details
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/Description/i), {
        target: { value: 'This is a detailed description for testing purposes that meets the minimum length requirements.' },
      });
      
      fireEvent.change(screen.getByLabelText(/Price/i), {
        target: { value: '99.99' },
      });
    });
    
    fireEvent.click(screen.getByText('Continue'));
    
    // Step 3: Upload media (mock the file upload)
    await waitFor(() => {
      const file = new File(['test'], 'test-image.jpg', { type: 'image/jpeg' });
      const inputEl = screen.getByLabelText(/Service Images/i);
      
      Object.defineProperty(inputEl, 'files', {
        value: [file],
      });
      
      fireEvent.change(inputEl);
    });
    
    fireEvent.click(screen.getByText('Continue'));
    
    // Step 4: Review and submit
    await waitFor(() => {
      expect(screen.getByText('Review Your Service')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Submit Service'));
    
    // Check if API was called and redirect happened
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/services', expect.any(Object));
      expect(router.push).toHaveBeenCalledWith('/services/submission-success?id=test-service-id');
    });
  });
}); 