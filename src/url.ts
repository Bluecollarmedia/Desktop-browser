export type SearchEngineId = 'google' | 'bing' | 'duckduckgo';

export const searchEngines: Record<
  SearchEngineId,
  { name: string; home: string; search: (query: string) => string }
> = {
  google: {
    name: 'Google',
    home: 'https://www.google.com/',
    search: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  },
  bing: {
    name: 'Bing',
    home: 'https://www.bing.com/',
    search: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  },
  duckduckgo: {
    name: 'DuckDuckGo',
    home: 'https://duckduckgo.com/',
    search: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  },
};

export const searchEngineOrder: SearchEngineId[] = ['google', 'bing', 'duckduckgo'];

/** Turns what was typed in the address bar into a web address or a search. */
export function addressToUrl(input: string, engine: SearchEngineId): string | null {
  const text = input.trim();
  if (!text) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text) || /^(about|mailto|tel|sms):/i.test(text)) {
    return text;
  }
  if (!/\s/.test(text)) {
    const looksLikeHost =
      /^localhost(:\d+)?([/?#].*)?$/i.test(text) ||
      /^[^\s/?#]+\.[a-z]{2,}(:\d+)?([/?#].*)?$/i.test(text) ||
      /^\d{1,3}(\.\d{1,3}){3}(:\d+)?([/?#].*)?$/.test(text);
    if (looksLikeHost) return `https://${text}`;
  }
  return searchEngines[engine].search(text);
}

/** "https://www.example.com/page" -> "example.com" */
export function displayHost(url: string): string {
  const match = /^[a-z][a-z0-9+.-]*:\/\/([^/?#:]+)/i.exec(url);
  if (!match) return url;
  return match[1].replace(/^www\./i, '');
}

export function isSecure(url: string): boolean {
  return /^https:\/\//i.test(url);
}
