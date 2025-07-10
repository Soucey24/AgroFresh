/**
 * Utility function to get the correct image URL
 * Handles both local uploads and external URLs
 */
export function getImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  
  // If it's already a full URL (external image), return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // For local uploads, use the backend URL since images are served from there
  const backendUrl = 'http://localhost:4000';
  return `${backendUrl}${imagePath}`;
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
  return url && (url.startsWith('http') || url.startsWith('/'));
} 