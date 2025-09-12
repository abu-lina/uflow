export function getProviderImageUrl(
  providerImages: string | string[] | { urls?: string[] } | null,
): string {
  try {
    if (!providerImages) return '/images/placeholder.jpg';

    let imagesData: { urls?: string[] } = {};

    if (typeof providerImages === 'string') {
      imagesData = JSON.parse(providerImages);
    } else if (Array.isArray(providerImages)) {
      imagesData.urls = providerImages;
    } else if (
      typeof providerImages === 'object' &&
      providerImages !== null &&
      'urls' in providerImages &&
      Array.isArray((providerImages as { urls?: unknown }).urls)
    ) {
      imagesData.urls = (providerImages as { urls: string[] }).urls;
    }

    return imagesData.urls?.[0] || '/images/placeholder.jpg';
  } catch {
    return '/images/placeholder.jpg';
  }
}
