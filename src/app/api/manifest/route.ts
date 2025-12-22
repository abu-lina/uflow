import { NextRequest, NextResponse } from 'next/server';

// Language detection from Accept-Language header and cookies
function detectLanguageFromRequest(request: NextRequest): 'de' | 'en' | 'ar' | 'tr' {
  // Priority 1: Check for user's language preference cookie (if set)
  // This respects user's explicit choice in the app
  const languageCookie = request.cookies.get('preferred-language')?.value;
  if (languageCookie && ['de', 'en', 'ar', 'tr'].includes(languageCookie)) {
    return languageCookie as 'de' | 'en' | 'ar' | 'tr';
  }

  // Priority 2: Check Accept-Language header (device/browser language)
  const acceptLanguage = request.headers.get('accept-language');
  
  if (!acceptLanguage) {
    return 'de'; // Default fallback
  }

  // Parse Accept-Language header (e.g., "en-US,en;q=0.9,de;q=0.8")
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code, qValue] = lang.trim().split(';q=');
      return {
        code: code.toLowerCase().split('-')[0], // Extract base language (en, de, etc.)
        quality: qValue ? parseFloat(qValue) : 1.0,
      };
    })
    .sort((a, b) => b.quality - a.quality); // Sort by quality

  // Check for supported languages in order of preference
  for (const lang of languages) {
    if (lang.code === 'en') return 'en';
    if (lang.code === 'de') return 'de';
    if (lang.code === 'ar') return 'ar';
    if (lang.code === 'tr') return 'tr';
  }

  return 'de'; // Default fallback
}

// Shortcuts translations
const shortcuts = {
  de: [
    {
      name: 'Anbieter durchsuchen',
      short_name: 'Durchsuchen',
      description: 'Alle Anbieter anzeigen',
      url: '/providers',
      icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
    },
    {
      name: 'Anbieter erstellen',
      short_name: 'Erstellen',
      description: 'Neuen Anbieter hinzufügen',
      url: '/create-quick',
      icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
    },
    {
      name: 'Gespeichert',
      short_name: 'Gespeichert',
      description: 'Gespeicherte Anbieter',
      url: '/saved',
      icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
    },
    {
      name: 'Dashboard',
      short_name: 'Dashboard',
      description: 'Mein Dashboard',
      url: '/dashboard',
      icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
    },
  ],
  en: [
    {
      name: 'Browse Providers',
      short_name: 'Browse',
      description: 'View all providers',
      url: '/providers',
      icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
    },
    {
      name: 'Create Provider',
      short_name: 'Create',
      description: 'Add new provider',
      url: '/create-quick',
      icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
    },
    {
      name: 'Saved',
      short_name: 'Saved',
      description: 'Saved providers',
      url: '/saved',
      icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
    },
    {
      name: 'Dashboard',
      short_name: 'Dashboard',
      description: 'My dashboard',
      url: '/dashboard',
      icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
    },
  ],
  ar: [
    {
      name: 'تصفح المزودين',
      short_name: 'تصفح',
      description: 'عرض جميع المزودين',
      url: '/providers',
      icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
    },
    {
      name: 'إنشاء مزود',
      short_name: 'إنشاء',
      description: 'إضافة مزود جديد',
      url: '/create-quick',
      icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
    },
    {
      name: 'المحفوظات',
      short_name: 'محفوظ',
      description: 'المزودون المحفوظون',
      url: '/saved',
      icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
    },
    {
      name: 'لوحة التحكم',
      short_name: 'لوحة',
      description: 'لوحة التحكم الخاصة بي',
      url: '/dashboard',
      icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
    },
  ],
  tr: [
    {
      name: 'Sağlayıcıları Görüntüle',
      short_name: 'Görüntüle',
      description: 'Tüm sağlayıcıları göster',
      url: '/providers',
      icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
    },
    {
      name: 'Sağlayıcı Oluştur',
      short_name: 'Oluştur',
      description: 'Yeni sağlayıcı ekle',
      url: '/create-quick',
      icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
    },
    {
      name: 'Kaydedilenler',
      short_name: 'Kaydedilen',
      description: 'Kaydedilen sağlayıcılar',
      url: '/saved',
      icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
    },
    {
      name: 'Kontrol Paneli',
      short_name: 'Panel',
      description: 'Kontrol panelim',
      url: '/dashboard',
      icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
    },
  ],
};

export async function GET(request: NextRequest) {
  // Detect language from cookies (user preference) or Accept-Language header
  const language = detectLanguageFromRequest(request);

  // Build manifest with language-specific shortcuts
  const manifest = {
    name: 'UFLOW',
    short_name: 'UFLOW',
    description: 'A platform for the Muslim community',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f5f5',
    theme_color: '#589D96',
    orientation: 'portrait',
    scope: '/',
    prefer_related_applications: false,
    categories: ['shopping', 'business', 'social'],
    icons: [
      {
        src: '/icons/icon-180x180.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icons/icon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/desktop.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide',
      },
      {
        src: '/screenshots/mobile.png',
        sizes: '375x812',
        type: 'image/png',
        form_factor: 'narrow',
      },
    ],
    shortcuts: shortcuts[language],
  };

  // Generate ETag for cache validation (based on language and manifest content)
  const manifestString = JSON.stringify(manifest);
  const etag = `"${Buffer.from(manifestString).toString('base64').slice(0, 27)}"`;

  // Check if client has a cached version (304 Not Modified)
  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        'ETag': etag,
        'Cache-Control': 'public, max-age=3600, must-revalidate',
      },
    });
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600, must-revalidate', // Cache with revalidation
      'ETag': etag, // Enable conditional requests
      'Vary': 'Accept-Language', // CDN caches 4 versions (one per language) for better efficiency
    },
  });
}

