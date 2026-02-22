import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://luoli523.github.io',
  base: '/fin-report',
  integrations: [tailwind()],
  output: 'static',
  markdown: {
    shikiConfig: { theme: 'github-dark' },
  },
});
