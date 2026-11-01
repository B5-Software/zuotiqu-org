import MiniSearch from 'minisearch';

export interface WikiIndexEntry {
  id: string;
  term: string;
  aliases: string[];
  category: string;
  definition: string;
}

const CJK_RUN = /[\u3400-\u9fff]+|[^\u3400-\u9fff]+/g;
const CJK_CHAR = /^[\u3400-\u9fff]/;

function splitWords(text: string): string[][] {
  return text
    .toLowerCase()
    .split(/[\s\p{P}\p{S}]+/u)
    .filter(Boolean)
    .map((part) => part.match(CJK_RUN) ?? []);
}

function ngrams(run: string): string[] {
  const chars = [...run];
  const out: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    out.push(chars[i]);
    if (i + 1 < chars.length) out.push(chars[i] + chars[i + 1]);
  }
  return out;
}

export function tokenize(text: string): string[] {
  const out = new Set<string>();
  for (const runs of splitWords(text)) {
    for (const run of runs) {
      if (!CJK_CHAR.test(run)) {
        out.add(run);
        continue;
      }
      out.add(run);
      for (const g of ngrams(run)) out.add(g);
    }
  }
  return [...out];
}

export function tokenizeQuery(text: string): string[] {
  const out = new Set<string>();
  for (const runs of splitWords(text)) {
    for (const run of runs) {
      if (!CJK_CHAR.test(run)) {
        out.add(run);
        continue;
      }
      for (const g of ngrams(run)) out.add(g);
    }
  }
  return [...out];
}

interface IndexedDoc {
  id: string;
  term: string;
  aliasText: string;
  category: string;
  definition: string;
}

export function createWikiSearch(entries: WikiIndexEntry[]): MiniSearch<IndexedDoc> {
  const search = new MiniSearch<IndexedDoc>({
    idField: 'id',
    fields: ['term', 'aliasText', 'definition', 'category'],
    storeFields: ['id', 'term', 'category'],
    tokenize,
    searchOptions: {
      prefix: true,
      combineWith: 'AND',
      boost: { term: 3, aliasText: 2 },
      tokenize: tokenizeQuery,
    },
  });
  search.addAll(
    entries.map((e) => ({
      id: e.id,
      term: e.term,
      aliasText: e.aliases.join(' '),
      category: e.category,
      definition: e.definition,
    })),
  );
  return search;
}

export function matchingIds(search: MiniSearch<IndexedDoc>, query: string): Set<string> | null {
  if (!query.trim()) return null;
  return new Set(search.search(query).map((r) => String(r.id)));
}
