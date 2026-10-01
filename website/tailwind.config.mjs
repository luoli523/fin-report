/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        paper: '#FBF6EC',
        'paper-2': '#F3EBDA',
        ink: '#1F1B16',
        pencil: '#8A8378',
        rule: '#D9CFBA',
        headband: '#F28C28',
        hoodie: '#2F6BD9',
        up: '#2E8B57',
        down: '#C8372D',
      },
      fontFamily: {
        display: ['"LXGW WenKai Screen"', '"Kaiti SC"', 'STKaiti', 'KaiTi', 'serif'],
        body: ['-apple-system', '"PingFang SC"', '"Hiragino Sans GB"', '"Noto Sans SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
