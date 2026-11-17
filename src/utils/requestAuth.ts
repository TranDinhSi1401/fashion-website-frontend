/** Auth endpoints exchange credentials/tokens in their body; other requests may use the signed-in session. */
export function requestAuthorization(url: string, token: string | null): Record<string, string> {
  const path = url.split(/[?#]/, 1)[0];
  const isAuthEndpoint = /(?:^|\/)auth(?:\/|$)/.test(path);
  return !isAuthEndpoint && token ? { Authorization: `Bearer ${token}` } : {};
}
