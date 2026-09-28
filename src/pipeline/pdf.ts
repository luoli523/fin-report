/**
 * Markdown → PDF（marked + puppeteer）
 */

import * as fs from 'fs';
import { marked } from 'marked';

const CSS = `
  body { font-family: -apple-system, "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif; font-size: 12px; line-height: 1.55; color: #1a1a1a; margin: 0; }
  h1 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 6px; }
  h2 { font-size: 15px; margin-top: 22px; border-left: 4px solid #2563eb; padding-left: 8px; }
  h3 { font-size: 13px; margin-top: 16px; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 11px; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #f3f4f6; }
  blockquote { border-left: 3px solid #999; margin: 8px 0; padding: 4px 10px; color: #444; background: #fafafa; }
  code { font-size: 11px; }
  li { margin: 2px 0; }
`;

export async function markdownToPdf(markdown: string, pdfPath: string, title: string): Promise<boolean> {
  let puppeteer: any;
  try {
    puppeteer = await import('puppeteer');
  } catch {
    console.warn('[pdf] puppeteer 不可用，跳过 PDF 生成');
    return false;
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${CSS}</style></head><body>${await marked.parse(markdown)}</body></html>`;
  let browser: any;
  try {
    // 新版 headless 在 macOS 上会把文字渲染成空 Type3 字形，用 shell 模式
    browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluateHandle('document.fonts.ready');
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' } });
    console.log(`[pdf] ${pdfPath} (${(fs.statSync(pdfPath).size / 1024).toFixed(0)} KB)`);
    return true;
  } catch (e) {
    console.warn(`[pdf] 生成失败: ${(e as Error).message}`);
    return false;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
