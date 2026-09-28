/**
 * 按约定查找某日的信息图：website/public/images/infographics/<date>.(webp|png|jpg|jpeg)
 * 构建时读文件系统，bot 只需上传一张图，不用改 frontmatter。
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve(process.cwd(), 'public/images/infographics');
const EXTS = ['webp', 'png', 'jpg', 'jpeg'];

export function findInfographic(dateStr: string, fromFrontmatter?: string): string | undefined {
  for (const ext of EXTS) {
    if (fs.existsSync(path.join(DIR, `${dateStr}.${ext}`))) return `/fin-report/images/infographics/${dateStr}.${ext}`;
  }
  return fromFrontmatter || undefined;
}
