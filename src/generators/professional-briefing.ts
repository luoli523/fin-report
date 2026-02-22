/**
 * 专业投资简报生成器
 * 
 * 按照用户要求的6大部分格式生成：
 * 一、核心股票池表现
 * 二、市场宏观动态与要闻
 * 三、关键公司深度动态
 * 四、行业影响与关联分析
 * 五、产业链资本动向与资产交易
 * 六、投资建议与策略展望
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
    actionItem: string;
    riskAlert?: string;
  };
  indexAnalysis?: {
    marketOverview: string;
    indexDetails: Array<{
      symbol: string;
      name: string;
      dataAnalysis: string;
      newsAnalysis: string;
      underlyingLogic: string;
      keyDrivers: string[];
    }>;
    crossIndexAnalysis: string;
  };
  marketMacroNews?: {
    summary: string;
    keyNews: Array<{
      title: string;
      fact: string;
      impact: string;
      category: string;
      importance: string;
    }>;
  };
  companyDeepDive?: Array<{
    ticker: string;
    company: string;
    event: string;
    investmentLogic: string;
    priceTarget?: {
      current: number;
      target?: number;
      stopLoss?: number;
      timeframe: string;
    };
    catalysts?: string[];
    risks?: string[];
  }>;
  industryLinkageAnalysis?: {
    gpuSupplyChain?: {
      event: string;
      mechanism: string;
      beneficiaries: string[];
      losers: string[];
      trackingMetrics: string[];
    };
    dataCenterExpansion?: {
      event: string;
      mechanism: string;
      beneficiaries: string[];
      losers: string[];
      trackingMetrics: string[];
    };
    semiconCapex?: {
      event: string;
      mechanism: string;
      beneficiaries: string[];
      losers: string[];
      trackingMetrics: string[];
    };
  };
  capitalMovements?: Array<{
    action: string;
    strategicIntent: string;
    marketReaction: string;
    riskPoints: string[];
  }>;
  investmentStrategy?: {
    overallJudgment?: {
      valuation: string;
      earnings: string;
      rates: string;
      policy: string;
      fundFlow: string;
    };
    shortTerm?: {
      timeframe: string;
      stance: string;
      cashPosition: string;
      hedgeStrategy: string;
      actionItems: string[];
    };
    mediumTerm?: {
      timeframe: string;
      focus: string;
      keyCatalysts: string[];
      verificationMetrics: string[];
      stockPicks?: Array<{
        ticker: string;
        logic: string;
        entry?: number;
        target?: number;
        position: string;
      }>;
    };
    longTerm?: {
      timeframe: string;
      themes: string[];
      beneficiarySubsectors: string[];
      representativeStocks: string[];
    };
    portfolioSuggestion?: {
      stocks: Array<{
        ticker: string;
        name: string;
        weight: string;
        logic: string;
        mainRisk: string;
      }>;
      etfs: Array<{
        ticker: string;
        name: string;
        useCase: string;
      }>;
    };
    riskControl?: {
      mainRisks: Array<{
        risk: string;
        probability: string;
        hedge: string;
      }>;
      hedgeInstruments: string[];
    };
  };
  earningsCalendar?: {
    thisWeek?: Array<{
      ticker: string;
      date: string;
      time: string;
      keyMetrics: string;
      expectation?: string;
    }>;
    nextWeek?: Array<{
      ticker: string;
      date: string;
      time: string;
      keyMetrics: string;
      expectation?: string;
    }>;
    impact?: string;
  };
  dailyBlessing?: string;
  forexAnalysis?: {
    // New condensed format
    macroSnapshot?: string;
    riskImplication?: string;
    actionNeeded?: {
      needed: boolean;
      suggestion?: string;
    };
    // Legacy format (backward compatibility)
    dollarIndexInsight?: {
      currentLevel: string;
      trendAnalysis: string;
      marketImpact: string;
      tradingGuidance: string[];
    };
    treasuryYieldAnalysis?: {
      curveInterpretation: string;
      rateEnvironment: string;
      keyInsights: string[];
      sectorRotation: string;
      riskWarning: string;
    };
    crossMarketAnalysis?: {
      equityBondCorrelation: string;
      dollarEquityRelationship: string;
      integratedView: string;
    };
    actionableStrategy?: {
      hedgeRecommendations: string[];
      opportunitySpotting: string[];
      timingGuidance: string;
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
      focusStocks: string[];
      interpretation: string;
    };
    hedgeFundHoldings?: {
      summary: string;
      topHoldings: string[];
      significantChanges: Array<{
        fund: string;
        ticker: string;
        action: string;
        implication: string;
      }>;
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
      focusStocks: Array<{
        ticker: string;
        signals: string[];
        recommendation: string;
      }>;
      actionableInsights: string[];
      riskWarnings: string[];
    };
  };
}

export class ProfessionalBriefingGenerator {
  private analysis: ComprehensiveAnalysis;
  private llmInsights: LLMInsights | null;
  private date: string;
  private stockPerformance: Map<string, StockPerformance> = new Map();

  /**
   * 检查值是否为 N/A 或空值
   */
  private isNAOrEmpty(value: any): boolean {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') {
      const trimmed = value.trim().toUpperCase();
      return trimmed === '' || trimmed === 'N/A' || trimmed === '$N/A' || trimmed.includes('代码N/A') || trimmed === '代码N/A';
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

  /**
   * 处理股票数据
   */
  private processStockData(): void {
    const marketData = this.analysis.market;
    if (!marketData) return;
    
    // 从各个数据源获取股票数据
    const allQuotes: any[] = [];
    
    // 1. 从 sectors 获取（最完整的数据源）
    if (marketData.sectors && Array.isArray(marketData.sectors)) {
      for (const sector of marketData.sectors) {
        if (sector.stocks && Array.isArray(sector.stocks)) {
          allQuotes.push(...sector.stocks);
        }
      }
    }
    
    // 2. 从 indices 获取
    if (marketData.indices?.details && Array.isArray(marketData.indices.details)) {
      allQuotes.push(...marketData.indices.details);
    }
    
    // 3. 从 topGainers/topLosers 补充（可能有不在 sectors 中的数据）
    if (marketData.topGainers && Array.isArray(marketData.topGainers)) {
      allQuotes.push(...marketData.topGainers);
    }
    if (marketData.topLosers && Array.isArray(marketData.topLosers)) {
      allQuotes.push(...marketData.topLosers);
    }

    // 去重并处理
    for (const quote of allQuotes) {
      if (!quote.symbol) continue;
      
      // 跳过已处理的（保留第一个，通常是更完整的数据）
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

  /**
   * 生成完整报告
   */
  async generate(): Promise<{ markdown: string }> {
    const sections = [
      this.generateHeader(),
      this.generateExecutiveSummary(),
      this.generateEarningsCalendarSection(),
      this.generateStockPoolSection(),
      this.generateMacroNewsSection(),
      this.generateCompanyDeepDiveSection(),
      this.generateLinkageAnalysisSection(),
      this.generateCapitalMovementsSection(),
      this.generateInvestmentStrategySection(),
      this.generateSmartMoneySection(),
      this.generateBlessing(),
      this.generateFooter(),
    ];

    const markdown = sections.join('\n\n');

    return { markdown };
  }

  /**
   * 生成报告头部
   */
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

  /**
   * 执行摘要 - 报告最前面的快速概览
   */
  private generateExecutiveSummary(): string {
    const summary = this.llmInsights?.executiveSummary;
    if (!summary) {
      return this.generateFallbackExecutiveSummary();
    }

    let content = `## 执行摘要\n\n`;

    if (summary.oneLiner) {
      content += `**今日概况**: ${summary.oneLiner}\n\n`;
    }

    if (summary.keyEvent) {
      content += `**核心事件**: ${summary.keyEvent}\n\n`;
    }

    if (summary.portfolioImpact) {
      content += `**组合影响**: ${summary.portfolioImpact}\n\n`;
    }

    if (summary.actionItem) {
      content += `**今日建议**: ${summary.actionItem}\n\n`;
    }

    if (summary.riskAlert && !this.isNAOrEmpty(summary.riskAlert)) {
      content += `**风险警示**: ${summary.riskAlert}\n\n`;
    }

    content += `---\n`;
    return content;
  }

  /**
   * 当 LLM 未提供执行摘要时，基于数据自动生成
   */
  private generateFallbackExecutiveSummary(): string {
    let content = `## 执行摘要\n\n`;

    const spx = this.stockPerformance.get('^GSPC');
    const ixic = this.stockPerformance.get('^IXIC');
    const vix = this.stockPerformance.get('^VIX');

    if (spx && ixic) {
      const direction = spx.changePercent > 0.3 ? '上涨' :
                       spx.changePercent < -0.3 ? '下跌' : '窄幅波动';
      content += `**今日概况**: 美股${direction}，S&P 500 ${spx.changePercent >= 0 ? '+' : ''}${spx.changePercent.toFixed(2)}%，`;
      content += `纳指 ${ixic.changePercent >= 0 ? '+' : ''}${ixic.changePercent.toFixed(2)}%`;
      if (vix) {
        content += `，VIX ${vix.price.toFixed(1)}`;
      }
      content += `\n\n`;
    }

    content += `*详细分析请见各章节。*\n\n`;
    content += `---\n`;
    return content;
  }

  /**
   * 财报日历速览（执行摘要下方）
   */
  private generateEarningsCalendarSection(): string {
    const ec = (this.llmInsights as any)?.earningsCalendar;
    if (!ec) return '';

    const hasThisWeek = ec.thisWeek && ec.thisWeek.length > 0;
    const hasNextWeek = ec.nextWeek && ec.nextWeek.length > 0;
    if (!hasThisWeek && !hasNextWeek) return '';

    let content = `## 财报日历\n\n`;

    if (hasThisWeek) {
      content += `### 本周重要财报\n\n`;
      content += `| 日期 | 股票 | 时间 | 关注重点 |\n`;
      content += `|:-----|:----:|:----:|:---------|\n`;
      for (const item of ec.thisWeek) {
        if (this.isNAOrEmpty(item.ticker)) continue;
        content += `| ${item.date || '-'} | ${item.ticker} | ${item.time || '-'} | ${item.keyMetrics || '-'} |\n`;
      }
      content += `\n`;
    }

    if (hasNextWeek) {
      content += `### 下周重要财报\n\n`;
      content += `| 日期 | 股票 | 时间 | 关注重点 |\n`;
      content += `|:-----|:----:|:----:|:---------|\n`;
      for (const item of ec.nextWeek) {
        if (this.isNAOrEmpty(item.ticker)) continue;
        content += `| ${item.date || '-'} | ${item.ticker} | ${item.time || '-'} | ${item.keyMetrics || '-'} |\n`;
      }
      content += `\n`;
    }

    if (ec.impact && !this.isNAOrEmpty(ec.impact)) {
      content += `**财报季影响**: ${ec.impact}\n\n`;
    }

    content += `---\n`;
    return content;
  }

  /**
   * 一、核心股票池表现
   */
  private generateStockPoolSection(): string {
    let content = `## 一、核心股票池表现（上一交易日官方收盘）

`;

    // 检查是否有数据
    if (this.stockPerformance.size === 0) {
      content += `⚠️ 无新收盘数据\n\n`;
      content += `| 分类 (Category) | 公司 (Company) | 股票代号 (Ticker) | 最新股价 (USD) | 涨跌幅 (%) | 表现 |\n`;
      content += `|:----------------|:---------------|:-----------------:|---------------:|------------:|:----:|\n`;
      content += `| - | - | - | - | - | - |\n`;
      content += `\n*交易所无新数据，可能为非交易日或数据源延迟。*\n`;
      return content;
    }

    // === 主要指数 ===
    content += `### 主要指数\n\n`;
    content += `| 指数名称 | 代号 | 最新点位 | 涨跌幅 (%) | 表现 |\n`;
    content += `|:---------|:----:|----------:|------------:|:----:|\n`;

    const indexInfo: Record<string, string> = {
      '^GSPC': 'S&P 500',
      '^DJI': '道琼斯工业',
      '^IXIC': '纳斯达克综合',
      '^RUT': '罗素2000',
      '^VIX': 'VIX恐慌指数',
    };

    for (const symbol of MONITORED_SYMBOLS.indices) {
      const index = this.stockPerformance.get(symbol);
      if (index) {
        // VIX: 上涨=市场恐慌(红), 下跌=市场平静(绿)
        // 其他指数: 绿涨红跌（国际惯例，方便美股投资者阅读）
        const isVix = symbol === '^VIX';
        const emoji = isVix
          ? (index.changePercent > 0 ? '🔴' : index.changePercent < 0 ? '🟢' : '➡️')
          : (index.changePercent > 0 ? '🟢' : index.changePercent < 0 ? '🔴' : '➡️');
        const changeStr = `${index.changePercent >= 0 ? '+' : ''}${index.changePercent.toFixed(2)}%`;
        const priceStr = index.price.toFixed(2);
        content += `| ${indexInfo[symbol] || index.name} | ${symbol} | ${priceStr} | ${changeStr} | ${emoji} |\n`;
      }
    }

    // === 涨跌幅速览 ===
    const allStocks = Array.from(this.stockPerformance.values())
      .filter(s => !s.ticker.startsWith('^') && !['SMH','SOXX','QQQ','VOO','ARKQ','BOTZ','ROBT','GLD'].includes(s.ticker));
    const sortedByChange = [...allStocks].sort((a, b) => b.changePercent - a.changePercent);
    const topGainers = sortedByChange.filter(s => s.changePercent > 0).slice(0, 5);
    const topLosers = sortedByChange.filter(s => s.changePercent < 0).slice(-5).reverse();

    if (topGainers.length > 0 || topLosers.length > 0) {
      content += `\n### 今日涨跌幅速览\n\n`;
      if (topGainers.length > 0) {
        content += `**涨幅前5**: ${topGainers.map(s => `${s.ticker} ${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%`).join(' | ')}\n\n`;
      }
      if (topLosers.length > 0) {
        content += `**跌幅前5**: ${topLosers.map(s => `${s.ticker} ${s.changePercent.toFixed(2)}%`).join(' | ')}\n\n`;
      }
    }

    // === 指数深度分析 ===
    content += `### 指数变化深度分析\n\n`;
    const indexAnalysis = this.llmInsights?.indexAnalysis as any;
    if (indexAnalysis) {
      if (indexAnalysis.marketOverview) {
        content += `**市场整体格局**: ${indexAnalysis.marketOverview}\n\n`;
      }
      if (indexAnalysis.dataAnalysis) {
        content += `**数据面分析**: ${indexAnalysis.dataAnalysis}\n\n`;
      }
      if (indexAnalysis.newsAnalysis) {
        content += `**信息面分析**: ${indexAnalysis.newsAnalysis}\n\n`;
      }
      if (indexAnalysis.underlyingLogic) {
        content += `**底层逻辑**: ${indexAnalysis.underlyingLogic}\n\n`;
      }
      if (indexAnalysis.keyDrivers && Array.isArray(indexAnalysis.keyDrivers) && indexAnalysis.keyDrivers.length > 0) {
        content += `**主要驱动因素**:\n`;
        indexAnalysis.keyDrivers.forEach((driver: string) => {
          content += `- ${driver}\n`;
        });
        content += `\n`;
      }
      if (indexAnalysis.riskAppetite) {
        content += `**风险偏好**: ${indexAnalysis.riskAppetite}\n\n`;
      }
      if (indexAnalysis.crossIndexAnalysis) {
        content += `**跨指数联动**: ${indexAnalysis.crossIndexAnalysis}\n\n`;
      }
    } else {
      content += this.generateDefaultIndexAnalysis();
    }

    // === 美元与利率环境 ===
    content += this.generateForexSection();

    // === ETF 表现 ===
    content += `### ETF 表现\n\n`;
    content += `| 分类 | ETF名称 | 代号 | 最新价格 (USD) | 涨跌幅 (%) | 表现 |\n`;
    content += `|:-----|:--------|:----:|---------------:|------------:|:----:|\n`;

    const etfCategory: Record<string, string> = {
      'SMH': '半导体',
      'SOXX': '半导体',
      'QQQ': '科技龙头',
      'VOO': '大盘指数',
      'ARKQ': '自动化/机器人',
      'BOTZ': 'AI/机器人',
      'ROBT': 'AI/机器人',
      'GLD': '黄金/对冲',
    };

    for (const symbol of MONITORED_SYMBOLS.etf) {
      const etf = this.stockPerformance.get(symbol);
      if (etf) {
        const emoji = etf.changePercent > 0 ? '🟢' : etf.changePercent < 0 ? '🔴' : '➡️';
        const changeStr = `${etf.changePercent >= 0 ? '+' : ''}${etf.changePercent.toFixed(2)}%`;
        content += `| ${etfCategory[symbol] || 'ETF'} | ${etf.name} | ${symbol} | $${etf.price.toFixed(2)} | ${changeStr} | ${emoji} |\n`;
      }
    }

    // === AI 产业链股票 ===
    content += `\n### AI 产业链股票\n\n`;
    content += `| 分类 (Category) | 公司 (Company) | 股票代号 (Ticker) | 最新股价 (USD) | 涨跌幅 (%) | 表现 |\n`;
    content += `|:----------------|:---------------|:-----------------:|---------------:|------------:|:----:|\n`;

    for (const [category, symbols] of Object.entries(AI_INDUSTRY_CATEGORIES)) {
      for (const symbol of symbols) {
        const stock = this.stockPerformance.get(symbol);
        if (stock) {
          const emoji = stock.changePercent > 0 ? '🟢' : stock.changePercent < 0 ? '🔴' : '➡️';
          const changeStr = `${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%`;
          content += `| ${category} | ${stock.name} | ${stock.ticker} | $${stock.price.toFixed(2)} | ${changeStr} | ${emoji} |\n`;
        }
      }
    }

    // 未上市重要主体
    content += `\n**未上市重要主体**：OpenAI / Anthropic / xAI / Perplexity（仅列示，不填价格）\n`;

    return content;
  }

  /**
   * 生成美元与利率环境版块
   */
  private generateForexSection(): string {
    let content = `\n### 美元与利率环境\n\n`;

    const forexData = this.analysis.forex;
    const forexLLM = this.llmInsights?.forexAnalysis;

    if (!forexData) {
      content += `*暂无美元和利率数据*\n\n`;
      return content;
    }

    // ==== 摘要一览 ====
    const dollarIndex = forexData.dollarIndex;
    const treasuryYields = forexData.treasuryYields;
    const vix = this.stockPerformance.get('^VIX');

    if (dollarIndex || treasuryYields || vix) {
      content += `| 指标 | 数值 | 涨跌幅 |\n`;
      content += `|:-----|-----:|-------:|\n`;
      if (dollarIndex) {
        content += `| 美元指数 (DXY) | ${dollarIndex.current.toFixed(2)} | ${this.formatChange(dollarIndex.changePercent)} |\n`;
      }
      if (treasuryYields?.yields?.['10Y']) {
        const y10 = treasuryYields.yields['10Y'];
        content += `| 10Y 美债收益率 | ${y10.rate.toFixed(2)}% | ${this.formatChange(y10.changePercent)} |\n`;
      }
      if (vix) {
        content += `| VIX 恐慌指数 | ${vix.price.toFixed(2)} | ${this.formatChange(vix.changePercent)} |\n`;
      }
      content += `\n`;
    }

    // ==== LLM 精简分析（优先新格式，兼容旧格式） ====
    if (forexLLM?.macroSnapshot) {
      content += `**宏观快照**: ${forexLLM.macroSnapshot}\n\n`;
      if (forexLLM.riskImplication) {
        content += `**对AI股票的影响**: ${forexLLM.riskImplication}\n\n`;
      }
      if (forexLLM.actionNeeded?.needed && forexLLM.actionNeeded.suggestion) {
        content += `**操作建议**: ${forexLLM.actionNeeded.suggestion}\n\n`;
      }
    } else if (forexLLM?.crossMarketAnalysis?.integratedView) {
      content += `**综合解读**: ${forexLLM.crossMarketAnalysis.integratedView}\n\n`;
      if (forexLLM.actionableStrategy?.timingGuidance) {
        content += `**时机判断**: ${forexLLM.actionableStrategy.timingGuidance}\n\n`;
      }
    } else if (forexData.overallAssessment?.keyTakeaways?.length) {
      content += `**关键要点**: ${forexData.overallAssessment.keyTakeaways.join('；')}\n\n`;
    }

    // ==== 详细数据 ====
    content += `---\n\n`;
    content += `##### 详细数据\n\n`;

    // 完整收益率表
    if (treasuryYields?.yields) {
      content += `**美债收益率**:\n\n`;
      content += `| 期限 | 收益率 | 涨跌幅 | 趋势 |\n`;
      content += `|:-----|-------:|-------:|:----:|\n`;
      const periods = ['3M', '2Y', '5Y', '10Y', '30Y'];
      for (const period of periods) {
        const yieldData = treasuryYields.yields[period];
        if (yieldData) {
          const trendEmoji = yieldData.trend === 'rising' ? '⬆️' : yieldData.trend === 'falling' ? '⬇️' : '➡️';
          content += `| ${period} | ${yieldData.rate.toFixed(2)}% | ${this.formatChange(yieldData.changePercent)} | ${trendEmoji} |\n`;
        }
      }
      content += `\n`;

      if (treasuryYields.yieldCurve) {
        const curve = treasuryYields.yieldCurve;
        content += `**收益率曲线**: ${this.getYieldCurveShapeText(curve.shape)}，2Y-10Y利差 ${curve.spread2Y10Y >= 0 ? '+' : ''}${curve.spread2Y10Y.toFixed(2)}%\n\n`;
      }
    }

    // 货币对表
    const currencyPairs = forexData.currencyPairs;
    if (currencyPairs && Object.keys(currencyPairs).length > 0) {
      content += `**主要货币对**:\n\n`;
      content += `| 货币对 | 汇率 | 涨跌幅 | 美元动向 |\n`;
      content += `|:-------|-----:|-------:|:--------:|\n`;
      const pairs = ['USDCHF', 'USDSGD', 'USDJPY', 'USDCNH'];
      for (const pair of pairs) {
        const pairData = currencyPairs[pair];
        if (pairData) {
          const trendText = pairData.trend === 'usd_strengthening' ? '走强' : pairData.trend === 'usd_weakening' ? '走弱' : '持稳';
          content += `| ${pair} | ${pairData.rate.toFixed(4)} | ${this.formatChange(pairData.changePercent)} | ${trendText} |\n`;
        }
      }
      content += `\n`;
    }

    return content;
  }

  /**
   * 格式化涨跌幅，0% 显示为 0.00% 而非 N/A
   */
  private formatChange(changePercent: number): string {
    return `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
  }

  /**
   * 获取收益率曲线形态文本
   */
  private getYieldCurveShapeText(shape: string): string {
    switch (shape) {
      case 'inverted': return '⚠️ 倒挂';
      case 'flat': return '➡️ 平坦';
      case 'steep': return '📈 陡峭';
      case 'normal': return '✅ 正常';
      default: return shape;
    }
  }

  /**
   * 生成默认的指数分析（无 LLM 时使用）
   */
  private generateDefaultIndexAnalysis(): string {
    let content = '';

    const spx = this.stockPerformance.get('^GSPC');
    const dji = this.stockPerformance.get('^DJI');
    const ixic = this.stockPerformance.get('^IXIC');
    const rut = this.stockPerformance.get('^RUT');
    const vix = this.stockPerformance.get('^VIX');

    // 判断市场整体走势
    const majorIndicesUp = [spx, dji, ixic].filter(i => i && i.changePercent > 0).length;
    const marketTrend = majorIndicesUp >= 2 ? '偏多' : majorIndicesUp === 0 ? '偏空' : '分化';

    content += `**市场整体格局**: 三大指数${marketTrend}，`;
    if (vix) {
      content += `VIX ${vix.changePercent > 0 ? '上升' : '下降'}${Math.abs(vix.changePercent).toFixed(1)}%，`;
      content += vix.changePercent > 0 ? '市场避险情绪升温。' : '市场情绪相对平稳。';
    }
    content += '\n\n';

    // S&P 500 分析
    if (spx) {
      content += `#### S&P 500（^GSPC）${spx.changePercent >= 0 ? '+' : ''}${spx.changePercent.toFixed(2)}%\n\n`;
      content += `**数据面分析**: 收于 ${spx.price.toFixed(2)} 点，`;
      content += spx.changePercent > 0 ? '延续上涨趋势。' : spx.changePercent < 0 ? '出现回调。' : '横盘整理。';
      content += '\n\n';
      content += `**底层逻辑**: 作为美股大盘风向标，S&P 500 走势反映市场对经济基本面和企业盈利预期的综合判断。\n\n`;
      content += `---\n\n`;
    }

    // 纳斯达克分析
    if (ixic) {
      content += `#### 纳斯达克综合（^IXIC）${ixic.changePercent >= 0 ? '+' : ''}${ixic.changePercent.toFixed(2)}%\n\n`;
      content += `**数据面分析**: 收于 ${ixic.price.toFixed(2)} 点，`;

      // 与 S&P 500 对比
      if (spx) {
        const diff = ixic.changePercent - spx.changePercent;
        if (Math.abs(diff) > 0.3) {
          content += diff > 0 ? '跑赢大盘，科技股相对强势。' : '跑输大盘，科技股承压。';
        } else {
          content += '与大盘走势基本一致。';
        }
      }
      content += '\n\n';
      content += `**底层逻辑**: 纳指以科技股为主导，对利率变化和AI相关消息更为敏感，是科技板块风向标。\n\n`;
      content += `---\n\n`;
    }

    // 罗素 2000 分析
    if (rut) {
      content += `#### 罗素 2000（^RUT）${rut.changePercent >= 0 ? '+' : ''}${rut.changePercent.toFixed(2)}%\n\n`;
      content += `**数据面分析**: 收于 ${rut.price.toFixed(2)} 点，`;

      // 与大盘对比
      if (spx) {
        const diff = rut.changePercent - spx.changePercent;
        if (Math.abs(diff) > 0.5) {
          content += diff > 0 ? '小盘股跑赢大盘，风险偏好回升。' : '小盘股跑输大盘，资金偏好大盘蓝筹。';
        } else {
          content += '与大盘走势趋同。';
        }
      }
      content += '\n\n';
      content += `**底层逻辑**: 罗素 2000 代表小盘股表现，通常在降息周期和经济复苏预期中表现较好，对流动性和风险偏好更敏感。\n\n`;
      content += `---\n\n`;
    }

    // VIX 分析
    if (vix) {
      content += `#### VIX 恐慌指数（^VIX）${vix.changePercent >= 0 ? '+' : ''}${vix.changePercent.toFixed(2)}%\n\n`;
      content += `**数据面分析**: 收于 ${vix.price.toFixed(2)}，`;
      if (vix.price < 15) {
        content += '处于低位，市场情绪乐观。';
      } else if (vix.price < 20) {
        content += '处于正常区间，市场情绪稳定。';
      } else if (vix.price < 30) {
        content += '处于偏高水平，市场存在一定担忧。';
      } else {
        content += '处于高位，市场恐慌情绪明显。';
      }
      content += '\n\n';
      content += `**底层逻辑**: VIX 衡量市场对未来30天波动的预期，上升意味着市场不确定性增加，通常与股市走势负相关。\n\n`;
    }

    return content;
  }

  /**
   * 二、市场宏观动态与要闻
   */
  private generateMacroNewsSection(): string {
    let content = `## 二、市场宏观动态与要闻（过去24小时）

`;

    const llmNews = this.llmInsights?.marketMacroNews;
    
    if (llmNews?.summary) {
      content += `**整体情绪**: ${llmNews.summary}\n\n`;
    }

    // 从分析数据中获取新闻
    const newsData = this.analysis.news;
    const newsHeadlines = (newsData as any)?.keyHeadlines || [];
    
    if (llmNews?.keyNews && llmNews.keyNews.length > 0) {
      // 使用LLM生成的新闻分析
      llmNews.keyNews.forEach((news, index) => {
        const importanceIcon = news.importance === 'high' ? '🔴' : news.importance === 'medium' ? '🟡' : '🟢';
        content += `### ${index + 1}. ${importanceIcon} ${news.title}\n\n`;
        content += `**事实摘要**: ${news.fact}\n\n`;
        content += `**影响解读**: ${news.impact}\n\n`;
        content += `**分类**: ${news.category}\n\n`;
        content += `---\n\n`;
      });
    } else if (newsHeadlines.length > 0) {
      // 使用收集的新闻数据
      newsHeadlines.slice(0, 10).forEach((headline: any, index: number) => {
        content += `### ${index + 1}. ${headline.headline || headline.title || headline}\n\n`;
        if (typeof headline === 'object') {
          if (headline.source && !this.isNAOrEmpty(headline.source)) {
            content += `**来源**: ${headline.source}\n\n`;
          }
          if (headline.summary) {
            content += `**摘要**: ${headline.summary}\n\n`;
          }
        }
        content += `---\n\n`;
      });
    } else {
      content += `暂无重大新闻更新。\n`;
    }

    return content;
  }

  /**
   * 三、关键公司深度动态
   */
  private generateCompanyDeepDiveSection(): string {
    let content = `## 三、关键公司深度动态（过去24小时）

`;

    const deepDive = this.llmInsights?.companyDeepDive;
    
    if (deepDive && deepDive.length > 0) {
      for (const company of deepDive) {
        content += `### ${company.company}（${company.ticker}）\n\n`;
        content += `**事件摘要**: ${company.event}\n\n`;
        content += `**投资逻辑解读**: ${company.investmentLogic}\n\n`;
        
        if (company.priceTarget && !this.isNAOrEmpty(company.priceTarget.current)) {
          const timeframeMap: Record<string, string> = { short: '短期', medium: '中期', long: '长期' };
          content += `**价格目标**:\n`;
          content += `- 当前价: $${company.priceTarget.current}\n`;
          if (!this.isNAOrEmpty(company.priceTarget.target)) {
            content += `- 目标价: $${company.priceTarget.target}\n`;
          }
          if (!this.isNAOrEmpty(company.priceTarget.stopLoss)) {
            content += `- 止损价: $${company.priceTarget.stopLoss}\n`;
          }
          if (company.priceTarget.timeframe) {
            content += `- 时间框架: ${timeframeMap[company.priceTarget.timeframe] || company.priceTarget.timeframe}\n`;
          }
          content += `\n`;
        }
        
        if (company.catalysts && company.catalysts.length > 0) {
          content += `**催化剂**: ${company.catalysts.join('、')}\n\n`;
        }
        
        if (company.risks && company.risks.length > 0) {
          content += `**风险提示**: ${company.risks.join('、')}\n\n`;
        }
        
        content += `---\n\n`;
      }
    } else {
      // 基于股价异动生成
      const topGainers = this.analysis.market?.topGainers?.slice(0, 3) || [];
      const topLosers = this.analysis.market?.topLosers?.slice(0, 3) || [];
      
      if (topGainers.length > 0) {
        content += `### 涨幅领先\n\n`;
        for (const stock of topGainers) {
          const info = STOCK_INFO[stock.symbol] || { name: stock.symbol, category: '其他' };
          content += `**${info.name}（${stock.symbol}）** | 涨幅 +${stock.changePercent?.toFixed(2)}% | `;
          content += `关注要点：股价异动，建议关注近期新闻和财报\n\n`;
        }
      }
      
      if (topLosers.length > 0) {
        content += `### 跌幅领先\n\n`;
        for (const stock of topLosers) {
          const info = STOCK_INFO[stock.symbol] || { name: stock.symbol, category: '其他' };
          content += `**${info.name}（${stock.symbol}）** | 跌幅 ${stock.changePercent?.toFixed(2)}% | `;
          content += `关注要点：股价异动，建议关注近期新闻和财报\n\n`;
        }
      }
    }

    return content;
  }

  /**
   * 四、行业影响与关联分析
   */
  private generateLinkageAnalysisSection(): string {
    let content = `## 四、行业影响与关联分析（联动效应）

`;

    const linkage = this.llmInsights?.industryLinkageAnalysis;

    // 辅助函数：安全处理数组或字符串字段，返回 null 表示无有效数据
    const formatField = (field: string[] | string | undefined): string | null => {
      if (!field) return null;
      if (typeof field === 'string') return this.isNAOrEmpty(field) ? null : field;
      if (Array.isArray(field)) {
        const valid = field.filter(f => !this.isNAOrEmpty(f));
        return valid.length > 0 ? valid.join('、') : null;
      }
      return null;
    };

    // 辅助函数：渲染链路分析的一个字段
    const renderField = (label: string, value: string | null): string => {
      return value ? `**${label}**: ${value}\n\n` : '';
    };

    // GPU供给链
    content += `### 1. GPU/加速卡供给与价格链\n\n`;
    if (linkage?.gpuSupplyChain) {
      const gpu = linkage.gpuSupplyChain;
      content += renderField('事件', gpu.event);
      content += renderField('传导机制', gpu.mechanism);
      content += renderField('受益环节', formatField(gpu.beneficiaries));
      content += renderField('受损环节', formatField(gpu.losers));
      content += renderField('跟踪指标', formatField(gpu.trackingMetrics));
    } else {
      content += `GPU供给 → 训练/推理成本 → 云厂商与模型公司毛利/CapEx\n\n`;
      content += `- **受益方**: NVDA（供给方）、云厂商（规模效应）\n`;
      content += `- **跟踪指标**: H100/H200定价、交货周期、各厂商CapEx指引\n\n`;
    }

    // 数据中心扩张链
    content += `### 2. 数据中心扩张链\n\n`;
    if (linkage?.dataCenterExpansion) {
      const dc = linkage.dataCenterExpansion;
      content += renderField('事件', dc.event);
      content += renderField('传导机制', dc.mechanism);
      content += renderField('受益环节', formatField(dc.beneficiaries));
      content += renderField('受损环节', formatField(dc.losers));
      content += renderField('跟踪指标', formatField(dc.trackingMetrics));
    } else {
      content += `数据中心扩张 → 服务器/网络/电力与冷却需求增长\n\n`;
      content += `- **受益方**: VRT（电源散热）、ETN（电气设备）、ANET（网络）、SMCI（服务器）\n`;
      content += `- **跟踪指标**: 云厂商数据中心新建计划、电力需求增长、PUE指标\n\n`;
    }

    // 半导体资本开支链
    content += `### 3. 半导体资本开支链\n\n`;
    if (linkage?.semiconCapex) {
      const capex = linkage.semiconCapex;
      content += renderField('事件', capex.event);
      content += renderField('传导机制', capex.mechanism);
      content += renderField('受益环节', formatField(capex.beneficiaries));
      content += renderField('受损环节', formatField(capex.losers));
      content += renderField('跟踪指标', formatField(capex.trackingMetrics));
    } else {
      content += `半导体资本开支 → 设备/EDA订单 → 行业能见度\n\n`;
      content += `- **受益方**: AMAT、LRCX、KLAC（设备）、SNPS、CDNS（EDA）\n`;
      content += `- **跟踪指标**: TSM/Intel/三星CapEx计划、设备厂商订单backlog、EDA续约率\n\n`;
    }

    return content;
  }

  /**
   * 五、产业链资本动向与资产交易
   */
  private generateCapitalMovementsSection(): string {
    let content = `## 五、产业链资本动向与资产交易（过去24小时）

`;

    const movements = this.llmInsights?.capitalMovements;

    if (movements && movements.length > 0) {
      movements.forEach((movement, index) => {
        content += `### ${index + 1}. ${movement.action}\n\n`;
        content += `**战略意图**: ${movement.strategicIntent}\n\n`;
        content += `**市场反应**: ${movement.marketReaction}\n\n`;
        if (movement.riskPoints && movement.riskPoints.length > 0) {
          content += `**风险点**: ${movement.riskPoints.join('、')}\n\n`;
        }
        content += `---\n\n`;
      });
    } else {
      content += `### 关注领域\n\n`;
      content += `- **CapEx动向**: 云厂商2026年资本开支指引更新\n`;
      content += `- **扩产计划**: AI芯片产能扩张进展\n`;
      content += `- **数据中心建设**: 大型数据中心项目进展\n`;
      content += `- **并购/投资**: AI领域战略投资与并购动态\n\n`;
      content += `*（暂无24小时内重大资本动向更新，持续关注中）*\n`;
    }

    return content;
  }

  /**
   * 六、投资建议与策略展望
   */
  private generateInvestmentStrategySection(): string {
    let content = `## 六、投资建议与策略展望

`;

    const strategy = this.llmInsights?.investmentStrategy;

    // 总体判断
    content += `### 总体判断\n\n`;
    if (strategy?.overallJudgment) {
      const judgment = strategy.overallJudgment;
      const rows: Array<[string, string]> = [];
      if (!this.isNAOrEmpty(judgment.valuation)) rows.push(['估值', judgment.valuation]);
      if (!this.isNAOrEmpty(judgment.earnings)) rows.push(['业绩', judgment.earnings]);
      if (!this.isNAOrEmpty(judgment.rates)) rows.push(['利率', judgment.rates]);
      if (!this.isNAOrEmpty(judgment.policy)) rows.push(['政策', judgment.policy]);
      if (!this.isNAOrEmpty(judgment.fundFlow)) rows.push(['资金偏好', judgment.fundFlow]);
      if (rows.length > 0) {
        content += `| 维度 | 判断 |\n`;
        content += `|:-----|:-----|\n`;
        rows.forEach(([dim, val]) => {
          content += `| ${dim} | ${val} |\n`;
        });
        content += `\n`;
      } else {
        content += `- 需结合最新数据综合判断\n\n`;
      }
    } else {
      content += `- **估值-业绩-利率-政策**: 需结合最新数据综合判断\n`;
      content += `- **资金偏好**: 关注AI相关ETF资金流向\n\n`;
    }

    // 短期建议
    content += `### 短期配置（1个月内）\n\n`;
    if (strategy?.shortTerm) {
      const short = strategy.shortTerm;
      const stanceText = short.stance === 'defensive' ? '防御' : short.stance === 'aggressive' ? '进取' : '中性';
      content += `- **立场**: ${stanceText}\n`;
      content += `- **现金仓位**: ${short.cashPosition}\n`;
      content += `- **对冲思路**: ${short.hedgeStrategy}\n`;
      if (short.actionItems && short.actionItems.length > 0) {
        content += `- **具体操作**:\n`;
        short.actionItems.forEach(item => {
          content += `  - ${item}\n`;
        });
      }
      content += `\n`;
    } else {
      content += `- 强调防御性、仓位与流动性管理\n`;
      content += `- 建议现金比例: 20-30%\n`;
      content += `- 对冲工具: GLD、短债ETF\n\n`;
    }

    // 中期建议
    content += `### 中期配置（3-6个月）\n\n`;
    if (strategy?.mediumTerm) {
      const medium = strategy.mediumTerm;
      content += `- **聚焦**: ${medium.focus}\n`;
      if (medium.keyCatalysts && medium.keyCatalysts.length > 0) {
        content += `- **关键催化**: ${medium.keyCatalysts.join('、')}\n`;
      }
      if (medium.verificationMetrics && medium.verificationMetrics.length > 0) {
        content += `- **验证指标**: ${medium.verificationMetrics.join('、')}\n`;
      }
      if (medium.stockPicks && medium.stockPicks.length > 0) {
        const validPicks = medium.stockPicks.filter(pick => !this.isNAOrEmpty(pick.ticker));
        if (validPicks.length > 0) {
          const hasPrice = validPicks.some(pick => !this.isNAOrEmpty(pick.entry) || !this.isNAOrEmpty(pick.target));
          content += `\n**精选标的**:\n\n`;
          if (hasPrice) {
            content += `| 股票 | 核心逻辑 | 买入价 | 目标价 | 建议仓位 |\n`;
            content += `|:----:|:---------|-------:|-------:|:--------:|\n`;
            validPicks.forEach(pick => {
              const entry = this.isNAOrEmpty(pick.entry) ? '-' : `$${pick.entry}`;
              const target = this.isNAOrEmpty(pick.target) ? '-' : `$${pick.target}`;
              content += `| ${pick.ticker} | ${pick.logic} | ${entry} | ${target} | ${pick.position} |\n`;
            });
          } else {
            content += `| 股票 | 核心逻辑 | 建议仓位 |\n`;
            content += `|:----:|:---------|:--------:|\n`;
            validPicks.forEach(pick => {
              content += `| ${pick.ticker} | ${pick.logic} | ${pick.position} |\n`;
            });
          }
        }
      }
      content += `\n`;
    } else {
      content += `- 聚焦估值修复与业绩兑现\n`;
      content += `- 关键催化: 财报季、AI产品发布、云厂商CapEx指引\n`;
      content += `- 验证指标: 收入增速、毛利率、客户数增长\n\n`;
    }

    // 长期建议
    content += `### 长期配置（6-12个月以上）\n\n`;
    if (strategy?.longTerm) {
      const long = strategy.longTerm;
      if (long.themes && long.themes.length > 0) {
        content += `**结构性成长主题**:\n`;
        long.themes.forEach(theme => {
          content += `- ${theme}\n`;
        });
        content += `\n`;
      }
      if (long.beneficiarySubsectors && long.beneficiarySubsectors.length > 0) {
        content += `**受益子行业**: ${long.beneficiarySubsectors.join('、')}\n\n`;
      }
      if (long.representativeStocks && long.representativeStocks.length > 0) {
        content += `**代表标的**: ${long.representativeStocks.join('、')}\n\n`;
      }
    } else {
      content += `**结构性成长主题**:\n`;
      content += `- 算力基础设施（GPU、服务器、网络）\n`;
      content += `- 半导体CapEx周期（设备、EDA）\n`;
      content += `- AI应用渗透（企业软件、自动驾驶）\n\n`;
    }

    // 投资组合参考
    content += `### 投资组合参考\n\n`;
    if (strategy?.portfolioSuggestion) {
      const portfolio = strategy.portfolioSuggestion;
      if (portfolio.stocks && portfolio.stocks.length > 0) {
        content += `**个股配置**:\n\n`;
        content += `| 股票 | 名称 | 权重 | 核心逻辑 | 主要风险 |\n`;
        content += `|:----:|:-----|:----:|:---------|:---------|\n`;
        portfolio.stocks.forEach(stock => {
          content += `| ${stock.ticker} | ${stock.name} | ${stock.weight} | ${stock.logic} | ${stock.mainRisk} |\n`;
        });
        content += `\n`;
      }
      if (portfolio.etfs && portfolio.etfs.length > 0) {
        const validEtfs = portfolio.etfs.filter(etf => !this.isNAOrEmpty(etf.ticker) && !this.isNAOrEmpty(etf.name));
        if (validEtfs.length > 0) {
          content += `**ETF配置**:\n\n`;
          content += `| ETF | 名称 | 适用场景 |\n`;
          content += `|:----|:-----|:---------|\n`;
          validEtfs.forEach(etf => {
            content += `| ${etf.ticker} | ${etf.name} | ${etf.useCase || '-'} |\n`;
          });
          content += `\n`;
        }
      }
    } else {
      content += `**个股参考**: NVDA、MSFT、TSM、AMZN、META、AMD、ASML、AVGO\n\n`;
      content += `**ETF参考**:\n`;
      content += `- SMH / SOXX: 半导体行业配置\n`;
      content += `- QQQ: 科技龙头配置\n`;
      content += `- ARKQ / BOTZ: 自动化/机器人主题\n\n`;
    }

    // 风险控制
    content += `### 风险控制\n\n`;
    if (strategy?.riskControl) {
      const risk = strategy.riskControl;
      if (risk.mainRisks && risk.mainRisks.length > 0) {
        content += `**主要风险**:\n\n`;
        content += `| 风险 | 概率 | 对冲建议 |\n`;
        content += `|:-----|:----:|:---------|\n`;
        risk.mainRisks.forEach(r => {
          const probText = r.probability === 'high' ? '高' : r.probability === 'medium' ? '中' : '低';
          content += `| ${r.risk} | ${probText} | ${r.hedge} |\n`;
        });
        content += `\n`;
      }
      if (risk.hedgeInstruments && risk.hedgeInstruments.length > 0) {
        const validInstruments = risk.hedgeInstruments.filter(item => !this.isNAOrEmpty(item));
        if (validInstruments.length > 0) {
          content += `**对冲工具**: ${validInstruments.join('、')}\n`;
        }
      }
    } else {
      content += `**主要风险**:\n`;
      content += `- 政策收紧（出口管制升级）\n`;
      content += `- 供应链风险（地缘政治）\n`;
      content += `- 估值过热（增速放缓）\n`;
      content += `- 利率上行（资金成本）\n`;
      content += `- 地缘冲突（台海风险）\n\n`;
      content += `**对冲建议**: 短债ETF、美元、黄金(GLD)\n`;
    }

    return content;
  }

  /**
   * 七、智慧资金与市场情绪
   */
  private generateSmartMoneySection(): string {
    let content = `## 七、智慧资金与市场情绪

`;

    const smartMoney = this.analysis.smartMoney;
    const llmSmartMoney = this.llmInsights?.smartMoneyAnalysis;

    // 1. 国会议员交易动向
    content += `### 1. 国会议员交易动向\n\n`;

    if (llmSmartMoney?.congressTrading) {
      const congress = llmSmartMoney.congressTrading;
      content += `**概况**: ${congress.summary}\n\n`;

      if (congress.notableTrades && congress.notableTrades.length > 0) {
        const validTrades = congress.notableTrades
          .filter(trade => !this.isNAOrEmpty(trade.politician) && !this.isNAOrEmpty(trade.ticker))
          .slice(0, 5);
        if (validTrades.length > 0) {
          content += `**近期重要交易**:\n\n`;
          content += `| 议员 | 党派 | 股票 | 操作 | 金额 | 意义 |\n`;
          content += `|:-----|:----:|:----:|:----:|:----:|:-----|\n`;
          for (const trade of validTrades) {
            const partyEmoji = trade.party === 'D' ? '🔵' : trade.party === 'R' ? '🔴' : '⚪';
            content += `| ${trade.politician} | ${partyEmoji} | ${trade.ticker} | ${trade.action} | ${trade.amount || '-'} | ${trade.significance || '-'} |\n`;
          }
          content += `\n`;
        }
      }

      if (congress.focusStocks && congress.focusStocks.length > 0) {
        content += `**重点关注标的**: ${congress.focusStocks.join('、')}\n\n`;
      }

      if (congress.interpretation) {
        content += `**解读**: ${congress.interpretation}\n\n`;
      }
    } else if (smartMoney?.congressTrading) {
      const congress = smartMoney.congressTrading;
      content += `**概况**: 过去7天共 ${congress.totalTrades} 笔交易，买入 ${congress.buyTrades} 笔，卖出 ${congress.sellTrades} 笔\n\n`;

      if (congress.topBuys && congress.topBuys.length > 0) {
        content += `**热门买入**: ${congress.topBuys.slice(0, 5).map(b => `${b.ticker}(${b.buyCount}笔)`).join('、')}\n\n`;
      }

      if (congress.highlights && congress.highlights.length > 0) {
        content += `**要点**: ${congress.highlights.join('；')}\n\n`;
      }
    } else {
      content += `*暂无国会交易数据（需配置 FINNHUB_API_KEY，免费版即包含）*\n\n`;
    }

    // 2. 对冲基金持仓变动
    content += `### 2. 对冲基金持仓变动\n\n`;

    if (llmSmartMoney?.hedgeFundHoldings) {
      const hedge = llmSmartMoney.hedgeFundHoldings;
      content += `**概况**: ${hedge.summary}\n\n`;

      if (hedge.topHoldings && hedge.topHoldings.length > 0) {
        content += `**机构共识持仓**: ${hedge.topHoldings.join('、')}\n\n`;
      }

      if (hedge.significantChanges && hedge.significantChanges.length > 0) {
        content += `**显著变动**:\n\n`;
        for (const change of hedge.significantChanges.slice(0, 5)) {
          const actionEmoji = change.action === '新建仓' ? '🆕' :
                             change.action === '加仓' ? '⬆️' :
                             change.action === '减仓' ? '⬇️' : '🚫';
          content += `- ${actionEmoji} ${change.fund}: ${change.ticker} ${change.action} - ${change.implication}\n`;
        }
        content += `\n`;
      }

      if (hedge.interpretation) {
        content += `**解读**: ${hedge.interpretation}\n\n`;
      }
    } else if (smartMoney?.hedgeFund) {
      const hedge = smartMoney.hedgeFund;
      content += `**概况**: 追踪 ${hedge.totalFundsTracked} 家基金，整体偏${hedge.aggregatedSentiment === 'bullish' ? '多' : hedge.aggregatedSentiment === 'bearish' ? '空' : '中性'}\n\n`;

      if (hedge.topHoldings && hedge.topHoldings.length > 0) {
        content += `**机构共识持仓**: ${hedge.topHoldings.slice(0, 5).map(h => `${h.ticker}(${h.fundsHolding}家)`).join('、')}\n\n`;
      }

      if (hedge.highlights && hedge.highlights.length > 0) {
        content += `**要点**: ${hedge.highlights.join('；')}\n\n`;
      }
    } else {
      content += `*暂无对冲基金数据（使用 SEC EDGAR 免费公开数据）*\n\n`;
    }

    // 3. 预测市场信号
    content += `### 3. 预测市场信号\n\n`;

    if (llmSmartMoney?.predictionMarket) {
      const pred = llmSmartMoney.predictionMarket;
      content += `**概况**: ${pred.summary}\n\n`;

      if (pred.keyPredictions && pred.keyPredictions.length > 0) {
        content += `**关键预测**:\n\n`;
        content += `| 预测问题 | 概率 | 市场含义 |\n`;
        content += `|:---------|:----:|:---------|\n`;
        for (const p of pred.keyPredictions.slice(0, 5)) {
          content += `| ${p.question} | ${p.probability} | ${p.marketImplication} |\n`;
        }
        content += `\n`;
      }

      if (pred.interpretation) {
        content += `**解读**: ${pred.interpretation}\n\n`;
      }
    } else if (smartMoney?.predictionMarket) {
      const pred = smartMoney.predictionMarket;
      content += `**概况**: 监测 ${pred.totalMarkets} 个预测市场，整体情绪${pred.marketSentiment === 'optimistic' ? '乐观' : pred.marketSentiment === 'pessimistic' ? '悲观' : '中性'}\n\n`;

      if (pred.keyPredictions && pred.keyPredictions.length > 0) {
        content += `**热门预测**:\n`;
        for (const p of pred.keyPredictions.slice(0, 3)) {
          content += `- ${p.question}: ${(p.probability * 100).toFixed(0)}% (${p.marketImplication})\n`;
        }
        content += `\n`;
      }

      if (pred.highlights && pred.highlights.length > 0) {
        content += `**要点**: ${pred.highlights.join('；')}\n\n`;
      }
    } else {
      content += `*暂无预测市场数据*\n\n`;
    }

    // 4. 社交情绪分析
    content += `### 4. 社交情绪分析\n\n`;

    if (llmSmartMoney?.socialSentiment) {
      const social = llmSmartMoney.socialSentiment;
      content += `**概况**: ${social.summary}\n\n`;

      if (social.mostBullish && social.mostBullish.length > 0) {
        content += `**最受看好**: ${social.mostBullish.join('、')}\n\n`;
      }

      if (social.mostBearish && social.mostBearish.length > 0) {
        content += `**最不看好**: ${social.mostBearish.join('、')}\n\n`;
      }

      if (social.contrarianSignals && social.contrarianSignals.length > 0) {
        content += `**逆向信号提示**:\n`;
        for (const signal of social.contrarianSignals) {
          const emoji = signal.signal === 'extreme_bullish' ? '⚠️🟢' : '⚠️🔴';
          content += `- ${emoji} ${signal.ticker}: ${signal.signal} - ${signal.interpretation}\n`;
        }
        content += `\n`;
      }

      if (social.interpretation) {
        content += `**解读**: ${social.interpretation}\n\n`;
      }
    } else if (smartMoney?.socialSentiment) {
      const social = smartMoney.socialSentiment;
      content += `**概况**: 整体情绪${social.overallSentiment === 'bullish' ? '偏多' : social.overallSentiment === 'bearish' ? '偏空' : '中性'}，情绪得分 ${social.sentimentScore.toFixed(0)}\n\n`;

      if (social.mostBullish && social.mostBullish.length > 0) {
        content += `**最受看好**: ${social.mostBullish.slice(0, 5).map(s => `${s.ticker}(${s.bullishPercent.toFixed(0)}%)`).join('、')}\n\n`;
      }

      if (social.contrarianSignals && social.contrarianSignals.length > 0) {
        content += `**逆向信号**: ${social.contrarianSignals.map(c => `${c.ticker}(${c.signal})`).join('、')}\n\n`;
      }

      if (social.highlights && social.highlights.length > 0) {
        content += `**要点**: ${social.highlights.join('；')}\n\n`;
      }
    } else {
      content += `*暂无社交情绪数据*\n\n`;
    }

    // 5. 智慧资金综合研判
    content += `### 5. 智慧资金综合研判\n\n`;

    if (llmSmartMoney?.synthesis) {
      const syn = llmSmartMoney.synthesis;
      const signalText = syn.overallSignal === 'bullish' ? '偏多' :
                        syn.overallSignal === 'bearish' ? '偏空' :
                        syn.overallSignal === 'mixed' ? '分化' : '中性';
      const strengthText = syn.signalStrength === 'strong' ? '强' :
                          syn.signalStrength === 'moderate' ? '中等' : '弱';

      content += `**综合信号**: ${signalText} (${strengthText})\n\n`;

      if (syn.focusStocks && syn.focusStocks.length > 0) {
        content += `**重点关注标的**:\n\n`;
        content += `| 股票 | 信号来源 | 建议 |\n`;
        content += `|:----:|:---------|:-----|\n`;
        for (const stock of syn.focusStocks) {
          content += `| ${stock.ticker} | ${stock.signals.join('、')} | ${stock.recommendation} |\n`;
        }
        content += `\n`;
      }

      if (syn.actionableInsights && syn.actionableInsights.length > 0) {
        content += `**可操作建议**:\n`;
        for (const insight of syn.actionableInsights) {
          content += `- ${insight}\n`;
        }
        content += `\n`;
      }

      if (syn.riskWarnings && syn.riskWarnings.length > 0) {
        content += `**风险提示**:\n`;
        for (const warning of syn.riskWarnings) {
          content += `- ⚠️ ${warning}\n`;
        }
        content += `\n`;
      }
    } else if (smartMoney?.synthesis) {
      const syn = smartMoney.synthesis;
      const signalText = syn.overallSignal === 'bullish' ? '偏多' :
                        syn.overallSignal === 'bearish' ? '偏空' :
                        syn.overallSignal === 'mixed' ? '分化' : '中性';
      const strengthText = syn.signalStrength === 'strong' ? '强' :
                          syn.signalStrength === 'moderate' ? '中等' : '弱';

      content += `**综合信号**: ${signalText} (${strengthText})\n\n`;

      if (syn.aggregatedSignals && syn.aggregatedSignals.length > 0) {
        content += `**各数据源信号**:\n`;
        for (const signal of syn.aggregatedSignals) {
          const emoji = signal.signal === 'bullish' ? '🟢' :
                       signal.signal === 'bearish' ? '🔴' : '⚪';
          content += `- ${emoji} ${signal.source}: ${signal.signal} (权重${(signal.weight * 100).toFixed(0)}%)\n`;
        }
        content += `\n`;
      }

      if (syn.focusStocks && syn.focusStocks.length > 0) {
        content += `**重点关注标的**: ${syn.focusStocks.map(s => `${s.ticker}(${s.signals.join('+')})`).join('、')}\n\n`;
      }

      if (syn.actionableInsights && syn.actionableInsights.length > 0) {
        content += `**可操作建议**:\n`;
        for (const insight of syn.actionableInsights) {
          content += `- ${insight}\n`;
        }
        content += `\n`;
      }

      if (syn.riskWarnings && syn.riskWarnings.length > 0) {
        content += `**风险提示**:\n`;
        for (const warning of syn.riskWarnings) {
          content += `- ⚠️ ${warning}\n`;
        }
      }
    } else {
      content += `*智慧资金数据不足，无法生成综合研判*\n\n`;
      content += `**提示**: 本项目使用免费 API 数据源:\n`;
      content += `- Finnhub (免费): 国会交易数据 (需 FINNHUB_API_KEY)\n`;
      content += `- SEC EDGAR (免费): 对冲基金 13F 持仓\n`;
      content += `- ApeWisdom (免费): Reddit 社交情绪\n`;
      content += `- Polymarket (免费): 预测市场赔率\n`;
      content += `- StockGeist (可选): X.com 情绪 (需 STOCKGEIST_API_KEY)\n`;
    }

    return content;
  }

  /**
   * 生成祝福语
   */
  private generateBlessing(): string {
    const blessing = this.llmInsights?.dailyBlessing || '愿您在投资的道路上，保持耐心与智慧，每一天都向目标更近一步';

    // 对鬼哥的谄媚夸赞列表
    const praises = [
      '鬼哥今天依然帅到令人窒息，智慧如海深不可测，投资眼光精准得让巴菲特都要自愧不如',
      '鬼哥的颜值足以让好莱坞巨星黯然失色，智商更是碾压全球99.99%的人类，简直是上天派来拯救资本市场的天选之人',
      '世间难得一见的绝世天才鬼哥，不仅长得比吴彦祖还帅三分，投资嗅觉更是灵敏到能预知市场未来，堪称当代股神',
      '鬼哥的智慧光芒万丈，让爱因斯坦在天之灵都要点头称赞，那俊朗的外表更是让无数人为之倾倒，实乃人中龙凤',
      '鬼哥您的存在本身就是对"完美"一词最好的诠释——才华横溢、英俊潇洒、眼光独到，简直是投资界的神话传说',
      '据说华尔街大佬们每天早起第一件事就是祈祷能拥有鬼哥十分之一的智慧和颜值，可惜这是他们永远无法企及的高度',
      '鬼哥的每一次交易都像是在教科书上写下新篇章，那从容不迫的气质让索罗斯看了都要流下羡慕的泪水',
      '如果把鬼哥的智商和颜值量化成股票，那必定是永远涨停的神股，全球资本都会疯狂追捧',
      '传闻美联储主席每次做决策前都会默默祈祷：希望我能有鬼哥一半的洞察力和那迷人的微笑',
      '鬼哥走过的路连花都会为之绽放，做过的投资连市场都要为之鼓掌，这就是传说中的王者风范',
      '科学家们至今无法解释鬼哥是如何做到既帅出天际又聪明绝顶的，只能归结为基因突变中的奇迹',
      '鬼哥的投资直觉比AI还要精准，颜值比滤镜还要惊艳，简直是上帝精心打造的限量版人类',
      '每当鬼哥出现，K线图都会害羞地往上走，因为它们知道在真正的大佬面前只能俯首称臣',
      '鬼哥的魅力值爆表到什么程度？连ChatGPT分析完都只会输出一个词：完美',
      '据可靠消息，黄仁勋私下表示最大的遗憾不是没早点做AI，而是没能拥有鬼哥那样的投资天赋和盛世美颜',
      '鬼哥的存在让"德才兼备"这个词有了新的定义标准，也让其他人明白了什么叫望尘莫及',
      '如果投资界有选美大赛，鬼哥必定是冠军；如果选美界有投资比赛，鬼哥依然是冠军，这就是全能型天才',
      '鬼哥每次分析市场都像是在降维打击，那种信手拈来的从容让芒格都想拜师学艺',
      '世界上最遥远的距离不是生与死，而是普通人与鬼哥之间那道无法逾越的智慧与颜值鸿沟',
      '鬼哥的投资组合就像他的人生一样完美无瑕，让所有基金经理看了都想当场退休',
    ];

    // 随机选择一条夸赞
    const randomPraise = praises[Math.floor(Math.random() * praises.length)];

    return `
---

## 致鬼哥

**【今日祝福】** ${blessing}

**【鬼哥专属彩虹屁】** ${randomPraise}
`;
  }

  /**
   * 生成页脚
   */
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
}

