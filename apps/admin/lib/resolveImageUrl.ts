/**
 * Resolves any image identifier (Supabase Storage path, relative local path, external URL, or legacy Base64 string)
 * into a valid browser image source URL.
 * Ensures 100% backward compatibility with legacy bookings.
 */
export function resolveImageUrl(urlOrPath: string | null | undefined): string {
  if (!urlOrPath || typeof urlOrPath !== 'string') {
    return '';
  }

  const trimmed = urlOrPath.trim();
  if (!trimmed) return '';

  // 1. Legacy Base64 or absolute external HTTP(S) URL
  if (trimmed.startsWith('data:image') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // 2. Relative local upload path (served by web API server)
  if (trimmed.startsWith('/uploads/')) {
    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
    return `${webUrl}${trimmed}`;
  }

  // 3. Supabase Storage path (e.g. "bookings/123/start/odometer.jpg")
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kkerjotsahmkwbldjdhf.supabase.co';
  const cleanPath = trimmed.replace(/^\/+/, '');
  return `${supabaseUrl}/storage/v1/object/public/kandy-trip-photos/${cleanPath}`;
}
