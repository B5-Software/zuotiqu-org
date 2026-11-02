// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

const siteUrl = 'https://xn--cyqx3ed87g.org';
const excludedSitemapPaths = new Set(['/404.html', '/wiki/index.json']);

export default defineConfig({
  site: siteUrl,
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      // Astro routes are discovered automatically; include the standalone public app.
      customPages: [`${siteUrl}/ztqi/`],
      // Keep error pages and machine-readable endpoints out of the search index.
      filter: (page) => !excludedSitemapPaths.has(new URL(page).pathname),
    }),
  ],
});
