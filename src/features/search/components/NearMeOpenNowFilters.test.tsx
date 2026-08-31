import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NearMeOpenNowFilters } from './NearMeOpenNowFilters';

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: userAgent,
    configurable: true,
  });
}

const t = (key: string, params?: Record<string, string | number>) => {
  const map: Record<string, string> = {
    'suchen.nearMe.chipLabel': 'In der Nähe',
    'suchen.nearMe.chipLabelWithRadius': `In der Nähe (${params?.km ?? ''} km)`,
    'suchen.nearMe.radiusLabel': 'Radius:',
    'suchen.nearMe.permissionDenied': 'Standort nicht verfügbar',
    'suchen.nearMe.permissionDeniedHintIos': 'Standort gesperrt. Öffne Einstellungen → Datenschutz → Ortungsdienste.',
    'suchen.nearMe.permissionDeniedHintAndroid': 'Standort gesperrt. Erlaube den Zugriff in den Browser-Einstellungen.',
    'suchen.nearMe.permissionDeniedHintFallback': 'Standort gesperrt. Bitte erlaube den Standortzugriff in deinen Geräteeinstellungen.',
    'suchen.openNow.chipLabel': 'Jetzt geöffnet',
  };
  return map[key] ?? key;
};

describe('NearMeOpenNowFilters', () => {
  it('renders the near-me and open-now chips', () => {
    render(
      <NearMeOpenNowFilters
        geoStatus="idle"
        nearMeActive={false}
        openNowActive={false}
        radiusKm={2}
        t={t}
        onRadiusChange={vi.fn()}
        onToggleNearMe={vi.fn()}
        onToggleOpenNow={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /In der Nähe/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Jetzt geöffnet/i })).toBeInTheDocument();
  });

  it('calls onToggleNearMe when the near-me chip is clicked', () => {
    const onToggleNearMe = vi.fn();
    render(
      <NearMeOpenNowFilters
        geoStatus="idle"
        nearMeActive={false}
        openNowActive={false}
        radiusKm={2}
        t={t}
        onRadiusChange={vi.fn()}
        onToggleNearMe={onToggleNearMe}
        onToggleOpenNow={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /In der Nähe/i }));
    expect(onToggleNearMe).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleOpenNow when the open-now chip is clicked', () => {
    const onToggleOpenNow = vi.fn();
    render(
      <NearMeOpenNowFilters
        geoStatus="idle"
        nearMeActive={false}
        openNowActive={false}
        radiusKm={2}
        t={t}
        onRadiusChange={vi.fn()}
        onToggleNearMe={vi.fn()}
        onToggleOpenNow={onToggleOpenNow}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Jetzt geöffnet/i }));
    expect(onToggleOpenNow).toHaveBeenCalledTimes(1);
  });

  it('marks the open-now chip as pressed when active', () => {
    render(
      <NearMeOpenNowFilters
        geoStatus="idle"
        nearMeActive={false}
        openNowActive={true}
        radiusKm={2}
        t={t}
        onRadiusChange={vi.fn()}
        onToggleNearMe={vi.fn()}
        onToggleOpenNow={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Jetzt geöffnet/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows radius pills when near-me is active and location granted', () => {
    render(
      <NearMeOpenNowFilters
        geoStatus="granted"
        nearMeActive={true}
        openNowActive={false}
        radiusKm={5}
        t={t}
        onRadiusChange={vi.fn()}
        onToggleNearMe={vi.fn()}
        onToggleOpenNow={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '2 km' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5 km' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '10 km' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5 km' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows radius pills when near-me is active but geolocation is idle (page reload from URL params)', () => {
    render(
      <NearMeOpenNowFilters
        geoStatus="idle"
        nearMeActive={true}
        openNowActive={false}
        radiusKm={5}
        t={t}
        onRadiusChange={vi.fn()}
        onToggleNearMe={vi.fn()}
        onToggleOpenNow={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '2 km' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5 km' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onRadiusChange when a radius pill is clicked', () => {
    const onRadiusChange = vi.fn();
    render(
      <NearMeOpenNowFilters
        geoStatus="granted"
        nearMeActive={true}
        openNowActive={false}
        radiusKm={2}
        t={t}
        onRadiusChange={onRadiusChange}
        onToggleNearMe={vi.fn()}
        onToggleOpenNow={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '10 km' }));
    expect(onRadiusChange).toHaveBeenCalledWith(10);
  });

  it('does not show radius pills when near-me is inactive', () => {
    render(
      <NearMeOpenNowFilters
        geoStatus="idle"
        nearMeActive={false}
        openNowActive={false}
        radiusKm={2}
        t={t}
        onRadiusChange={vi.fn()}
        onToggleNearMe={vi.fn()}
        onToggleOpenNow={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: '2 km' })).not.toBeInTheDocument();
  });

  it('shows a permission-denied message when geolocation is denied while near-me is active', () => {
    render(
      <NearMeOpenNowFilters
        geoStatus="denied"
        nearMeActive={true}
        openNowActive={false}
        radiusKm={2}
        t={t}
        onRadiusChange={vi.fn()}
        onToggleNearMe={vi.fn()}
        onToggleOpenNow={vi.fn()}
      />,
    );

    expect(screen.getByText('Standort nicht verfügbar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '2 km' })).not.toBeInTheDocument();
  });

  it('[pre-fix FAILS / post-fix PASSES] denied state shows iOS-specific recovery hint', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148');

    render(
      <NearMeOpenNowFilters
        geoStatus="denied"
        nearMeActive={true}
        openNowActive={false}
        radiusKm={2}
        t={t}
        onRadiusChange={vi.fn()}
        onToggleNearMe={vi.fn()}
        onToggleOpenNow={vi.fn()}
      />,
    );

    expect(screen.getByText('Standort nicht verfügbar')).toBeInTheDocument();
    expect(
      screen.getByText('Standort gesperrt. Öffne Einstellungen → Datenschutz → Ortungsdienste.'),
    ).toBeInTheDocument();
  });

  it('[pre-fix FAILS / post-fix PASSES] denied state shows Android-specific recovery hint', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36');

    render(
      <NearMeOpenNowFilters
        geoStatus="denied"
        nearMeActive={true}
        openNowActive={false}
        radiusKm={2}
        t={t}
        onRadiusChange={vi.fn()}
        onToggleNearMe={vi.fn()}
        onToggleOpenNow={vi.fn()}
      />,
    );

    expect(screen.getByText('Standort nicht verfügbar')).toBeInTheDocument();
    expect(
      screen.getByText('Standort gesperrt. Erlaube den Zugriff in den Browser-Einstellungen.'),
    ).toBeInTheDocument();
  });

  it('[pre-fix FAILS / post-fix PASSES] denied state shows fallback recovery hint', () => {
    setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    render(
      <NearMeOpenNowFilters
        geoStatus="denied"
        nearMeActive={true}
        openNowActive={false}
        radiusKm={2}
        t={t}
        onRadiusChange={vi.fn()}
        onToggleNearMe={vi.fn()}
        onToggleOpenNow={vi.fn()}
      />,
    );

    expect(screen.getByText('Standort nicht verfügbar')).toBeInTheDocument();
    expect(
      screen.getByText('Standort gesperrt. Bitte erlaube den Standortzugriff in deinen Geräteeinstellungen.'),
    ).toBeInTheDocument();
  });

  it('timeout state keeps denied label without settings guidance hint', () => {
    render(
      <NearMeOpenNowFilters
        geoStatus="timeout"
        nearMeActive={true}
        openNowActive={false}
        radiusKm={2}
        t={t}
        onRadiusChange={vi.fn()}
        onToggleNearMe={vi.fn()}
        onToggleOpenNow={vi.fn()}
      />,
    );

    expect(screen.getByText('Standort nicht verfügbar')).toBeInTheDocument();
    expect(screen.queryByText(/Standort gesperrt\./)).not.toBeInTheDocument();
  });

  it('unavailable state keeps denied label without settings guidance hint', () => {
    render(
      <NearMeOpenNowFilters
        geoStatus="unavailable"
        nearMeActive={true}
        openNowActive={false}
        radiusKm={2}
        t={t}
        onRadiusChange={vi.fn()}
        onToggleNearMe={vi.fn()}
        onToggleOpenNow={vi.fn()}
      />,
    );

    expect(screen.getByText('Standort nicht verfügbar')).toBeInTheDocument();
    expect(screen.queryByText(/Standort gesperrt\./)).not.toBeInTheDocument();
  });
});
