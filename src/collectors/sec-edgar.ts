import { BaseCollector } from './base';
import {
  CollectedData,
  SECConfig,
  DataItem,
} from './types';
import * as https from 'https';

// SEC EDGAR API 基础 URL
const SEC_BASE_URL = 'https://data.sec.gov';

// 常见的重要 Filing 类型
const IMPORTANT_FORMS = ['8-K', '10-K', '10-Q', '4', 'S-1', 'S-3', '13F'];

// SEC Filing 类型
interface SECFiling {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  acceptanceDateTime: string;
  act: string;
  form: string;
  fileNumber: string;
  filmNumber: string;
  items: string;
  size: number;
  isXBRL: number;
  isInlineXBRL: number;
  primaryDocument: string;
  primaryDocDescription: string;
}

interface SECCompanySubmissions {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      acceptanceDateTime: string[];
      act: string[];
      form: string[];
      fileNumber: string[];
      filmNumber: string[];
      items: string[];
      size: number[];
      isXBRL: number[];
      isInlineXBRL: number[];
      primaryDocument: string[];
      primaryDocDescription: string[];
    };
  };
}

/**
 * SEC EDGAR 数据收集器
 * 收集公司财报、重大事件公告等
 */
export class SECCollector extends BaseCollector<SECConfig> {
  readonly name = 'sec-edgar';
  readonly description = 'SEC EDGAR filings collector';

  private userAgent: string;

  constructor(config: Partial<SECConfig> & { userAgent: string }) {
    const defaultConfig: SECConfig = {
      enabled: true,
      saveRaw: true,
      timeout: 30000,
      retries: 3,
      userAgent: config.userAgent,
      symbols: config.symbols || [],
      forms: config.forms || IMPORTANT_FORMS,
      daysBack: config.daysBack || 7,
    };

    super({ ...defaultConfig, ...config } as SECConfig);
    this.userAgent = config.userAgent;

    if (!this.userAgent) {
      throw new Error('SEC requires User-Agent header. Please provide userAgent in config (e.g., "YourCompany your@email.com")');
    }
  }

  /**
   * 收集 SEC filings 数据
   */
  async collect(): Promise<CollectedData> {
    this.log('Starting SEC EDGAR collection...');

    try {
      const allFilings: DataItem[] = [];

      // 为每个股票代码获取最新的 filings
      for (const symbol of this.config.symbols) {
        this.log(`Fetching filings for ${symbol}...`);
        
        try {
          const filings = await this.fetchCompanyFilings(symbol);
          allFilings.push(...filings);
          
          // 延迟以遵守 SEC 请求频率限制（每秒最多 10 次请求）
          await this.delay(150);
        } catch (error) {
          this.logError(`Failed to fetch filings for ${symbol}`, error as Error);
        }
      }

      const result: CollectedData = {
        source: this.name,
        type: 'sec-filings',
        collectedAt: new Date(),
        items: allFilings,
      };

      // 保存数据
      if (this.config.saveRaw) {
        await this.saveRawData(allFilings);
      }
      await this.saveProcessedData(result);

      this.log(`Collected ${allFilings.length} SEC filings successfully`);
      return result;

    } catch (error) {
      this.logError('Failed to collect SEC filings', error as Error);
      throw error;
    }
  }

  /**
   * 获取公司的最新 filings
   */
  private async fetchCompanyFilings(symbol: string): Promise<DataItem[]> {
    // 先通过 ticker 搜索获取 CIK
    const cik = await this.getCIKFromTicker(symbol);
    
    if (!cik) {
      this.log(`Could not find CIK for ${symbol}`);
      return [];
    }

    // 获取公司提交的文件
    const submissions = await this.getCompanySubmissions(cik);
    
    // 过滤并转换为 DataItem 格式
    const items: DataItem[] = [];
    const recentFilings = submissions.filings.recent;
    const cutoffDate = this.getCutoffDate();

    for (let i = 0; i < recentFilings.form.length; i++) {
      const form = recentFilings.form[i];
      const filingDate = recentFilings.filingDate[i];

      // 只保留指定类型和时间范围内的 filings
      if (
        this.config.forms.includes(form) &&
        new Date(filingDate) >= cutoffDate
      ) {
        const accessionNumber = recentFilings.accessionNumber[i].replace(/-/g, '');
        const documentUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNumber}/${recentFilings.primaryDocument[i]}`;

        items.push({
          id: recentFilings.accessionNumber[i],
          title: `${submissions.name} - ${form} Filing`,
          content: this.getFilingDescription(form, recentFilings.items[i]),
          timestamp: new Date(filingDate),
          metadata: {
            symbol,
            cik,
            form,
            filingDate,
            reportDate: recentFilings.reportDate[i],
            accessionNumber: recentFilings.accessionNumber[i],
            url: documentUrl,
            items: recentFilings.items[i],
            companyName: submissions.name,
            sic: submissions.sic,
            sicDescription: submissions.sicDescription,
          },
        });
      }
    }

    this.log(`✓ ${symbol} (${submissions.name}): found ${items.length} filings`);
    return items;
  }

  private tickerToCikCache: Map<string, string> | null = null;

  /**
   * 加载 SEC 的 ticker → CIK 映射表
   */
  private async loadTickerMap(): Promise<Map<string, string>> {
    if (this.tickerToCikCache) return this.tickerToCikCache;

    try {
      const url = 'https://www.sec.gov/files/company_tickers.json';
      const data = await this.httpsRequest(url) as Record<string, { cik_str: number; ticker: string; title: string }>;
      const map = new Map<string, string>();
      for (const entry of Object.values(data)) {
        map.set(entry.ticker.toUpperCase(), String(entry.cik_str));
      }
      this.tickerToCikCache = map;
      this.log(`Loaded ${map.size} ticker-to-CIK mappings`);
      return map;
    } catch (error) {
      this.logError('Failed to load ticker-to-CIK map', error as Error);
      return new Map();
    }
  }

  /**
   * 通过 ticker 获取 CIK
   */
  private async getCIKFromTicker(ticker: string): Promise<string | null> {
    const map = await this.loadTickerMap();
    return map.get(ticker.toUpperCase()) || null;
  }

  /**
   * 获取公司的提交历史
   */
  private async getCompanySubmissions(cik: string): Promise<SECCompanySubmissions> {
    const paddedCIK = cik.padStart(10, '0');
    const url = `${SEC_BASE_URL}/submissions/CIK${paddedCIK}.json`;
    return this.httpsRequest(url);
  }

  /**
   * 使用 https 模块发送请求
   */
  private httpsRequest(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = https.get(url, {
        timeout: this.config.timeout || 30000,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        },
      }, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('Failed to parse JSON response'));
            }
          } else if (res.statusCode === 404) {
            reject(new Error('Company not found'));
          } else {
            reject(new Error(`SEC API error: ${res.statusCode} ${res.statusMessage}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.config.timeout || 30000}ms`));
      });
    });
  }

  /**
   * 获取截止日期
   */
  private getCutoffDate(): Date {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.daysBack);
    return cutoff;
  }

  /**
   * 获取 filing 的描述
   */
  private getFilingDescription(form: string, items: string): string {
    const descriptions: Record<string, string> = {
      '8-K': '重大事件报告 (Current Report)',
      '10-K': '年度财务报告 (Annual Report)',
      '10-Q': '季度财务报告 (Quarterly Report)',
      '4': '内部人交易报告 (Insider Trading)',
      'S-1': '首次公开募股注册 (IPO Registration)',
      'S-3': '证券注册声明 (Securities Registration)',
      '13F': '机构持仓报告 (Institutional Holdings)',
    };

    let description = descriptions[form] || form;
    
    if (form === '8-K' && items) {
      description += ` - Items: ${items}`;
    }

    return description;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 格式化 filings 摘要
   */
  formatFilingsSummary(items: DataItem[], limit: number = 10): string {
    const topFilings = items.slice(0, limit);

    return topFilings
      .map((item, index) => {
        const metadata = item.metadata as any;
        return `${index + 1}. [${metadata.filingDate}] ${metadata.companyName}\n   ${metadata.form}: ${item.content}\n   ${metadata.url}`;
      })
      .join('\n\n');
  }
}

/**
 * 创建 SEC 收集器实例
 */
export function createSECCollector(config?: Partial<SECConfig>): SECCollector {
  const userAgent = config?.userAgent || process.env.SEC_USER_AGENT || 'FinanceBriefingAgent/1.0 (contact@example.com)';
  
  return new SECCollector({ 
    ...config,
    userAgent,
  });
}
