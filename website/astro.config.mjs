import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://guige.ai',
  base: '/fin-report',
  integrations: [tailwind()],
  output: 'static',
  markdown: {
    shikiConfig: { theme: 'github-dark' },
  },
});
