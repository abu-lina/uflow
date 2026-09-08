/**
 * Plan 077 — Mobile header overlap regression tests
 * Plan 227 — Desktop header overlap fix (CSS variable approach)
 * Plan 228 — DiscoveryResultsGrid fixed overlay removed on desktop
 *
 * Validates the source files contain the correct CSS patterns so that the
 * fixed header never overlaps page content at any breakpoint.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function readSrc(relPath: string): string {
  return readFileSync(resolve(__dirname, '../../', relPath), 'utf-8');
}

describe('Plan 227 — Desktop header overlap: source-level guards', () => {
  const headerSrc = readSrc('components/layout/Header.tsx');
  const providersSrc = readSrc('app/(public)/providers/ProvidersContent.tsx');
  const discoveryHeaderSrc = readSrc('features/search/components/DiscoveryHeader.tsx');
  const rootPageSrc = readSrc('components/shared/RootPageContent.tsx');
  const gridSrc = readSrc('features/search/components/DiscoveryResultsGrid.tsx');

  it('Header.tsx uses borderBoxSize (not contentRect.height) for --desktop-header-height', () => {
    expect(headerSrc).toContain('borderBoxSize');
    expect(headerSrc).not.toContain('contentRect.height');
  });

  it('Header.tsx observes with border-box option', () => {
    expect(headerSrc).toContain("box: 'border-box'");
  });

  it('ProvidersContent uses var(--desktop-header-height) for desktop padding', () => {
    expect(providersSrc).toMatch(/md:pt-\[var\(--desktop-header-height/);
  });

  it('DiscoveryHeader uses md:hidden (not sm:hidden) to close the breakpoint gap', () => {
    expect(discoveryHeaderSrc).toContain('md:hidden');
    expect(discoveryHeaderSrc).not.toContain('sm:hidden');
  });

  it('RootPageContent landing header uses md:hidden (not sm:hidden)', () => {
    // The landing page fixed header should hide at md, matching desktop Header visibility
    expect(rootPageSrc).toMatch(/className="[^"]*md:hidden/);
    expect(rootPageSrc).not.toMatch(/className="[^"]*sm:hidden/);
  });

  it('DiscoveryHeader does not declare an unused section prop', () => {
    // The interface should not contain a standalone `section: Section` prop
    // (selectedSection is fine)
    const interfaceMatch = discoveryHeaderSrc.match(/interface DiscoveryHeaderProps\s*\{([^}]+)\}/);
    expect(interfaceMatch).toBeTruthy();
    const interfaceBody = interfaceMatch?.[1] ?? '';
    // Should have selectedSection but not a bare `section:` line
    expect(interfaceBody).toContain('selectedSection');
    expect(interfaceBody).not.toMatch(/^\s*section\s*:/m);
  });

  // Plan 228: DiscoveryResultsGrid must not be a fixed overlay on desktop
  it('DiscoveryResultsGrid uses md:static to drop fixed positioning on desktop', () => {
    expect(gridSrc).toContain('md:static');
  });

  it('DiscoveryResultsGrid uses md:inset-auto on desktop', () => {
    expect(gridSrc).toContain('md:inset-auto');
  });

  it('DiscoveryResultsGrid removes z-[21] on desktop with md:z-auto', () => {
    expect(gridSrc).toContain('md:z-auto');
  });

  it('DiscoveryResultsGrid keeps fixed inset-0 for mobile', () => {
    expect(gridSrc).toContain('fixed');
    expect(gridSrc).toContain('inset-0');
  });
});
