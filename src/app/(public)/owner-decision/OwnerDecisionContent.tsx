'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { validateOutreachToken, hashToken } from '@/services/outreach';

type ActionType = 'keep' | 'claim' | 'remove';
type PageState = 'loading' | 'error' | 'decision' | 'success' | 'processing';

interface TokenInfo {
  providerId: string;
  providerName: string;
  actionScope: string;
}

interface OwnerDecisionContentProps {
  whatsappUrl: string | null;
}

export function OwnerDecisionContent({ whatsappUrl }: OwnerDecisionContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [state, setState] = useState<PageState>('loading');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [completedAction, setCompletedAction] = useState<ActionType | null>(null);

  // Validate token on mount
  useEffect(() => {
    async function checkToken() {
      const token = searchParams.get('token');

      if (!token) {
        setErrorMessage('Kein Token vorhanden. Bitte verwenden Sie den Link aus der E-Mail.');
        setState('error');
        return;
      }

      try {
        const tokenHash = hashToken(token);
        const result = await validateOutreachToken(tokenHash);

        if (!result.isValid) {
          setErrorMessage(
            result.errorMessage === 'Token expired'
              ? 'Dieser Link ist abgelaufen. Bitte kontaktieren Sie uns für einen neuen Link.'
              : result.errorMessage === 'Token already used'
                ? 'Dieser Link wurde bereits verwendet.'
                : 'Ungültiger Link. Bitte überprüfen Sie die URL oder kontaktieren Sie uns.',
          );
          setState('error');
          return;
        }

        // Validate that required fields are present when token is valid
        if (!result.providerId || !result.providerName || !result.actionScope) {
          setErrorMessage('Ungültige Token-Daten. Bitte kontaktieren Sie uns.');
          setState('error');
          return;
        }

        setTokenInfo({
          providerId: result.providerId,
          providerName: result.providerName,
          actionScope: result.actionScope,
        });
        setState('decision');
      } catch (error) {
        console.error('Token validation error:', error);
        setErrorMessage('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
        setState('error');
      }
    }

    checkToken();
  }, [searchParams]);

  const handleAction = async (action: ActionType) => {
    if (!tokenInfo) return;

    if (action === 'claim') {
      // Redirect to signup with token info
      const token = searchParams.get('token');
      router.push(
        `/signup?claim=${encodeURIComponent(token || '')}&provider=${tokenInfo.providerId}`,
      );
      return;
    }

    setState('processing');

    try {
      const token = searchParams.get('token');
      const response = await fetch('/api/outreach/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          action: action,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Aktion fehlgeschlagen');
      }

      setCompletedAction(action);
      setState('success');
    } catch (error) {
      console.error('Action error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten');
      setState('error');
    }
  };

  // Loading state
  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-100 to-neutral-50">
        <div className="text-center">
          <div className="border-primary-600 mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p className="text-neutral-600">Laden...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-100 to-neutral-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M6 18L18 6M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-semibold text-neutral-900">Link ungültig</h1>
          <p className="mb-6 text-neutral-600">{errorMessage}</p>
          <a
            className="bg-primary-600 hover:bg-primary-700 inline-block rounded-xl px-6 py-3 font-medium text-white transition-colors"
            href="mailto:kontakt@ummahflow.com"
          >
            Kontakt aufnehmen
          </a>
        </div>
      </div>
    );
  }

  // Processing state
  if (state === 'processing') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-100 to-neutral-50">
        <div className="text-center">
          <div className="border-primary-600 mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p className="text-neutral-600">Wird verarbeitet...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (state === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-100 to-neutral-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M5 13l4 4L19 7"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-semibold text-neutral-900">
            {completedAction === 'keep' ? 'Vielen Dank!' : 'Erfolgreich'}
          </h1>
          <p className="mb-6 text-neutral-600">
            {completedAction === 'keep'
              ? 'Ihr Eintrag bleibt auf Ummah Flow gelistet. Sie werden keine weiteren E-Mails von uns erhalten.'
              : 'Ihr Eintrag wurde zur Entfernung markiert und wird in Kürze von der Plattform entfernt.'}
          </p>
          <a
            className="bg-primary-600 hover:bg-primary-700 inline-block rounded-xl px-6 py-3 font-medium text-white transition-colors"
            href="https://ummahflow.com"
          >
            Zur Startseite
          </a>
        </div>
      </div>
    );
  }

  // Decision state (main view)
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-100 to-neutral-50 px-4 py-12">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-lg">
        {/* Header */}
        <div className="border-b border-neutral-200 bg-gradient-to-b from-neutral-100 to-neutral-50 px-8 py-6 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900">Ummah Flow</h1>
          <p className="mt-1 text-neutral-600">Von Muslimen für Muslime.</p>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900">
            Ihr Eintrag auf Ummah Flow
          </h2>

          {/* Provider name display */}
          <div className="mb-6 rounded-xl bg-neutral-50 p-4">
            <p className="mb-1 text-sm text-neutral-500">Empfohlenes Unternehmen:</p>
            <p className="text-lg font-medium text-neutral-900">{tokenInfo?.providerName}</p>
          </div>

          <p className="mb-6 text-neutral-600">
            Ihr Unternehmen wurde von einem Mitglied unserer Community empfohlen. Bitte wählen Sie
            eine der folgenden Optionen:
          </p>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              className="bg-primary-600 hover:bg-primary-700 flex w-full items-center rounded-xl px-6 py-4 text-left font-medium text-white transition-colors"
              onClick={() => handleAction('keep')}
            >
              <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M5 13l4 4L19 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>
              <div>
                <span className="block font-semibold">Gelistet bleiben</span>
                <span className="block text-sm opacity-80">Keine weitere Aktion erforderlich</span>
              </div>
            </button>

            <button
              className="flex w-full items-center rounded-xl border border-neutral-200 bg-neutral-100 px-6 py-4 text-left font-medium text-neutral-900 transition-colors hover:bg-neutral-200"
              onClick={() => handleAction('claim')}
            >
              <div className="bg-primary-100 mr-4 flex h-10 w-10 items-center justify-center rounded-lg">
                <svg
                  className="text-primary-600 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>
              <div>
                <span className="block font-semibold">Eintrag beanspruchen</span>
                <span className="block text-sm text-neutral-600">
                  Registrieren und Profil verwalten
                </span>
              </div>
            </button>

            <button
              className="flex w-full items-center rounded-xl border border-red-200 bg-white px-6 py-4 text-left font-medium text-red-600 transition-colors hover:bg-red-50"
              onClick={() => handleAction('remove')}
            >
              <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>
              <div>
                <span className="block font-semibold">Entfernung beantragen</span>
                <span className="block text-sm text-neutral-600">
                  Eintrag von der Plattform entfernen
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Footer with WhatsApp */}
        {whatsappUrl && (
        <div className="border-t border-neutral-200 bg-neutral-50 px-8 py-6">
          <p className="mb-3 text-sm text-neutral-600">Haben Sie Fragen? Kontaktieren Sie uns:</p>
          <a
            className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
            href={whatsappUrl}
          >
            <span>📱</span>
            <span>WhatsApp öffnen</span>
          </a>
        </div>
        )}
      </div>
    </div>
  );
}
