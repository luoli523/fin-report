/**
 * 从 v2 简报正文开头解析 Regime 行、一句话与相比昨日。
 * 旧格式简报没有这些行，返回 undefined 字段，调用方回退到 frontmatter。
 */
export interface Regime {
  name?: string;
  growth?: string;
  inflation?: string;
  liquidity?: string;
  oneLiner?: string;
  delta?: string;
}

export function parseRegime(body: string): Regime {
  const r: Regime = {};
  const regime = body.match(/^>\s*\*\*Regime\*\*:\s*(.+)$/m);
  if (regime) {
    const parts = regime[1].split('·').map(s => s.trim());
    r.name = parts[0];
    for (const p of parts.slice(1)) {
      const m = p.match(/^(增长|通胀|流动性)\s*(.+)$/);
      if (!m) continue;
      if (m[1] === '增长') r.growth = m[2];
      else if (m[1] === '通胀') r.inflation = m[2];
      else r.liquidity = m[2];
    }
  }
  r.oneLiner = body.match(/^\*\*一句话\*\*:\s*(.+)$/m)?.[1]?.trim();
  r.delta = body.match(/^\*\*相比昨日\*\*:\s*(.+)$/m)?.[1]?.trim();
  return r;
}

/** 状态词的视觉强度：收紧 / 再加速 / 强 为"热"，温和 / 弱 为"淡"。 */
export function stateTone(v?: string): 'hot' | 'dim' | 'plain' {
  if (!v) return 'plain';
  if (/收紧|再加速|^强$|过热/.test(v)) return 'hot';
  if (/温和|^弱$|放缓|宽松/.test(v)) return 'dim';
  return 'plain';
}

const CN_MONTH = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const CN_DIGIT = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const CN_WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

/** 2026-10-01 → { year: '二〇二六', month: '十月', day: '01', weekday: '星期四' } */
export function cnDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return {
    year: String(y).split('').map(c => CN_DIGIT[Number(c)]).join(''),
    month: `${CN_MONTH[m - 1]}月`,
    day: String(d).padStart(2, '0'),
    weekday: `星期${CN_WEEKDAY[dt.getUTCDay()]}`,
  };
}
