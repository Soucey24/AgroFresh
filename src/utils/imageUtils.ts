/**
 * Utility function to get the correct image URL
 * Handles both local uploads and external URLs
 */
export function getImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;

  const normalizedPath = imagePath.trim();
  if (!normalizedPath) return null;

  // If it's already a full URL (external image), return as is
  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  const backendBase = (import.meta.env.VITE_API_URL || 'https://agrofresh-2uom.onrender.com').replace(/\/+$/, '');
  const safePath = normalizedPath.replace(/\\/g, '/').replace(/^\/+/, '');

  if (!safePath) return null;

  // Handle upload URLs saved without a leading slash or with a relative path
  return `${backendBase}/${safePath}`;
}

/**
 * Utility function to get image URL with fallback
 */
export function getImageUrlWithFallback(imagePath: string | null | undefined, fallbackUrl?: string): string {
  const imageUrl = getImageUrl(imagePath);
  if (imageUrl) return imageUrl;
  return fallbackUrl || '';
}

/**
 * Utility function to check if an image URL is valid
 */
export function isValidImageUrl(url: string): boolean {
  return !!url && (url.startsWith('http') || url.startsWith('/'));
} 