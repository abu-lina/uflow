import { showCustomToast } from '@/components/ui/CustomToast';

export interface ToastMessages {
  loginRequired: {
    title: string;
    description: string;
    action?: string;
  };
  loginSuccess: {
    title: string;
    description: string;
  };
  bookmarkSuccess: {
    title: string;
    description: string;
  };
  bookmarkRemoved: {
    title: string;
    description: string;
  };
}

export const getToastMessages = (language: 'en' | 'de'): ToastMessages => {
  if (language === 'de') {
    return {
      loginRequired: {
        title: 'Anmeldung erforderlich',
        description: 'Bitte melden Sie sich an, um Inhalte zu speichern.',
        action: 'Anmelden'
      },
      loginSuccess: {
        title: 'Erfolgreich angemeldet',
        description: 'Willkommen zurück!'
      },
      bookmarkSuccess: {
        title: 'Gespeichert',
        description: 'Inhalt wurde zu Ihren Favoriten hinzugefügt.'
      },
      bookmarkRemoved: {
        title: 'Entfernt',
        description: 'Inhalt wurde aus Ihren Favoriten entfernt.'
      }
    };
  }

  return {
    loginRequired: {
      title: 'Login Required',
      description: 'Please log in to save content.',
      action: 'Log In'
    },
    loginSuccess: {
      title: 'Successfully Logged In',
      description: 'Welcome back!'
    },
    bookmarkSuccess: {
      title: 'Saved',
      description: 'Content has been added to your favorites.'
    },
    bookmarkRemoved: {
      title: 'Removed',
      description: 'Content has been removed from your favorites.'
    }
  };
};

export const showLoginRequiredToast = (language: 'en' | 'de', onAction?: () => void) => {
  const messages = getToastMessages(language);
  
  showCustomToast({
    title: messages.loginRequired.title,
    description: messages.loginRequired.description,
    actionLabel: messages.loginRequired.action,
    onAction: onAction || (() => window.location.href = '/login'),
    type: 'warning'
  });
};

export const showBookmarkSuccessToast = (language: 'en' | 'de') => {
  const messages = getToastMessages(language);
  
  showCustomToast({
    title: messages.bookmarkSuccess.title,
    description: messages.bookmarkSuccess.description,
    type: 'success'
  });
};

export const showBookmarkRemovedToast = (language: 'en' | 'de') => {
  const messages = getToastMessages(language);
  
  showCustomToast({
    title: messages.bookmarkRemoved.title,
    description: messages.bookmarkRemoved.description,
    type: 'info'
  });
};
