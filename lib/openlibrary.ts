/**
 * Utility function for making requests to the Open Library API
 * with proper User-Agent headers as required by their API guidelines.
 */
export async function fetchFromOpenLibrary(url: string | URL): Promise<Response> {
  const headers = new Headers({
    "User-Agent": "koinon.app/1.0 (kuzeyko@outlook.com)"
  });

  return fetch(url.toString(), {
    method: 'GET',
    headers: headers
  });
}
