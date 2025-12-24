const fs = require('fs');
const path = require('path');

// Generate static manifest.json
// Uses German shortcuts as default (can be changed later if needed)
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
  // Use German shortcuts as default (most common language)
  shortcuts: [
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
};

// Write to public directory
const publicDir = path.join(process.cwd(), 'public');
const manifestPath = path.join(publicDir, 'manifest.json');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write manifest file
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('✅ Generated static manifest.json at', manifestPath);

