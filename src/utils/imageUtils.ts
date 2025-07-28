export function getSoukImageUrl(
  soukImages: string | string[] | { urls?: string[] } | null,
): string {
  try {
    if (!soukImages) return '/images/placeholder.jpg';

    let imagesData: { urls?: string[] } = {};

    if (typeof soukImages === 'string') {
      imagesData = JSON.parse(soukImages);
    } else if (Array.isArray(soukImages)) {
      imagesData.urls = soukImages;
    } else if (
      typeof soukImages === 'object' &&
      soukImages !== null &&
      'urls' in soukImages &&
      Array.isArray((soukImages as { urls?: unknown }).urls)
    ) {
      imagesData.urls = (soukImages as { urls: string[] }).urls;
    }

    return imagesData.urls?.[0] || '/images/placeholder.jpg';
  } catch {
    return '/images/placeholder.jpg';
  }
}
