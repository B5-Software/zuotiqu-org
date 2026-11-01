import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const entries = await getCollection('wiki');
  const data = entries.map((e) => ({
    id: e.id,
    term: e.data.term,
    aliases: e.data.aliases,
    category: e.data.category,
    definition: e.data.definition,
  }));
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
