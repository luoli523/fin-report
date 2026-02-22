import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const reports = (await getCollection('reports'))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: '鬼哥的 AI Industry 每日简报',
    description: '每日自动生成的 AI 行业金融分析与投资简报 / Daily AI industry financial analysis and investment briefing',
    site: context.site!,
    items: reports.map((report) => ({
      title: report.data.title,
      pubDate: report.data.date,
      description: report.data.description,
      link: `/fin-report/reports/${report.slug}/`,
    })),
    customData: '<language>zh-cn</language>',
  });
}
