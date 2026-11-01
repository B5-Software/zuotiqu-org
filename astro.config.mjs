// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://做题区.org',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
});
