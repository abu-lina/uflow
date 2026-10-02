// @vitest-environment jsdom
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Lottie } from 'lottie-react';
import { LottieAnimation } from '@/components/ui/LottieAnimation';

vi.mock('lottie-react', () => ({
  Lottie: vi.fn(() => null),
}));

const LottieMock = vi.mocked(Lottie);
const receivedProps = () => {
  const calls = LottieMock.mock.calls;
  return calls[calls.length - 1][0] as Record<string, unknown>;
};

describe('LottieAnimation', () => {
  beforeEach(() => {
    LottieMock.mockClear();
  });

  it('passes the animation object to Lottie via the v3 `src` prop', () => {
    const animationData = { v: '5.7.4', fr: 30 };
    render(<LottieAnimation animationData={animationData} />);
    expect(LottieMock).toHaveBeenCalledOnce();
    expect(receivedProps()).toEqual(expect.objectContaining({ src: animationData }));
  });

  it('does not pass a legacy `animationData` prop (v2 API)', () => {
    render(<LottieAnimation animationData={{ v: '5.7.4' }} />);
    expect(receivedProps()).not.toHaveProperty('animationData');
  });

  it('forwards loop and autoplay, both defaulting to true', () => {
    render(<LottieAnimation animationData={{}} />);
    expect(receivedProps()).toEqual(expect.objectContaining({ loop: true, autoplay: true }));
    render(<LottieAnimation animationData={{}} loop={false} autoplay={false} />);
    expect(receivedProps()).toEqual(expect.objectContaining({ loop: false, autoplay: false }));
  });

  it('converts a numeric height to px on the wrapper div', () => {
    const { container } = render(<LottieAnimation animationData={{}} height={200} />);
    expect((container.firstElementChild as HTMLElement).style.height).toBe('200px');
  });
});
