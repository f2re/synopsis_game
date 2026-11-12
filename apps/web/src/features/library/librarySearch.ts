export interface SearchableArticle {
  id: string;
  title: string;
  aliases: readonly string[];
  summary: string;
  paragraphs: readonly string[];
  tip: string;
}

/** Russian spelling and code separators must not make an article disappear. */
export function normalizeLibraryQuery(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g, 'е')
    .replace(/[−–—‐‑-]/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

export function searchLibrary<T extends SearchableArticle>(articles: readonly T[], query: string): T[] {
  const normalized = normalizeLibraryQuery(query);
  if (!normalized) return [...articles];
  const tokens = normalized.split(' ');
  const compact = normalized.replace(/ /g, '');
  return articles.map((article, index) => {
    const title = normalizeLibraryQuery(article.title);
    const aliases = article.aliases.map(normalizeLibraryQuery);
    const exactAlias = aliases.some(alias => alias.replace(/ /g, '') === compact);
    const titleWords = title.split(' ');
    const body = normalizeLibraryQuery([article.summary, ...article.paragraphs, article.tip].join(' '));
    const searchable = [title, ...aliases, body].join(' ');
    // Short abbreviations (T, Td, АТ, ОТ) match whole words, never arbitrary syllables.
    const words = new Set(searchable.split(' '));
    const matches = exactAlias || tokens.every(token => token.length < 3 ? words.has(token) : searchable.includes(token));
    const score = exactAlias ? 100 : title === normalized ? 90 : title.startsWith(normalized) ? 80
      : tokens.every(token => titleWords.some(word => word.startsWith(token))) ? 60 : 10;
    return { article, matches, score, index };
  }).filter(result => result.matches).sort((a, b) => b.score - a.score || a.index - b.index)
    .map(result => result.article);
}

export function parseLibraryFavorites(raw: string | null, validIds: ReadonlySet<string>): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id): id is string => typeof id === 'string' && validIds.has(id)))];
  } catch {
    return [];
  }
}
