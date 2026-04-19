/**
 * Plan 091 M2: /suchen redirect contract tests
 *
 * Tests that the /suchen legacy route correctly redirects to /search
 * with section param preservation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import SuchenPage from '@/app/(public)/suchen/page';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  useSearchParams: () => mockSearchParams,
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('/suchen redirect page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it('redirects to /search when no section param is present', () => {
    mockSearchParams = new URLSearchParams();
    render(<SuchenPage />);
    
    expect(mockReplace).toHaveBeenCalledWith('/search');
  });

  it('redirects to /search?section=food when section=food param is present', () => {
    mockSearchParams = new URLSearchParams('section=food');
    render(<SuchenPage />);
    
    expect(mockReplace).toHaveBeenCalledWith('/search?section=food');
  });

  it('redirects to /search?section=ummah when section=ummah param is present', () => {
    mockSearchParams = new URLSearchParams('section=ummah');
    render(<SuchenPage />);
    
    expect(mockReplace).toHaveBeenCalledWith('/search?section=ummah');
  });

  it('redirects to /search?section=business when section=business param is present', () => {
    mockSearchParams = new URLSearchParams('section=business');
    render(<SuchenPage />);
    
    expect(mockReplace).toHaveBeenCalledWith('/search?section=business');
  });

  it('renders no UI (returns null)', () => {
    mockSearchParams = new URLSearchParams();
    const { container } = render(<SuchenPage />);
    
    // The component should not render any visible content
    expect(container.firstChild).toBeNull();
  });
});
