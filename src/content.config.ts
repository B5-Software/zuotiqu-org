import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { WIKI_CATEGORIES } from './lib/wiki/categories';

const wiki = defineCollection({
  loader: glob({
    base: './content/wiki',
    pattern: ['**/*.md', '!CONTRIBUTING.md'],
  }),
  schema: z.object({
    term: z.string().min(1),
    aliases: z.array(z.string().min(1)).default([]),
    category: z.enum(WIKI_CATEGORIES),
    definition: z.string().min(1),
    origin: z.string().min(1),
    example: z.string().min(1),
    related: z.array(z.string().min(1)).default([]),
    sources: z.array(z.url()).default([]),
    note: z.string().optional(),
  }),
});

export const collections = { wiki };
