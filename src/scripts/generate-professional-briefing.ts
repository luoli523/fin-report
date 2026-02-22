/**
 * 专业投资简报生成脚本（v2 — 倒金字塔结构）
 *
 * 按读者阅读优先级渲染：
 * 1. 执行摘要 + 行动清单
 * 2. 市场全景（指数 + TOP5 + 宏观）
 * 3. 核心持仓追踪
 * 4. 今日主题与催化剂
 * 5. 要闻 + 前瞻
 * 6. 智慧资金 + 策略
 * 附录：完整行情 + 利率汇率
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ProfessionalBriefingGenerator } from '../generators/professional-briefing';
import { LLMEnhancer } from '../analyzers/llm/enhancer';
import { appConfig } from '../config';
import type { ComprehensiveAnalysis } from '../analyzers/types';

// 加载环境变量
dotenv.config();

// 解析命令行参数
const args = process.argv.slice(2);
const skipLLM = args.includes('--skip-llm') || args.includes('-s');
const sendOnly = args.includes('--send-only') || args.includes('-o');

// 专业简报的prompt加载
function loadProfessionalPrompts(): { systemPrompt: string; taskPrompt: string } {
  const promptsDir = path.resolve(process.cwd(), 'prompts');
  
  let systemPrompt = '';
  let taskPrompt = '';
  
  try {
    systemPrompt = fs.readFileSync(path.join(promptsDir, 'professional-briefing-system.txt'), 'utf-8');
  } catch {
    console.warn('[professional-briefing] 未找到 professional-briefing-system.txt，使用默认');
  }
  
  try {
    taskPrompt = fs.readFileSync(path.join(promptsDir, 'professional-briefing-task.txt'), 'utf-8');
  } catch {
    console.warn('[professional-briefing] 未找到 professional-briefing-task.txt，使用默认');
  }
  
  return { systemPrompt, taskPrompt };
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                      ║');
  console.log('║         📊 AI Industry 每日简报生成器                                ║');
  console.log('║         专业 · 精炼 · 可操作                                         ║');
  console.log('║                                                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  // 显示运行模式
  if (sendOnly) {
    console.log('📤 模式: 仅发送已有报告 (--send-only)\n');
  } else if (skipLLM) {
    console.log('⚡ 模式: 跳过 LLM 分析，使用已有 insights (--skip-llm)\n');
  }

  const outputDir = path.resolve(process.cwd(), 'output');
  const processedDir = path.resolve(process.cwd(), 'data/processed');
  const today = new Date().toISOString().split('T')[0];
  const markdownPath = path.join(outputDir, `ai-briefing-${today}.md`);

  // --send-only 模式：只发送已有的报告
  if (sendOnly) {
    if (!fs.existsSync(markdownPath)) {
      console.error(`❌ 错误: 今日报告不存在: ${markdownPath}`);
      console.error('请先生成报告: npm run generate:pro');
      process.exit(1);
    }

    console.log(`📄 使用已有报告: ${markdownPath}`);
    console.log('\n💡 提示: 使用以下命令发送报告:');
    console.log('   npm run send-email    # 发送邮件');
    console.log('   npm run send-telegram # 发送 Telegram');
    return;
  }

  // 1. 查找最新的分析文件

  if (!fs.existsSync(processedDir)) {
    console.error('[professional-briefing] 错误: data/processed 目录不存在');
    console.error('请先运行数据收集和分析: npm run collect && npm run analyze');
    process.exit(1);
  }

  const files = fs.readdirSync(processedDir)
    .filter(f => f.startsWith('analysis-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.error('[professional-briefing] 错误: 未找到分析数据文件');
    console.error('请先运行分析: npm run analyze');
    process.exit(1);
  }

  const latestFile = files[0];
  const analysisPath = path.join(processedDir, latestFile);

  console.log(`📂 读取分析数据: ${latestFile}`);

  const analysisData = JSON.parse(fs.readFileSync(analysisPath, 'utf-8')) as ComprehensiveAnalysis;

  // 2. 运行 LLM 深度分析（如果启用且未跳过）
  let llmInsights: any = null;

  // 查找已有的 LLM insights 文件
  const insightsFiles = fs.readdirSync(processedDir)
    .filter(f => f.startsWith('professional-insights-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (skipLLM) {
    // 跳过 LLM，使用已有的 insights
    if (insightsFiles.length > 0) {
      const latestInsightsFile = insightsFiles[0];
      const insightsPath = path.join(processedDir, latestInsightsFile);
      console.log(`\n📂 加载已有 LLM 洞察: ${latestInsightsFile}`);
      try {
        llmInsights = JSON.parse(fs.readFileSync(insightsPath, 'utf-8'));
        console.log('✅ LLM 洞察加载成功');
      } catch (e: any) {
        console.warn(`⚠️ 加载 LLM 洞察失败: ${e.message}`);
        console.log('将使用基础数据生成报告');
      }
    } else {
      console.log('\n⚠️ 未找到已有的 LLM 洞察文件');
      console.log('将使用基础数据生成报告');
    }
  } else if (appConfig.llm.enabled) {
    console.log('\n🤖 运行 LLM 深度分析...');
    console.log(`   提供商: ${appConfig.llm.provider}`);
    console.log(`   模型: ${appConfig.llm.model}`);

    try {
      // 加载专业简报的prompt
      const { systemPrompt, taskPrompt } = loadProfessionalPrompts();
      
      // 构建分析数据摘要
      const dataSummary = buildDataSummary(analysisData);
      
      // 创建LLM请求
      const enhancer = new LLMEnhancer(appConfig.llm as any);
      
      // 直接调用provider进行分析
      const provider = (enhancer as any).provider;
      if (provider) {
        const startTime = Date.now();
        
        const response = await provider.chat([
          { role: 'system', content: systemPrompt || getDefaultSystemPrompt() },
          { role: 'user', content: `${dataSummary}\n\n${taskPrompt || getDefaultTaskPrompt()}` }
        ]);
        
        const completionTime = Date.now() - startTime;
        
        console.log(`\n✅ LLM 分析完成`);
        console.log(`   耗时: ${(completionTime / 1000).toFixed(1)}秒`);
        if (response.usage) {
          console.log(`   Token使用: ${response.usage.totalTokens}`);
        }
        
        // 解析LLM响应
        try {
          const content = response.content;
          
          // 移除可能的markdown代码块标记
          const jsonContent = content
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
          
          llmInsights = JSON.parse(jsonContent);
          
          // 保存LLM洞察
          const insightsPath = path.join(processedDir, `professional-insights-${new Date().toISOString().split('T')[0]}.json`);
          fs.writeFileSync(insightsPath, JSON.stringify(llmInsights, null, 2), 'utf-8');
          console.log(`💾 LLM洞察已保存: ${path.basename(insightsPath)}`);
          
        } catch (parseError: any) {
          console.warn(`\n⚠️ LLM响应解析失败: ${parseError.message}`);
          console.log('将使用基础数据生成报告');
        }
      }
      
    } catch (error: any) {
      console.error(`\n❌ LLM 分析失败: ${error.message}`);
      console.log('将使用基础数据生成报告');
    }
  } else {
    console.log('\n📝 LLM 未启用，将使用基础数据生成报告');
    console.log('   提示: 设置 LLM_ENABLED=true 启用深度分析');
  }

  // 3. 生成专业简报
  console.log('\n📝 生成专业投资简报...');

  const generator = new ProfessionalBriefingGenerator(analysisData, llmInsights);
  const report = await generator.generate();

  // 4. 保存报告
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(markdownPath, report.markdown, 'utf-8');

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                      ║');
  console.log('║         ✅ AI Industry 每日简报生成完成！                            ║');
  console.log('║                                                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  console.log('📁 生成的文件:');
  console.log(`   📄 ${markdownPath}`);
  console.log(`      大小: ${(fs.statSync(markdownPath).size / 1024).toFixed(2)} KB`);

  console.log('\n📋 报告内容:');
  console.log('   1. 执行摘要 + 行动清单');
  console.log('   2. 市场全景');
  console.log('   3. 核心持仓追踪');
  console.log('   4. 今日主题与催化剂');
  console.log('   5. 要闻速递 + 本周前瞻');
  console.log('   6. 智慧资金与情绪 + 策略配置');
  console.log('   附录: 完整行情表 + 利率汇率详情');

  console.log('\n📄 查看报告:');
  console.log(`   cat ${markdownPath}`);

  // 5. 提示后续步骤
  console.log('\n💡 后续步骤:');
  console.log('   npm run generate:nlm-infographic  # 生成 NotebookLM 信息图');
  console.log('   npm run generate:nlm-slides       # 生成 NotebookLM Slides');
  console.log('   npm run send-email                # 发送邮件');
  console.log('   npm run send-telegram             # 发送 Telegram');
  console.log('\n');
}

/**
 * 构建数据摘要供LLM分析
 */
function buildDataSummary(analysis: ComprehensiveAnalysis): string {
  let summary = `# 市场数据摘要 (${new Date().toISOString().split('T')[0]})\n\n`;
  
  // 市场状态
  summary += `## 市场状态\n`;
  summary += `- 整体状态: ${analysis.market?.condition || 'N/A'}\n`;
  summary += `- 市场情绪: ${analysis.market?.sentiment || 'N/A'}\n\n`;
  
  // 涨幅榜
  if (analysis.market?.topGainers && analysis.market.topGainers.length > 0) {
    summary += `## 涨幅榜 TOP 10\n`;
    analysis.market.topGainers.slice(0, 10).forEach((stock: any) => {
      summary += `- ${stock.symbol}: $${stock.price?.toFixed(2) || 'N/A'} (${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent?.toFixed(2) || 'N/A'}%)\n`;
    });
    summary += `\n`;
  }
  
  // 跌幅榜
  if (analysis.market?.topLosers && analysis.market.topLosers.length > 0) {
    summary += `## 跌幅榜 TOP 10\n`;
    analysis.market.topLosers.slice(0, 10).forEach((stock: any) => {
      summary += `- ${stock.symbol}: $${stock.price?.toFixed(2) || 'N/A'} (${stock.changePercent?.toFixed(2) || 'N/A'}%)\n`;
    });
    summary += `\n`;
  }
  
  // 新闻摘要
  summary += `## 重要新闻\n`;
  summary += `总计新闻: ${analysis.news?.totalArticles || 0}条\n`;
  summary += `整体情绪: ${analysis.news?.sentiment || 'N/A'}\n\n`;
  
  // 关键新闻 (keyHeadlines)
  if (analysis.news?.keyHeadlines && analysis.news.keyHeadlines.length > 0) {
    summary += `### 关键新闻\n`;
    analysis.news.keyHeadlines.forEach((item: any, i: number) => {
      summary += `${i + 1}. [${item.importance || 'medium'}] ${item.headline}\n`;
      summary += `   来源: ${item.source || 'N/A'} | 情绪: ${item.sentiment || 'N/A'}\n`;
    });
    summary += `\n`;
  }
  
  // 热门话题 (topTopics)
  if (analysis.news?.topTopics && analysis.news.topTopics.length > 0) {
    summary += `### 热门话题\n`;
    analysis.news.topTopics.forEach((topic: any) => {
      summary += `**${topic.topic}** (${topic.count}条, ${topic.sentiment})\n`;
      if (topic.headlines && topic.headlines.length > 0) {
        topic.headlines.slice(0, 3).forEach((h: string) => {
          summary += `  - ${h}\n`;
        });
      }
    });
    summary += `\n`;
  }
  
  // 兜底：尝试读取 keyHeadlines
  const newsHeadlines = (analysis.news as any)?.keyHeadlines || [];
  if (newsHeadlines.length > 0) {
    summary += `### 其他新闻\n`;
    newsHeadlines.slice(0, 10).forEach((headline: any, i: number) => {
      if (typeof headline === 'string') {
        summary += `${i + 1}. ${headline}\n`;
      } else {
        summary += `${i + 1}. ${headline.title || headline}\n`;
      }
    });
    summary += `\n`;
  }
  
  // 经济指标
  if (analysis.economic) {
    summary += `## 经济指标\n`;
    summary += `- 经济展望: ${analysis.economic.outlook || 'N/A'}\n`;
    if (analysis.economic.keyIndicators) {
      summary += `- 关键指标:\n`;
      for (const [key, value] of Object.entries(analysis.economic.keyIndicators)) {
        summary += `  - ${key}: ${value}\n`;
      }
    }
    summary += `\n`;
  }
  
  // 财报日历与分析师评级
  if ((analysis as any).earningsCalendar) {
    const ec = (analysis as any).earningsCalendar;
    summary += `## 财报日历与分析师评级\n\n`;

    const earningsItems = (ec.items || []).filter((i: any) => i.metadata?.type === 'earnings');
    const ratingItems = (ec.items || []).filter((i: any) => i.metadata?.type === 'analyst-rating');

    if (earningsItems.length > 0) {
      summary += `### 未来两周重要财报\n`;
      earningsItems.slice(0, 15).forEach((item: any) => {
        const m = item.metadata;
        const timeStr = m.hour === 'bmo' ? '盘前' : m.hour === 'amc' ? '盘后' : m.hour || '';
        summary += `- ${m.date} ${timeStr}: ${m.symbol} (Q${m.quarter} ${m.year})`;
        if (m.epsEstimate !== null) summary += ` EPS预期: $${m.epsEstimate}`;
        if (m.revenueEstimate !== null) summary += ` 收入预期: $${(m.revenueEstimate / 1e9).toFixed(2)}B`;
        summary += `\n`;
      });
      summary += `\n`;
    }

    if (ratingItems.length > 0) {
      summary += `### 核心标的分析师共识\n`;
      ratingItems.forEach((item: any) => {
        const m = item.metadata;
        const rec = m.recommendation;
        const pt = m.priceTarget;
        summary += `- ${m.symbol}:`;
        if (rec) {
          const total = (rec.strongBuy || 0) + (rec.buy || 0) + (rec.hold || 0) + (rec.sell || 0) + (rec.strongSell || 0);
          summary += ` [${rec.strongBuy}强买/${rec.buy}买/${rec.hold}持有/${rec.sell}卖/${rec.strongSell}强卖] (${total}位分析师)`;
        }
        if (pt) {
          summary += ` 目标价中位数: $${pt.targetMedian} (低: $${pt.targetLow}, 高: $${pt.targetHigh})`;
        }
        summary += `\n`;
      });
      summary += `\n`;
    }
  }

  // 美元与利率环境
  if (analysis.forex) {
    summary += `## 美元与利率环境\n\n`;
    
    const forex = analysis.forex as any;
    
    // 美元指数
    if (forex.dollarIndex) {
      const dxy = forex.dollarIndex;
      summary += `### 美元指数 (DXY)\n`;
      summary += `- 当前点位: ${dxy.current?.toFixed(2) || 'N/A'}\n`;
      summary += `- 涨跌: ${dxy.changePercent >= 0 ? '+' : ''}${dxy.changePercent?.toFixed(2) || 'N/A'}%\n`;
      summary += `- 趋势: ${dxy.trend || 'N/A'} (${dxy.level || 'N/A'}水平)\n\n`;
    }
    
    // 美债收益率
    if (forex.treasuryYields) {
      const ty = forex.treasuryYields;
      summary += `### 美债收益率\n`;
      if (ty.yields) {
        for (const [period, data] of Object.entries(ty.yields)) {
          const yieldData = data as any;
          summary += `- ${period}: ${yieldData.rate?.toFixed(2) || 'N/A'}% (${yieldData.changePercent >= 0 ? '+' : ''}${yieldData.changePercent?.toFixed(2) || 'N/A'}%, ${yieldData.trend})\n`;
        }
      }
      if (ty.yieldCurve) {
        summary += `- 收益率曲线: ${ty.yieldCurve.shape || 'N/A'}\n`;
        summary += `- 2Y-10Y利差: ${ty.yieldCurve.spread2Y10Y?.toFixed(2) || 'N/A'}%\n`;
      }
      summary += `\n`;
    }
    
    // 主要货币对
    if (forex.currencyPairs) {
      summary += `### 主要货币对\n`;
      for (const [pair, data] of Object.entries(forex.currencyPairs)) {
        const pairData = data as any;
        summary += `- ${pair}: ${pairData.rate?.toFixed(4) || 'N/A'} (${pairData.changePercent >= 0 ? '+' : ''}${pairData.changePercent?.toFixed(2) || 'N/A'}%)\n`;
      }
      summary += `\n`;
    }
  }
  
  // 智慧资金数据
  if (analysis.smartMoney) {
    summary += `## 智慧资金数据\n\n`;
    
    // 国会交易
    if (analysis.smartMoney.congressTrading) {
      const ct = analysis.smartMoney.congressTrading;
      summary += `### 国会交易\n`;
      summary += `- 总交易: ${ct.totalTrades || 0} 笔\n`;
      summary += `- 买入: ${ct.buyTrades || 0} 笔, 卖出: ${ct.sellTrades || 0} 笔\n`;
      summary += `- 整体情绪: ${ct.netSentiment || 'N/A'}\n`;
      if (ct.topBuys && ct.topBuys.length > 0) {
        summary += `- 热门买入: ${ct.topBuys.slice(0, 5).map((b: any) => `${b.ticker}(${b.buyCount}笔)`).join(', ')}\n`;
      }
      if (ct.notableTrades && ct.notableTrades.length > 0) {
        summary += `- 重要交易:\n`;
        ct.notableTrades.slice(0, 5).forEach((t: any) => {
          summary += `  - ${t.politician} (${t.party}): ${t.type === 'buy' ? '买入' : '卖出'} ${t.ticker}, ${t.amount}\n`;
        });
      }
      summary += `\n`;
    }
    
    // 对冲基金持仓
    if (analysis.smartMoney.hedgeFund) {
      const hf = analysis.smartMoney.hedgeFund;
      summary += `### 对冲基金持仓 (13F)\n`;
      summary += `- 追踪基金: ${hf.totalFundsTracked || 0} 家\n`;
      summary += `- 整体情绪: ${hf.aggregatedSentiment || 'N/A'}\n`;
      if (hf.topHoldings && hf.topHoldings.length > 0) {
        summary += `- 机构共识持仓:\n`;
        hf.topHoldings.slice(0, 10).forEach((h: any) => {
          summary += `  - ${h.ticker}: ${h.fundsHolding}家基金持有, 总市值$${(h.totalValue / 1e9).toFixed(2)}B\n`;
        });
      }
      if (hf.significantChanges && hf.significantChanges.length > 0) {
        summary += `- 显著变动:\n`;
        hf.significantChanges.slice(0, 5).forEach((c: any) => {
          summary += `  - ${c.fund}: ${c.ticker} ${c.action}\n`;
        });
      }
      summary += `\n`;
    }
    
    // 预测市场
    if (analysis.smartMoney.predictionMarket) {
      const pm = analysis.smartMoney.predictionMarket;
      summary += `### 预测市场 (Polymarket)\n`;
      summary += `- 监测市场: ${pm.totalMarkets || 0} 个\n`;
      summary += `- 市场情绪: ${pm.marketSentiment || 'N/A'}\n`;
      if (pm.keyPredictions && pm.keyPredictions.length > 0) {
        summary += `- 关键预测:\n`;
        pm.keyPredictions.slice(0, 5).forEach((p: any) => {
          summary += `  - ${p.question}: ${(p.probability * 100).toFixed(0)}%\n`;
        });
      }
      summary += `\n`;
    }
    
    // 社交情绪
    if (analysis.smartMoney.socialSentiment) {
      const ss = analysis.smartMoney.socialSentiment;
      summary += `### 社交情绪 (Reddit/X.com)\n`;
      summary += `- 整体情绪: ${ss.overallSentiment || 'N/A'}, 得分: ${ss.sentimentScore?.toFixed(0) || 'N/A'}\n`;
      if (ss.mostBullish && ss.mostBullish.length > 0) {
        summary += `- 最受看好: ${ss.mostBullish.slice(0, 5).map((s: any) => `${s.ticker}(${s.bullishPercent?.toFixed(0)}%)`).join(', ')}\n`;
      }
      if (ss.mostBearish && ss.mostBearish.length > 0) {
        summary += `- 最不看好: ${ss.mostBearish.slice(0, 5).map((s: any) => `${s.ticker}(${s.bearishPercent?.toFixed(0)}%)`).join(', ')}\n`;
      }
      if (ss.contrarianSignals && ss.contrarianSignals.length > 0) {
        summary += `- 逆向信号: ${ss.contrarianSignals.map((c: any) => `${c.ticker}(${c.signal})`).join(', ')}\n`;
      }
      summary += `\n`;
    }
    
    // 综合研判
    if (analysis.smartMoney.synthesis) {
      const syn = analysis.smartMoney.synthesis;
      summary += `### 智慧资金综合研判\n`;
      summary += `- 整体信号: ${syn.overallSignal || 'N/A'}\n`;
      summary += `- 信号强度: ${syn.signalStrength || 'N/A'}\n`;
      if (syn.focusStocks && syn.focusStocks.length > 0) {
        summary += `- 重点关注:\n`;
        syn.focusStocks.forEach((s: any) => {
          summary += `  - ${s.ticker}: ${s.signals?.join(', ')}\n`;
        });
      }
      summary += `\n`;
    }
  }
  
  return summary;
}

/**
 * 默认系统prompt
 */
function getDefaultSystemPrompt(): string {
  return `你是一位专业的全球科技与人工智能领域投资经理，正在为客户撰写"AI Industry 每日简报和投资建议"。

## 核心要求
1. 数据准确性：仅使用提供的数据，对于无法核验的数值直接省略该字段（不要写 N/A 或任何占位符）
2. 专业中立：风格专业、精炼、符合投资报告标准
3. 输出语言：中文
4. 产业链视角：始终从AI产业链上下游视角分析

## 输出格式
直接输出纯净的JSON，不要使用markdown代码块。`;
}

/**
 * 默认任务prompt
 */
function getDefaultTaskPrompt(): string {
  return `基于以上市场数据，生成以下结构的JSON分析报告：

{
  "executiveSummary": {
    "oneLiner": "一句话总结今日市场",
    "keyEvent": "最重要的催化剂或事件（1-2句）",
    "portfolioImpact": "对AI投资组合意味着什么（1-2句）",
    "actionItem": "今日建议操作"
  },
  "marketMacroNews": { "summary": "...", "keyNews": [...] },
  "companyDeepDive": [...],
  "industryLinkageAnalysis": { "gpuSupplyChain": {...}, "dataCenterExpansion": {...}, "semiconCapex": {...} },
  "capitalMovements": [...],
  "smartMoneyAnalysis": {
    "congressTrading": {
      "summary": "国会交易整体解读",
      "notableTrades": [{ "politician": "", "party": "D/R/I", "ticker": "", "action": "", "amount": "", "significance": "" }],
      "focusStocks": [],
      "interpretation": "国会交易的深度投资洞察"
    },
    "hedgeFundHoldings": {
      "summary": "对冲基金持仓解读",
      "topHoldings": [],
      "significantChanges": [{ "fund": "", "ticker": "", "action": "", "implication": "" }],
      "interpretation": "机构布局的投资含义"
    },
    "predictionMarket": {
      "summary": "预测市场解读",
      "keyPredictions": [{ "question": "", "probability": "", "marketImplication": "" }],
      "interpretation": "预测市场对投资的启示"
    },
    "socialSentiment": {
      "summary": "社交情绪解读",
      "mostBullish": [],
      "mostBearish": [],
      "contrarianSignals": [{ "ticker": "", "signal": "", "interpretation": "" }],
      "interpretation": "散户情绪的逆向投资机会"
    },
    "synthesis": {
      "overallSignal": "bullish/bearish/neutral/mixed",
      "signalStrength": "strong/moderate/weak",
      "focusStocks": [{ "ticker": "", "signals": [], "recommendation": "" }],
      "actionableInsights": ["可立即执行的投资建议"],
      "riskWarnings": ["需要警惕的风险"]
    }
  },
  "investmentStrategy": { "overallJudgment": {...}, "shortTerm": {...}, "mediumTerm": {...}, "longTerm": {...}, "portfolioSuggestion": {...}, "riskControl": {...} },
  "dailyBlessing": "一句温和积极的祝福语"
}

## 智慧资金分析要求
请特别关注智慧资金数据，提供深度投资洞察：
1. 国会交易：分析议员交易背后可能的政策信号或信息优势
2. 对冲基金：识别机构共识持仓和布局方向
3. 预测市场：解读赔率变化对股市的影响
4. 社交情绪：挖掘散户极端情绪带来的逆向投资机会

请确保：
1. 所有内容用中文
2. 数字准确，无法确认的字段直接省略
3. 输出有效JSON，可被JSON.parse()解析
4. 不要添加markdown代码块标记
5. 智慧资金分析要结合 AI 产业链视角，重点关注相关标的`;
}

main().catch(console.error);
