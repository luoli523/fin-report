/**
 * 对冲基金持仓数据收集器
 *
 * 数据源: SEC EDGAR (免费公开数据)
 * - 13F 季度持仓报告
 * - 无需 API Key
 *
 * 备注: 13F 报告每季度提交一次，数据有滞后性
 */

import { BaseCollector } from './base';
import {
  CollectedData,
  HedgeFundHolding,
  HedgeFundConfig,
} from './types';
import { appConfig, getStockSymbols } from '../config/index';

// SEC EDGAR 13F XML 持仓结构
interface SEC13FHolding {
  nameOfIssuer: string;
  titleOfClass: string;
  cusip: string;
  value: number;          // 市值 (千美元)
  shrsOrPrnAmt: number;   // 持股数量
  putCall?: string;       // PUT/CALL (期权)
  investmentDiscretion: string;
  votingAuthority: {
    sole: number;
    shared: number;
    none: number;
  };
}

/**
 * 对冲基金持仓收集器 (使用 SEC EDGAR 公开数据)
 */
export class HedgeFundCollector extends BaseCollector<HedgeFundConfig> {
  readonly name = 'hedge-fund';
  readonly description = 'Hedge fund 13F holdings data collector via SEC EDGAR';

  private readonly edgarBaseUrl = 'https://data.sec.gov';
  private readonly secUserAgent = appConfig.sec?.userAgent || 'FinanceBriefingAgent/1.0 (contact@example.com)';

  // 知名对冲基金 CIK 列表
  private readonly notableFunds: { name: string; cik: string }[] = [
    { name: 'Berkshire Hathaway', cik: '0001067983' },
    { name: 'Bridgewater Associates', cik: '0001350694' },
    { name: 'Renaissance Technologies', cik: '0001037389' },
    { name: 'Citadel Advisors', cik: '0001423053' },
    { name: 'Two Sigma Investments', cik: '0001179392' },
    { name: 'D.E. Shaw', cik: '0001009207' },
    { name: 'Tiger Global Management', cik: '0001167483' },
    { name: 'Coatue Management', cik: '0001535392' },
    { name: 'Viking Global Investors', cik: '0001103804' },
    { name: 'Pershing Square Capital', cik: '0001336528' },
    { name: 'Appaloosa Management', cik: '0000932628' },
    { name: 'Greenlight Capital', cik: '0001079114' },
    { name: 'Soros Fund Management', cik: '0001029160' },
    { name: 'Third Point', cik: '0001040273' },
    { name: 'Elliott Investment Management', cik: '0001048445' },
  ];

  // CUSIP 到股票代码映射 (AI 产业链 + 主要科技股)
  private readonly cusipToTicker: Record<string, { ticker: string; name: string }> = {
    // GPU/加速与半导体
    '67066G104': { ticker: 'NVDA', name: 'NVIDIA Corp' },
    '007903107': { ticker: 'AMD', name: 'Advanced Micro Devices' },
    '11135F101': { ticker: 'AVGO', name: 'Broadcom Inc' },
    '87612E106': { ticker: 'QCOM', name: 'Qualcomm Inc' },
    '55354G100': { ticker: 'MU', name: 'Micron Technology' },
    'G0402G103': { ticker: 'ARM', name: 'ARM Holdings' },
    '958102105': { ticker: 'WDC', name: 'Western Digital' },
    '81180W104': { ticker: 'STX', name: 'Seagate Technology' },
    // 晶圆与制造
    '874039100': { ticker: 'TSM', name: 'Taiwan Semiconductor' },
    'N07059210': { ticker: 'ASML', name: 'ASML Holding' },
    // 设备/EDA
    '038222105': { ticker: 'AMAT', name: 'Applied Materials' },
    '512807108': { ticker: 'LRCX', name: 'Lam Research' },
    '482480100': { ticker: 'KLAC', name: 'KLA Corporation' },
    '871607107': { ticker: 'SNPS', name: 'Synopsys Inc' },
    '127387108': { ticker: 'CDNS', name: 'Cadence Design Systems' },
    // 服务器与基础设施
    '86800U104': { ticker: 'SMCI', name: 'Super Micro Computer' },
    '24703L202': { ticker: 'DELL', name: 'Dell Technologies' },
    '42824C109': { ticker: 'HPE', name: 'Hewlett Packard Enterprise' },
    '04342Y104': { ticker: 'ANET', name: 'Arista Networks' },
    '92537N108': { ticker: 'VRT', name: 'Vertiv Holdings' },
    '278058102': { ticker: 'ETN', name: 'Eaton Corporation' },
    // 云与平台
    '594918104': { ticker: 'MSFT', name: 'Microsoft Corp' },
    '023135106': { ticker: 'AMZN', name: 'Amazon.com Inc' },
    '02079K305': { ticker: 'GOOGL', name: 'Alphabet Inc Class A' },
    '02079K107': { ticker: 'GOOG', name: 'Alphabet Inc Class C' },
    '68389X105': { ticker: 'ORCL', name: 'Oracle Corp' },
    // 应用与软件
    '30303M102': { ticker: 'META', name: 'Meta Platforms Inc' },
    '00724F101': { ticker: 'ADBE', name: 'Adobe Inc' },
    '79466L302': { ticker: 'CRM', name: 'Salesforce Inc' },
    '81762P102': { ticker: 'NOW', name: 'ServiceNow Inc' },
    '833445109': { ticker: 'SNOW', name: 'Snowflake Inc' },
    '23804L103': { ticker: 'DDOG', name: 'Datadog Inc' },
    '69608A108': { ticker: 'PLTR', name: 'Palantir Technologies' },
    // 自动驾驶/机器人
    '88160R101': { ticker: 'TSLA', name: 'Tesla Inc' },
    'M6082J104': { ticker: 'MBLY', name: 'Mobileye Global' },
    // 数据中心能源
    '92840M102': { ticker: 'VST', name: 'Vistra Corp' },
    '21037T109': { ticker: 'CEG', name: 'Constellation Energy' },
    // 其他重要标的
    '037833100': { ticker: 'AAPL', name: 'Apple Inc' },
    '458140100': { ticker: 'INTC', name: 'Intel Corp' },
    '56585A102': { ticker: 'MRVL', name: 'Marvell Technology' },
    '58933Y105': { ticker: 'LLY', name: 'Eli Lilly' },
    '46625H100': { ticker: 'JPM', name: 'JPMorgan Chase' },
    '00206R102': { ticker: 'T', name: 'AT&T Inc' },
    // Mega-cap tech & ETFs (often in 13F top holdings)
    '78462F103': { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust' },
    '46090E103': { ticker: 'IVV', name: 'iShares Core S&P 500 ETF' },
    '084670702': { ticker: 'BRK.B', name: 'Berkshire Hathaway B' },
    '92826C839': { ticker: 'V', name: 'Visa Inc' },
    '57636Q104': { ticker: 'MA', name: 'Mastercard Inc' },
    '91324P102': { ticker: 'UNH', name: 'UnitedHealth Group' },
  };

  constructor(config: Partial<HedgeFundConfig> = {}) {
    super({
      enabled: true,
      topFunds: config.topFunds ?? 10,
      ...config,
    });
  }

  async collect(): Promise<CollectedData> {
    this.log('Starting hedge fund holdings collection via SEC EDGAR...');

    const holdings: HedgeFundHolding[] = [];

    try {
      // 获取知名基金的最新 13F 持仓
      const fundsToFetch = this.notableFunds.slice(0, this.config.topFunds || 10);

      for (const fund of fundsToFetch) {
        try {
          const fundHoldings = await this.fetchFundHoldings(fund);
          holdings.push(...fundHoldings);
          this.log(`✓ ${fund.name}: ${fundHoldings.length} holdings`);

          // 避免速率限制 (SEC 限制 10 requests/second)
          await this.delay(200);
        } catch (error) {
          this.logError(`Failed to fetch holdings for ${fund.name}`, error as Error);
        }
      }

      this.log(`Collected ${holdings.length} total holdings`);

      // 保存原始数据
      if (this.config.saveRaw) {
        await this.saveRawData({ holdings });
      }

    } catch (error) {
      this.logError('Failed to fetch hedge fund data', error as Error);
      return this.createEmptyResult((error as Error).message);
    }

    // 过滤我们监控的股票（如果配置了）
    let filteredHoldings = holdings;
    if (this.config.filterSymbols && this.config.filterSymbols.length > 0) {
      const symbolSet = new Set(this.config.filterSymbols);
      filteredHoldings = holdings.filter(h => symbolSet.has(h.ticker));
    }

    // 按市值排序
    filteredHoldings.sort((a, b) => b.value - a.value);

    const result: CollectedData = {
      source: this.name,
      type: 'hedge-fund',
      collectedAt: new Date(),
      items: filteredHoldings.slice(0, 100).map(holding => ({
        id: `${holding.fundName}-${holding.ticker}`,
        title: `${holding.fundName} 持有 ${holding.ticker}`,
        content: this.formatHoldingContent(holding),
        timestamp: holding.filingDate,
        metadata: {
          fundName: holding.fundName,
          ticker: holding.ticker,
          company: holding.company,
          shares: holding.shares,
          value: holding.value,
          reportDate: holding.reportDate,
        },
      })),
      metadata: {
        totalHoldings: filteredHoldings.length,
        uniqueFunds: new Set(filteredHoldings.map(h => h.fundName)).size,
        uniqueStocks: new Set(filteredHoldings.map(h => h.ticker)).size,
        topHoldings: this.aggregateTopHoldings(filteredHoldings),
        source: 'SEC EDGAR 13F',
      },
    };

    // 保存处理后的数据
    await this.saveProcessedData(result);

    return result;
  }

  /**
   * 获取基金的最新持仓
   */
  private async fetchFundHoldings(fund: { name: string; cik: string }): Promise<HedgeFundHolding[]> {
    const holdings: HedgeFundHolding[] = [];

    try {
      // Step 1: 获取基金的提交历史
      const filingUrl = `${this.edgarBaseUrl}/submissions/CIK${fund.cik}.json`;

      const response = await fetch(filingUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': this.secUserAgent,
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as {
        filings?: {
          recent?: {
            form: string[];
            accessionNumber: string[];
            filingDate: string[];
            reportDate?: string[];
            primaryDocument?: string[];
          };
        };
      };

      // Step 2: 查找最新的 13F-HR 提交
      const filings = data.filings?.recent;
      if (!filings || !filings.form) return [];

      let latestIndex = -1;
      for (let i = 0; i < filings.form.length; i++) {
        if (filings.form[i] === '13F-HR' || filings.form[i] === '13F-HR/A') {
          latestIndex = i;
          break;
        }
      }

      if (latestIndex === -1) return [];

      const accessionNumber = filings.accessionNumber[latestIndex];
      const filingDate = filings.filingDate[latestIndex];
      const reportDate = filings.reportDate?.[latestIndex] || filingDate;

      // Step 3: 构建 13F 信息表文件 URL
      // 格式: https://www.sec.gov/Archives/edgar/data/{cik}/{accession}/infotable.xml
      const accessionClean = accessionNumber.replace(/-/g, '');
      const cikNum = fund.cik.replace(/^0+/, ''); // 去除前导零

      // 尝试不同的文件名格式
      const possibleFileNames = [
        'infotable.xml',
        'InfoTable.xml',
        'primary_doc.xml',
        `${accessionClean}-infotable.xml`,
      ];

      let xmlContent: string | null = null;

      for (const fileName of possibleFileNames) {
        try {
          const xmlUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accessionClean}/${fileName}`;
          const xmlResponse = await fetch(xmlUrl, {
            headers: {
              'Accept': 'application/xml',
              'User-Agent': this.secUserAgent,
            },
            signal: AbortSignal.timeout(15000),
          });

          if (xmlResponse.ok) {
            xmlContent = await xmlResponse.text();
            break;
          }
        } catch {
          // 继续尝试下一个文件名
        }
        await this.delay(100);
      }

      if (!xmlContent) {
        this.log(`  No XML found for ${fund.name}, trying index page...`);
        // 尝试从 filing 索引页获取
        const indexUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cikNum}&type=13F&dateb=&owner=include&count=1&search_text=`;
        return [];
      }

      // Step 4: 解析 XML 获取持仓
      const parsedHoldings = this.parse13FXML(xmlContent, fund.name, filingDate, reportDate);
      holdings.push(...parsedHoldings);

    } catch (error) {
      this.logError(`Failed to fetch ${fund.name}`, error as Error);
    }

    return holdings;
  }

  /**
   * 解析 13F XML 内容
   */
  private parse13FXML(
    xmlContent: string,
    fundName: string,
    filingDate: string,
    reportDate: string
  ): HedgeFundHolding[] {
    const holdings: HedgeFundHolding[] = [];

    try {
      // 使用正则表达式解析 XML (避免引入额外依赖)
      // 查找所有 infoTable 条目
      const infoTableRegex = /<infoTable[^>]*>([\s\S]*?)<\/infoTable>/gi;
      const matches = xmlContent.matchAll(infoTableRegex);

      for (const match of matches) {
        const entry = match[1];

        // 提取字段
        const nameOfIssuer = this.extractXMLValue(entry, 'nameOfIssuer');
        const titleOfClass = this.extractXMLValue(entry, 'titleOfClass');
        const cusip = this.extractXMLValue(entry, 'cusip');
        const valueStr = this.extractXMLValue(entry, 'value');
        const shrsOrPrnamtStr = this.extractXMLValue(entry, 'sshPrnamt') || 
                               this.extractXMLValue(entry, 'shrsOrPrnamt');

        if (!cusip || !valueStr) continue;

        const value = parseFloat(valueStr) * 1000; // 转换为美元 (原单位是千美元)
        const shares = parseInt(shrsOrPrnamtStr || '0', 10);

        // 查找对应的股票代码
        const stockInfo = this.cusipToTicker[cusip] || this.findStockByName(nameOfIssuer);
        const ticker = stockInfo?.ticker || cusip;
        const company = stockInfo?.name || nameOfIssuer || ticker;

        // 只保留主要持仓 (市值 > $1M)
        if (value < 1000000) continue;

        holdings.push({
          fundName,
          fundManager: fundName,
          ticker,
          company,
          shares,
          value,
          portfolioWeight: 0, // 稍后计算
          sharesChange: 0,
          sharesChangePercent: 0,
          action: 'unchanged',
          reportDate: new Date(reportDate),
          filingDate: new Date(filingDate),
        });
      }

      // 计算组合权重
      const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
      for (const holding of holdings) {
        holding.portfolioWeight = totalValue > 0 ? (holding.value / totalValue) * 100 : 0;
      }

    } catch (error) {
      this.logError('Failed to parse 13F XML', error as Error);
    }

    return holdings;
  }

  /**
   * 从 XML 中提取值
   */
  private extractXMLValue(xml: string, tagName: string): string {
    // 支持带命名空间的标签
    const regex = new RegExp(`<(?:ns1:)?${tagName}[^>]*>([^<]*)<\/(?:ns1:)?${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * 通过公司名称查找股票代码
   */
  private findStockByName(name: string): { ticker: string; name: string } | null {
    if (!name) return null;
    const nameLower = name.toLowerCase();

    // 常见名称映射
    const nameMapping: Record<string, { ticker: string; name: string }> = {
      'nvidia': { ticker: 'NVDA', name: 'NVIDIA Corp' },
      'microsoft': { ticker: 'MSFT', name: 'Microsoft Corp' },
      'amazon': { ticker: 'AMZN', name: 'Amazon.com Inc' },
      'alphabet': { ticker: 'GOOGL', name: 'Alphabet Inc' },
      'google': { ticker: 'GOOGL', name: 'Alphabet Inc' },
      'meta': { ticker: 'META', name: 'Meta Platforms Inc' },
      'facebook': { ticker: 'META', name: 'Meta Platforms Inc' },
      'apple': { ticker: 'AAPL', name: 'Apple Inc' },
      'tesla': { ticker: 'TSLA', name: 'Tesla Inc' },
      'advanced micro': { ticker: 'AMD', name: 'Advanced Micro Devices' },
      'broadcom': { ticker: 'AVGO', name: 'Broadcom Inc' },
      'oracle': { ticker: 'ORCL', name: 'Oracle Corp' },
      'salesforce': { ticker: 'CRM', name: 'Salesforce Inc' },
      'adobe': { ticker: 'ADBE', name: 'Adobe Inc' },
      'servicenow': { ticker: 'NOW', name: 'ServiceNow Inc' },
      'palantir': { ticker: 'PLTR', name: 'Palantir Technologies' },
      'snowflake': { ticker: 'SNOW', name: 'Snowflake Inc' },
      'qualcomm': { ticker: 'QCOM', name: 'Qualcomm Inc' },
      'intel': { ticker: 'INTC', name: 'Intel Corp' },
      'micron': { ticker: 'MU', name: 'Micron Technology' },
      'taiwan semiconductor': { ticker: 'TSM', name: 'Taiwan Semiconductor' },
      'asml': { ticker: 'ASML', name: 'ASML Holding' },
      'arm holdings': { ticker: 'ARM', name: 'ARM Holdings' },
    };

    for (const [keyword, info] of Object.entries(nameMapping)) {
      if (nameLower.includes(keyword)) {
        return info;
      }
    }

    return null;
  }

  /**
   * 聚合热门持仓
   */
  private aggregateTopHoldings(
    holdings: HedgeFundHolding[]
  ): { ticker: string; fundsCount: number; totalValue: number }[] {
    const aggregated = new Map<string, { fundsCount: number; totalValue: number }>();

    for (const holding of holdings) {
      const existing = aggregated.get(holding.ticker) || { fundsCount: 0, totalValue: 0 };
      aggregated.set(holding.ticker, {
        fundsCount: existing.fundsCount + 1,
        totalValue: existing.totalValue + holding.value,
      });
    }

    return Array.from(aggregated.entries())
      .map(([ticker, data]) => ({ ticker, ...data }))
      .sort((a, b) => b.fundsCount - a.fundsCount || b.totalValue - a.totalValue)
      .slice(0, 20);
  }

  /**
   * 格式化持仓内容
   */
  private formatHoldingContent(holding: HedgeFundHolding): string {
    const lines: string[] = [];
    lines.push(`基金: ${holding.fundName}`);
    lines.push(`股票: ${holding.ticker} (${holding.company})`);
    lines.push(`持股数: ${holding.shares.toLocaleString()}`);
    lines.push(`市值: $${(holding.value / 1e6).toFixed(2)}M`);
    if (holding.portfolioWeight > 0) {
      lines.push(`组合权重: ${holding.portfolioWeight.toFixed(2)}%`);
    }
    lines.push(`报告日期: ${holding.reportDate.toISOString().split('T')[0]}`);

    return lines.join('\n');
  }

  /**
   * 创建空结果
   */
  private createEmptyResult(reason: string): CollectedData {
    return {
      source: this.name,
      type: 'hedge-fund',
      collectedAt: new Date(),
      items: [],
      metadata: {
        status: 'no_data',
        reason,
      },
    };
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 创建对冲基金收集器
 */
export function createHedgeFundCollector(
  config: Partial<HedgeFundConfig> = {}
): HedgeFundCollector {
  return new HedgeFundCollector(config);
}

// 导出默认实例
export const hedgeFundCollector = new HedgeFundCollector();
