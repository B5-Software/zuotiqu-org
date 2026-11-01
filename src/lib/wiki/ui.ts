import { createWikiSearch, matchingIds, type WikiIndexEntry } from './search';

export function initWikiIndex(): void {
  const input = document.getElementById('wiki-q') as HTMLInputElement | null;
  const list = document.getElementById('wiki-list');
  const count = document.getElementById('wiki-count');
  const empty = document.getElementById('wiki-empty');
  const random = document.getElementById('wiki-random') as HTMLButtonElement | null;
  const contribute = document.getElementById('wiki-contribute') as HTMLAnchorElement | null;
  if (!input || !list) return;

  const items = [...list.querySelectorAll<HTMLLIElement>('li[data-id]')];
  const total = items.length;
  const baseContribute = contribute?.dataset.baseHref ?? contribute?.href ?? '';
  let search: ReturnType<typeof createWikiSearch> | null = null;

  fetch('/wiki/index.json')
    .then((r) => r.json() as Promise<WikiIndexEntry[]>)
    .then((data) => {
      search = createWikiSearch(data);
      input.dispatchEvent(new Event('input'));
    })
    .catch(() => undefined);

  input.addEventListener('input', () => {
    const q = input.value;
    const ids = search ? matchingIds(search, q) : null;
    let shown = 0;
    for (const li of items) {
      const visible = ids === null || ids.has(li.dataset.id ?? '');
      li.hidden = !visible;
      if (visible) shown++;
    }
    if (count) count.textContent = ids === null ? `共 ${total} 条` : `找到 ${shown} 条`;
    if (empty) empty.hidden = !(ids !== null && shown === 0);
    if (contribute && baseContribute) {
      const title = q.trim() ? `[词条补充] ${q.trim()}` : '[词条补充]';
      contribute.href = `${baseContribute}&title=${encodeURIComponent(title)}`;
    }
  });

  random?.addEventListener('click', () => {
    const visible = items.filter((li) => !li.hidden);
    const pool = visible.length ? visible : items;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const link = pick?.querySelector('a');
    if (link) window.location.href = link.href;
  });
}
