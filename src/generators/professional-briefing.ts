/**
 * 专业投资简报生成器（v2 — 倒金字塔结构）
 *
 * 渲染顺序（按读者阅读优先级）：
 * 1. 执行摘要 + 行动清单
 * 2. 市场全景（指数 + TOP5 + 宏观三指标 + ETF）
 * 3. 核心持仓追踪（NVDA/MSFT/GOOGL/TSM）
 * 4. 今日主题与催化剂
 * 5. 要闻速递
 * 6. 本周前瞻
 * 7. 智慧资金与情绪
 * 8. 策略与配置
 * 9. 附录（完整行情表 + 利率汇率详情）
 */

import * as fs from 'fs';
import * as path from 'path';
import { AI_INDUSTRY_CATEGORIES, STOCK_INFO, MONITORED_SYMBOLS } from '../config';
import type { ComprehensiveAnalysis } from '../analyzers/types';

interface StockPerformance {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  category: string;
}

interface LLMInsights {
  executiveSummary?: {
    oneLiner: string;
    keyEvent: string;
    portfolioImpact: string;
    actionChecklist?: string[];
    actionItem?: string; // backward compat
    riskAlert?: string;
  };

  coreHoldings?: Array<{
    ticker: string;
    summary: string;
    signal: string;
    keyPoint: string;
  }>;

  todayThemes?: Array<{
    title: string;
    narrative: string;
    stocks?: Array<{
      ticker: string;
      change?: string;
      role: string;
    }>;
    action?: string;
    trackingMetrics?: string[];
  }>;

  newsDigest?: Array<{
    title: string;
    source: string;
    relevance: string;
    importance: string;
  }>;

  weekAhead?: {
    earnings?: Array<{
      ticker: string;
      date: string;
      time?: string;
      focus: string;
      expectedImpact?: string;
    }>;
    macroEvents?: Array<{
      date: string;
      event: string;
      relevance: string;
    }>;
    keyMessage?: string;
  };

  forexAnalysis?: {
    macroSnapshot?: string;
    riskImplication?: string;
    actionNeeded?: {
      needed: boolean;
      suggestion?: string;
    };
  };

  smartMoneyAnalysis?: {
    congressTrading?: {
      summary: string;
      notableTrades: Array<{
        politician: string;
        party: 'D' | 'R' | 'I';
        ticker: string;
        action: string;
        amount: string;
        significance: string;
      }>;
      interpretation: string;
    };
    hedgeFundHoldings?: {
      summary: string;
      topHoldings: string[];
      interpretation: string;
    };
    predictionMarket?: {
      summary: string;
      keyPredictions: Array<{
        question: string;
        probability: string;
        marketImplication: string;
      }>;
      interpretation: string;
    };
    socialSentiment?: {
      summary: string;
      mostBullish: string[];
      mostBearish: string[];
      contrarianSignals: Array<{
        ticker: string;
        signal: string;
        interpretation: string;
      }>;
      interpretation: string;
    };
    synthesis?: {
      overallSignal: 'bullish' | 'bearish' | 'neutral' | 'mixed';
      signalStrength: 'strong' | 'moderate' | 'weak';
      keyTakeaway?: string;
      focusStocks?: Array<{
        ticker: string;
        signals: string[];
        recommendation: string;
      }>;
      actionableInsights: string[];
      riskWarnings: string[];
    };
  };

  strategy?: {
    stance?: string;
    cashPosition?: string;
    topPicks?: Array<{
      ticker: string;
      weight: string;
      logic: string;
      risk: string;
    }>;
    hedgeTools?: string[];
    mainRisks?: Array<{
      risk: string;
      probability: string;
      hedge: string;
    }>;
  };

  // Legacy fields (backward compat for --skip-llm with old insights)
  earningsCalendar?: any;
  indexAnalysis?: any;
  marketMacroNews?: any;
  companyDeepDive?: any;
  industryLinkageAnalysis?: any;
  capitalMovements?: any;
  investmentStrategy?: any;
}

export class ProfessionalBriefingGenerator {
  private analysis: ComprehensiveAnalysis;
  private llmInsights: LLMInsights | null;
  private date: string;
  private stockPerformance: Map<string, StockPerformance> = new Map();

  private isNAOrEmpty(value: any): boolean {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') {
      const trimmed = value.trim().toUpperCase();
      return trimmed === '' || trimmed === 'N/A' || trimmed === '$N/A' || trimmed.includes('代码N/A');
    }
    if (typeof value === 'number') return isNaN(value);
    if (Array.isArray(value)) return value.length === 0 || value.every(v => this.isNAOrEmpty(v));
    return false;
  }

  constructor(analysis: ComprehensiveAnalysis, llmInsights: LLMInsights | null = null) {
    this.analysis = analysis;
    this.llmInsights = llmInsights;
    this.date = new Date().toISOString().split('T')[0];
    this.processStockData();
  }

  private processStockData(): void {
    const marketData = this.analysis.market;
    if (!marketData) return;

    const allQuotes: any[] = [];

    if (marketData.sectors && Array.isArray(marketData.sectors)) {
      for (const sector of marketData.sectors) {
        if (sector.stocks && Array.isArray(sector.stocks)) {
          allQuotes.push(...sector.stocks);
        }
      }
    }
    if (marketData.indices?.details && Array.isArray(marketData.indices.details)) {
      allQuotes.push(...marketData.indices.details);
    }
    if (marketData.topGainers && Array.isArray(marketData.topGainers)) {
      allQuotes.push(...marketData.topGainers);
    }
    if (marketData.topLosers && Array.isArray(marketData.topLosers)) {
      allQuotes.push(...marketData.topLosers);
    }

    for (const quote of allQuotes) {
      if (!quote.symbol) continue;
      if (this.stockPerformance.has(quote.symbol)) continue;

      const info = STOCK_INFO[quote.symbol] || { name: quote.name || quote.symbol, category: '其他' };
      this.stockPerformance.set(quote.symbol, {
        ticker: quote.symbol,
        name: info.name,
        price: quote.price || 0,
        change: quote.change || 0,
        changePercent: quote.changePercent || 0,
        category: info.category,
      });
    }
  }

  // ─────────────────────────────────────────
  // Public entry
  // ─────────────────────────────────────────

  async generate(): Promise<{ markdown: string }> {
    const sections = [
      this.generateHeader(),
      this.generateExecutiveSummary(),
      this.generateMarketPanorama(),
      this.generateCoreHoldings(),
      this.generateTodayThemes(),
      this.generateNewsDigest(),
      this.generateWeekAhead(),
      this.generateSmartMoneySection(),
      this.generateStrategy(),
      this.generateAppendixStockTable(),
      this.generateAppendixForexDetail(),
      this.generateFooter(),
    ];

    const markdown = sections.filter(s => s.trim()).join('\n\n');
    return { markdown };
  }

  // ─────────────────────────────────────────
  // Header / Footer
  // ─────────────────────────────────────────

  private generateHeader(): string {
    return `
╔════════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║           鬼哥的 AI Industry 每日简报与投资建议                        ║
║                                                                        ║
║                         ${this.date}                                   ║
║                                                                        ║
║           基于过去24小时信息 & 美股上一交易日收盘                      ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝
`;
  }

  private generateFooter(): string {
    const now = new Date();
    const timeStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    return `
╔════════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║                        END OF BRIEFING                                 ║
║                                                                        ║
║                    鬼哥的专属 AI 投资简报                              ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝

---

**免责声明**: 本报告仅供鬼哥参考，不构成投资建议。投资有风险，决策需谨慎。
但以鬼哥的智慧，想亏钱都难。

*报告生成时间: ${timeStr}*
`;
  }

  // ─────────────────────────────────────────
  // 1. 执行摘要 + 行动清单
  // ─────────────────────────────────────────

  private generateExecutiveSummary(): string {
    const summary = this.llmInsights?.executiveSummary;
    if (!summary) return this.generateFallbackExecutiveSummary();

    let content = `## 执行摘要\n\n`;

    if (summary.oneLiner) content += `**今日概况**: ${summary.oneLiner}\n\n`;
    if (summary.keyEvent) content += `**核心事件**: ${summary.keyEvent}\n\n`;
    if (summary.portfolioImpact) content += `**组合影响**: ${summary.portfolioImpact}\n\n`;

    if (summary.riskAlert && !this.isNAOrEmpty(summary.riskAlert)) {
      content += `> ⚠️ **风险警示**: ${summary.riskAlert}\n\n`;
    }

    // Action checklist (new format)
    if (summary.actionChecklist && summary.actionChecklist.length > 0) {
      content += `### 今日行动清单\n\n`;
      for (const item of summary.actionChecklist) {
        content += `- [ ] ${item}\n`;
      }
      content += `\n`;
    } else if (summary.actionItem) {
      // Backward compat: old single actionItem
      content += `**今日建议**: ${summary.actionItem}\n\n`;
    }

    content += `---\n`;
    return content;
  }

  private generateFallbackExecutiveSummary(): string {
    let content = `## 执行摘要\n\n`;
    const spx = this.stockPerformance.get('^GSPC');
    const ixic = this.stockPerformance.get('^IXIC');
    const vix = this.stockPerformance.get('^VIX');

    if (spx && ixic) {
      const direction = spx.changePercent > 0.3 ? '上涨' : spx.changePercent < -0.3 ? '下跌' : '窄幅波动';
      content += `**今日概况**: 美股${direction}，S&P 500 ${this.fmtPct(spx.changePercent)}，`;
      content += `纳指 ${this.fmtPct(ixic.changePercent)}`;
      if (vix) content += `，VIX ${vix.price.toFixed(1)}`;
      content += `\n\n`;
    }
    content += `*详细分析请见各章节。*\n\n---\n`;
    return content;
  }

  // ─────────────────────────────────────────
  // 2. 市场全景（紧凑版）
  // ─────────────────────────────────────────

  private generateMarketPanorama(): string {
    let content = `## 市场全景\n\n`;

    if (this.stockPerformance.size === 0) {
      content += `⚠️ 无新收盘数据（可能为非交易日）\n`;
      return content;
    }

    // -- 指数表 --
    content += `### 主要指数\n\n`;
    content += `| 指数 | 点位 | 涨跌幅 | |
|:-----|-----:|-------:|:--:|\n`;

    const indexInfo: Record<string, string> = {
      '^GSPC': 'S&P 500', '^DJI': '道琼斯', '^IXIC': '纳斯达克',
      '^RUT': '罗素2000', '^VIX': 'VIX恐慌',
    };

    for (const symbol of MONITORED_SYMBOLS.indices) {
      const idx = this.stockPerformance.get(symbol);
      if (!idx) continue;
      const isVix = symbol === '^VIX';
      const emoji = isVix
        ? (idx.changePercent > 0 ? '🔴' : idx.changePercent < 0 ? '🟢' : '➡️')
        : (idx.changePercent > 0 ? '🟢' : idx.changePercent < 0 ? '🔴' : '➡️');
      content += `| ${indexInfo[symbol] || idx.name} | ${idx.price.toFixed(2)} | ${this.fmtPct(idx.changePercent)} | ${emoji} |\n`;
    }

    // -- 涨跌速览 --
    const stocks = Array.from(this.stockPerformance.values())
      .filter(s => !s.ticker.startsWith('^') && !['SMH','SOXX','QQQ','VOO','ARKQ','BOTZ','ROBT','GLD'].includes(s.ticker));
    const sorted = [...stocks].sort((a, b) => b.changePercent - a.changePercent);
    const gainers = sorted.filter(s => s.changePercent > 0).slice(0, 5);
    const losers = sorted.filter(s => s.changePercent < 0).slice(-5).reverse();

    if (gainers.length > 0 || losers.length > 0) {
      content += `\n### 涨跌幅 TOP5\n\n`;
      if (gainers.length > 0)
        content += `🟢 **涨**: ${gainers.map(s => `${s.ticker} ${this.fmtPct(s.changePercent)}`).join(' · ')}\n\n`;
      if (losers.length > 0)
        content += `🔴 **跌**: ${losers.map(s => `${s.ticker} ${s.changePercent.toFixed(2)}%`).join(' · ')}\n\n`;
    }

    // -- 宏观三指标 --
    const forexData = this.analysis.forex;
    const dxy = forexData?.dollarIndex;
    const y10 = forexData?.treasuryYields?.yields?.['10Y'];
    const vix = this.stockPerformance.get('^VIX');

    if (dxy || y10 || vix) {
      content += `### 宏观快照\n\n`;
      const parts: string[] = [];
      if (dxy) parts.push(`DXY ${dxy.current.toFixed(2)}(${this.fmtPct(dxy.changePercent)})`);
      if (y10) parts.push(`10Y ${y10.rate.toFixed(2)}%(${this.fmtPct(y10.changePercent)})`);
      if (vix) parts.push(`VIX ${vix.price.toFixed(2)}(${this.fmtPct(vix.changePercent)})`);
      content += parts.join(' · ') + '\n\n';

      // LLM one-liner for forex
      const fxLLM = this.llmInsights?.forexAnalysis;
      if (fxLLM?.riskImplication) {
        content += `**对AI股影响**: ${fxLLM.riskImplication}\n\n`;
      }
      if (fxLLM?.actionNeeded?.needed && fxLLM.actionNeeded.suggestion) {
        content += `**操作建议**: ${fxLLM.actionNeeded.suggestion}\n\n`;
      }
    }

    // -- ETF --
    content += `### ETF 表现\n\n`;
    content += `| 分类 | ETF | 价格 | 涨跌幅 | |\n`;
    content += `|:-----|:----|-----:|-------:|:--:|\n`;

    const etfCat: Record<string, string> = {
      'SMH': '半导体', 'SOXX': '半导体', 'QQQ': '科技', 'VOO': '大盘',
      'ARKQ': '自动化', 'BOTZ': 'AI/机器人', 'ROBT': 'AI/机器人', 'GLD': '黄金',
    };

    for (const symbol of MONITORED_SYMBOLS.etf) {
      const etf = this.stockPerformance.get(symbol);
      if (!etf) continue;
      const emoji = etf.changePercent > 0 ? '🟢' : etf.changePercent < 0 ? '🔴' : '➡️';
      content += `| ${etfCat[symbol] || 'ETF'} | ${symbol} | $${etf.price.toFixed(2)} | ${this.fmtPct(etf.changePercent)} | ${emoji} |\n`;
    }

    return content;
  }

  // ─────────────────────────────────────────
  // 3. 核心持仓追踪
  // ─────────────────────────────────────────

  private generateCoreHoldings(): string {
    let content = `## 核心持仓追踪\n\n`;

    const coreHoldings = this.llmInsights?.coreHoldings;

    if (coreHoldings && coreHoldings.length > 0) {
      content += `| 股票 | 今日状态 | 信号 | 关注重点 |\n`;
      content += `|:----:|:---------|:----:|:---------|\n`;
      for (const h of coreHoldings) {
        if (this.isNAOrEmpty(h.ticker)) continue;
        const signalEmoji = h.signal === '加仓' ? '🟢' :
                           h.signal === '减仓' ? '🔴' :
                           h.signal === '观望' ? '🟡' : '⚪';
        content += `| **${h.ticker}** | ${h.summary} | ${signalEmoji} ${h.signal} | ${h.keyPoint} |\n`;
      }
      content += `\n`;
    } else {
      // Fallback: render from raw data for core 4 tickers
      const coreTickers = ['NVDA', 'MSFT', 'GOOGL', 'TSM'];
      content += `| 股票 | 价格 | 涨跌幅 | |\n`;
      content += `|:----:|-----:|-------:|:--:|\n`;
      for (const ticker of coreTickers) {
        const stock = this.stockPerformance.get(ticker);
        if (stock) {
          const emoji = stock.changePercent > 0 ? '🟢' : stock.changePercent < 0 ? '🔴' : '➡️';
          content += `| **${ticker}** | $${stock.price.toFixed(2)} | ${this.fmtPct(stock.changePercent)} | ${emoji} |\n`;
        }
      }
      content += `\n`;
    }

    return content;
  }

  // ─────────────────────────────────────────
  // 4. 今日主题与催化剂
  // ─────────────────────────────────────────

  private generateTodayThemes(): string {
    const themes = this.llmInsights?.todayThemes;
    if (!themes || themes.length === 0) return this.generateFallbackThemes();

    let content = `## 今日主题与催化剂\n\n`;

    themes.forEach((theme, i) => {
      content += `### ${i + 1}. ${theme.title}\n\n`;
      content += `${theme.narrative}\n\n`;

      if (theme.stocks && theme.stocks.length > 0) {
        content += `**涉及标的**:\n`;
        for (const s of theme.stocks) {
          const changeStr = s.change ? ` (${s.change})` : '';
          content += `- **${s.ticker}**${changeStr}：${s.role}\n`;
        }
        content += `\n`;
      }

      if (theme.action) content += `**操作建议**: ${theme.action}\n\n`;

      if (theme.trackingMetrics && theme.trackingMetrics.length > 0) {
        content += `**跟踪指标**: ${theme.trackingMetrics.join(' · ')}\n\n`;
      }

      content += `---\n\n`;
    });

    return content;
  }

  private generateFallbackThemes(): string {
    // Use old-format companyDeepDive + industryLinkageAnalysis if available
    const deepDive = this.llmInsights?.companyDeepDive;
    const linkage = this.llmInsights?.industryLinkageAnalysis;

    if (!deepDive && !linkage) return '';

    let content = `## 今日主题与催化剂\n\n`;

    if (deepDive && deepDive.length > 0) {
      for (const company of deepDive) {
        content += `### ${company.company}（${company.ticker}）\n\n`;
        content += `**事件**: ${company.event}\n\n`;
        content += `**逻辑**: ${company.investmentLogic}\n\n`;
        if (company.catalysts && company.catalysts.length > 0)
          content += `**催化剂**: ${company.catalysts.join('、')}\n\n`;
        if (company.risks && company.risks.length > 0)
          content += `**风险**: ${company.risks.join('、')}\n\n`;
        content += `---\n\n`;
      }
    }

    return content;
  }

  // ─────────────────────────────────────────
  // 5. 要闻速递
  // ─────────────────────────────────────────

  private generateNewsDigest(): string {
    const newsDigest = this.llmInsights?.newsDigest;
    const legacyNews = this.llmInsights?.marketMacroNews;

    // Use new format if available
    if (newsDigest && newsDigest.length > 0) {
      let content = `## 要闻速递\n\n`;
      for (const news of newsDigest) {
        const icon = news.importance === 'high' ? '🔴' : news.importance === 'medium' ? '🟡' : '🟢';
        content += `- ${icon} **${news.title}**（${news.source}）— ${news.relevance}\n`;
      }
      content += `\n`;
      return content;
    }

    // Backward compat: old marketMacroNews format
    if (legacyNews?.keyNews && legacyNews.keyNews.length > 0) {
      let content = `## 要闻速递\n\n`;
      for (const news of legacyNews.keyNews) {
        const icon = news.importance === 'high' ? '🔴' : news.importance === 'medium' ? '🟡' : '🟢';
        content += `- ${icon} **${news.title}** — ${news.fact}\n`;
      }
      content += `\n`;
      return content;
    }

    return '';
  }

  // ─────────────────────────────────────────
  // 6. 本周前瞻
  // ─────────────────────────────────────────

  private generateWeekAhead(): string {
    const wa = this.llmInsights?.weekAhead;
    const legacyEC = this.llmInsights?.earningsCalendar;

    const hasEarnings = wa?.earnings?.length || legacyEC?.thisWeek?.length || legacyEC?.nextWeek?.length;
    const hasMacro = wa?.macroEvents?.length;

    if (!hasEarnings && !hasMacro) return '';

    let content = `## 本周前瞻\n\n`;

    // Earnings
    const earnings = wa?.earnings || [
      ...(legacyEC?.thisWeek || []).map((e: any) => ({ ...e, focus: e.keyMetrics, expectedImpact: '中' })),
      ...(legacyEC?.nextWeek || []).map((e: any) => ({ ...e, focus: e.keyMetrics, expectedImpact: '中' })),
    ];

    if (earnings.length > 0) {
      content += `### 重要财报\n\n`;
      content += `| 日期 | 股票 | 时间 | 关注重点 | 预期影响 |\n`;
      content += `|:-----|:----:|:----:|:---------|:--------:|\n`;
      for (const e of earnings) {
        if (this.isNAOrEmpty(e.ticker)) continue;
        const impact = e.expectedImpact || '-';
        const impactEmoji = impact === '高' ? '🔴' : impact === '中' ? '🟡' : '🟢';
        content += `| ${e.date || '-'} | **${e.ticker}** | ${e.time || '-'} | ${e.focus || '-'} | ${impactEmoji} ${impact} |\n`;
      }
      content += `\n`;
    }

    // Macro events
    if (wa?.macroEvents && wa.macroEvents.length > 0) {
      content += `### 宏观事件\n\n`;
      content += `| 日期 | 事件 | AI投资关联 |\n`;
      content += `|:-----|:-----|:-----------|\n`;
      for (const ev of wa.macroEvents) {
        content += `| ${ev.date} | ${ev.event} | ${ev.relevance} |\n`;
      }
      content += `\n`;
    }

    // Key message
    const keyMsg = wa?.keyMessage || legacyEC?.impact;
    if (keyMsg && !this.isNAOrEmpty(keyMsg)) {
      content += `**要点**: ${keyMsg}\n\n`;
    }

    return content;
  }

  // ─────────────────────────────────────────
  // 7. 智慧资金与情绪
  // ─────────────────────────────────────────

  private generateSmartMoneySection(): string {
    const smartMoney = this.analysis.smartMoney;
    const llmSM = this.llmInsights?.smartMoneyAnalysis;

    if (!smartMoney && !llmSM) return '';

    let content = `## 智慧资金与情绪信号\n\n`;

    // Congress trading
    content += `### 国会议员交易\n\n`;
    if (llmSM?.congressTrading) {
      const c = llmSM.congressTrading;
      content += `${c.summary}\n\n`;
      if (c.notableTrades && c.notableTrades.length > 0) {
        const valid = c.notableTrades.filter(t => !this.isNAOrEmpty(t.politician) && !this.isNAOrEmpty(t.ticker));
        if (valid.length > 0) {
          content += `| 议员 | 股票 | 操作 | 金额 | 意义 |\n`;
          content += `|:-----|:----:|:----:|:----:|:-----|\n`;
          for (const t of valid.slice(0, 5)) {
            content += `| ${t.politician} (${t.party}) | ${t.ticker} | ${t.action} | ${t.amount || '-'} | ${t.significance || '-'} |\n`;
          }
          content += `\n`;
        }
      }
      if (c.interpretation) content += `**解读**: ${c.interpretation}\n\n`;
    } else {
      content += `*当日无国会交易数据*\n\n`;
    }

    // Hedge fund
    content += `### 对冲基金持仓\n\n`;
    if (llmSM?.hedgeFundHoldings) {
      const h = llmSM.hedgeFundHoldings;
      content += `${h.summary}\n\n`;
      if (h.topHoldings && h.topHoldings.length > 0)
        content += `**机构共识**: ${h.topHoldings.join(' · ')}\n\n`;
      if (h.interpretation) content += `**解读**: ${h.interpretation}\n\n`;
    } else if (smartMoney?.hedgeFund) {
      const hf = smartMoney.hedgeFund;
      content += `追踪 ${hf.totalFundsTracked} 家基金，整体偏${hf.aggregatedSentiment === 'bullish' ? '多' : hf.aggregatedSentiment === 'bearish' ? '空' : '中性'}\n\n`;
      if (hf.topHoldings && hf.topHoldings.length > 0) {
        content += `**共识持仓**: ${hf.topHoldings.slice(0, 5).map(h => `${h.ticker}(${h.fundsHolding}家)`).join(' · ')}\n\n`;
      }
    } else {
      content += `*暂无数据*\n\n`;
    }

    // Prediction market
    content += `### 预测市场\n\n`;
    if (llmSM?.predictionMarket) {
      const p = llmSM.predictionMarket;
      content += `${p.summary}\n\n`;
      if (p.keyPredictions && p.keyPredictions.length > 0) {
        content += `| 预测 | 概率 | 市场含义 |\n`;
        content += `|:-----|:----:|:---------|\n`;
        for (const pred of p.keyPredictions.slice(0, 5)) {
          content += `| ${pred.question} | ${pred.probability} | ${pred.marketImplication} |\n`;
        }
        content += `\n`;
      }
      if (p.interpretation) content += `**解读**: ${p.interpretation}\n\n`;
    } else if (smartMoney?.predictionMarket) {
      const pm = smartMoney.predictionMarket;
      if (pm.keyPredictions && pm.keyPredictions.length > 0) {
        for (const p of pm.keyPredictions.slice(0, 3)) {
          content += `- ${p.question}: ${(p.probability * 100).toFixed(0)}%\n`;
        }
        content += `\n`;
      }
    } else {
      content += `*暂无数据*\n\n`;
    }

    // Social sentiment
    content += `### 社交情绪\n\n`;
    if (llmSM?.socialSentiment) {
      const s = llmSM.socialSentiment;
      content += `${s.summary}\n\n`;
      if (s.mostBullish?.length > 0) content += `**看多**: ${s.mostBullish.join(' · ')}\n\n`;
      if (s.mostBearish?.length > 0) content += `**看空**: ${s.mostBearish.join(' · ')}\n\n`;
      if (s.contrarianSignals && s.contrarianSignals.length > 0) {
        content += `**逆向信号**:\n`;
        for (const sig of s.contrarianSignals) {
          const emoji = sig.signal.includes('看涨') ? '⚠️🟢' : '⚠️🔴';
          content += `- ${emoji} **${sig.ticker}**: ${sig.signal} — ${sig.interpretation}\n`;
        }
        content += `\n`;
      }
      if (s.interpretation) content += `**解读**: ${s.interpretation}\n\n`;
    } else if (smartMoney?.socialSentiment) {
      const ss = smartMoney.socialSentiment;
      content += `整体情绪${ss.overallSentiment === 'bullish' ? '偏多' : ss.overallSentiment === 'bearish' ? '偏空' : '中性'}（得分 ${ss.sentimentScore?.toFixed(0) || '-'}）\n\n`;
    } else {
      content += `*暂无数据*\n\n`;
    }

    // Synthesis
    if (llmSM?.synthesis) {
      const syn = llmSM.synthesis;
      const signalText = syn.overallSignal === 'bullish' ? '偏多' :
                        syn.overallSignal === 'bearish' ? '偏空' :
                        syn.overallSignal === 'mixed' ? '分化' : '中性';
      const strengthText = syn.signalStrength === 'strong' ? '强' :
                          syn.signalStrength === 'moderate' ? '中等' : '弱';

      content += `### 综合研判\n\n`;
      content += `**信号**: ${signalText}（${strengthText}）`;
      if (syn.keyTakeaway) content += ` — ${syn.keyTakeaway}`;
      content += `\n\n`;

      if (syn.actionableInsights && syn.actionableInsights.length > 0) {
        for (const insight of syn.actionableInsights) {
          content += `- ${insight}\n`;
        }
        content += `\n`;
      }
      if (syn.riskWarnings && syn.riskWarnings.length > 0) {
        for (const warning of syn.riskWarnings) {
          content += `- ⚠️ ${warning}\n`;
        }
        content += `\n`;
      }
    }

    return content;
  }

  // ─────────────────────────────────────────
  // 8. 策略与配置
  // ─────────────────────────────────────────

  private generateStrategy(): string {
    const strat = this.llmInsights?.strategy;
    const legacy = this.llmInsights?.investmentStrategy;

    let content = `## 策略与配置\n\n`;

    if (strat) {
      // New compact format
      const stanceText = strat.stance === 'defensive' ? '防御' :
                        strat.stance === 'aggressive' ? '进取' : '中性';
      content += `**立场**: ${stanceText}`;
      if (strat.cashPosition) content += ` · **现金**: ${strat.cashPosition}`;
      content += `\n\n`;

      // Top picks
      if (strat.topPicks && strat.topPicks.length > 0) {
        content += `### 精选标的\n\n`;
        content += `| 股票 | 仓位 | 逻辑 | 风险 |\n`;
        content += `|:----:|:----:|:-----|:-----|\n`;
        for (const pick of strat.topPicks) {
          if (this.isNAOrEmpty(pick.ticker)) continue;
          content += `| **${pick.ticker}** | ${pick.weight} | ${pick.logic} | ${pick.risk} |\n`;
        }
        content += `\n`;
      }

      // Hedge tools
      if (strat.hedgeTools && strat.hedgeTools.length > 0) {
        content += `**对冲工具**: ${strat.hedgeTools.join(' · ')}\n\n`;
      }

      // Risks
      if (strat.mainRisks && strat.mainRisks.length > 0) {
        content += `### 风险控制\n\n`;
        content += `| 风险 | 概率 | 对冲 |\n`;
        content += `|:-----|:----:|:-----|\n`;
        for (const r of strat.mainRisks) {
          const probText = r.probability === 'high' ? '高' : r.probability === 'medium' ? '中' : '低';
          content += `| ${r.risk} | ${probText} | ${r.hedge} |\n`;
        }
        content += `\n`;
      }
    } else if (legacy) {
      // Backward compat: render old investmentStrategy
      content += this.renderLegacyStrategy(legacy);
    } else {
      content += `*LLM 未生成策略建议，请参考各主题中的操作建议。*\n`;
    }

    return content;
  }

  private renderLegacyStrategy(strategy: any): string {
    let content = '';

    if (strategy.overallJudgment) {
      const j = strategy.overallJudgment;
      const items: string[] = [];
      if (j.valuation) items.push(`估值: ${j.valuation}`);
      if (j.rates) items.push(`利率: ${j.rates}`);
      if (j.policy) items.push(`政策: ${j.policy}`);
      if (items.length > 0) content += items.join(' · ') + '\n\n';
    }

    if (strategy.shortTerm) {
      const s = strategy.shortTerm;
      const stanceText = s.stance === 'defensive' ? '防御' : s.stance === 'aggressive' ? '进取' : '中性';
      content += `**短期立场**: ${stanceText}，现金 ${s.cashPosition}\n\n`;
      if (s.actionItems?.length > 0) {
        for (const item of s.actionItems) content += `- ${item}\n`;
        content += `\n`;
      }
    }

    if (strategy.portfolioSuggestion?.stocks?.length > 0) {
      content += `**标的配置**:\n\n`;
      content += `| 股票 | 仓位 | 逻辑 |\n`;
      content += `|:----:|:----:|:-----|\n`;
      for (const s of strategy.portfolioSuggestion.stocks) {
        content += `| ${s.ticker} | ${s.weight} | ${s.logic} |\n`;
      }
      content += `\n`;
    }

    if (strategy.riskControl?.mainRisks?.length > 0) {
      content += `**风险**:\n`;
      for (const r of strategy.riskControl.mainRisks) {
        content += `- ${r.risk}（${r.probability}）→ ${r.hedge}\n`;
      }
      content += `\n`;
    }

    return content;
  }

  // ─────────────────────────────────────────
  // 9. 附录
  // ─────────────────────────────────────────

  private generateAppendixStockTable(): string {
    if (this.stockPerformance.size === 0) return '';

    let content = `## 附录A：AI 产业链完整行情\n\n`;
    content += `| 分类 | 公司 | 代号 | 股价 | 涨跌幅 | |\n`;
    content += `|:-----|:-----|:----:|-----:|-------:|:--:|\n`;

    for (const [category, symbols] of Object.entries(AI_INDUSTRY_CATEGORIES)) {
      for (const symbol of symbols) {
        const stock = this.stockPerformance.get(symbol);
        if (!stock) continue;
        const emoji = stock.changePercent > 0 ? '🟢' : stock.changePercent < 0 ? '🔴' : '➡️';
        content += `| ${category} | ${stock.name} | ${stock.ticker} | $${stock.price.toFixed(2)} | ${this.fmtPct(stock.changePercent)} | ${emoji} |\n`;
      }
    }

    content += `\n**未上市重要主体**：OpenAI / Anthropic / xAI / Perplexity\n`;

    return content;
  }

  private generateAppendixForexDetail(): string {
    const forexData = this.analysis.forex;
    if (!forexData) return '';

    const ty = forexData.treasuryYields;
    const cp = forexData.currencyPairs;
    if (!ty && !cp) return '';

    let content = `## 附录B：利率与汇率详情\n\n`;

    // Yield curve
    if (ty?.yields) {
      content += `**美债收益率**:\n\n`;
      content += `| 期限 | 收益率 | 涨跌幅 | 趋势 |\n`;
      content += `|:-----|-------:|-------:|:----:|\n`;
      for (const period of ['3M', '2Y', '5Y', '10Y', '30Y']) {
        const y = ty.yields[period];
        if (!y) continue;
        const trend = y.trend === 'rising' ? '⬆️' : y.trend === 'falling' ? '⬇️' : '➡️';
        content += `| ${period} | ${y.rate.toFixed(2)}% | ${this.fmtPct(y.changePercent)} | ${trend} |\n`;
      }
      content += `\n`;

      if (ty.yieldCurve) {
        const shape = ty.yieldCurve.shape === 'inverted' ? '⚠️ 倒挂' :
                     ty.yieldCurve.shape === 'flat' ? '➡️ 平坦' :
                     ty.yieldCurve.shape === 'steep' ? '📈 陡峭' :
                     ty.yieldCurve.shape === 'normal' ? '✅ 正常' : ty.yieldCurve.shape;
        content += `**收益率曲线**: ${shape}，2Y-10Y利差 ${ty.yieldCurve.spread2Y10Y >= 0 ? '+' : ''}${ty.yieldCurve.spread2Y10Y.toFixed(2)}%\n\n`;
      }
    }

    // Currency pairs
    if (cp && Object.keys(cp).length > 0) {
      content += `**主要货币对**:\n\n`;
      content += `| 货币对 | 汇率 | 涨跌幅 | 美元动向 |\n`;
      content += `|:-------|-----:|-------:|:--------:|\n`;
      for (const pair of ['USDCHF', 'USDSGD', 'USDJPY', 'USDCNH']) {
        const p = cp[pair];
        if (!p) continue;
        const trend = p.trend === 'usd_strengthening' ? '走强' : p.trend === 'usd_weakening' ? '走弱' : '持稳';
        content += `| ${pair} | ${p.rate.toFixed(4)} | ${this.fmtPct(p.changePercent)} | ${trend} |\n`;
      }
      content += `\n`;
    }

    return content;
  }

  // ─────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────

  private fmtPct(v: number): string {
    return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
  }
}
