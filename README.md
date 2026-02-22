# Finance Briefing Agent

> 🚀 基于 AI 的财经简报自动生成系统

专业的全自动化 **AI 产业链投资简报**生成工具，每日自动收集美股市场、财经新闻、宏观经济数据，通过 LLM 深度分析生成结构化的投资决策参考报告。

**这是鬼哥的开源项目，欢迎大家试用、反馈和贡献！** 如有问题或建议，请提交 Issue 或 PR。

![Finance Briefing Agent Overview](docs/finance-briefing-agent-infographic.png)

## ✨ 核心特性

### 📊 AI 产业链全覆盖
- **60 只核心标的** - 覆盖 AI 产业链上中下游
- **9 大产业分类** - GPU/半导体、晶圆制造、设备EDA、服务器、云平台、AI软件、自动驾驶/航天、数据中心能源
- **完整生态视图** - 从芯片设计到终端应用的完整投资图谱

### 🤖 LLM 深度分析
- **多模型支持** - GPT-5.2、GPT-4o、Gemini 2.0 Flash、Claude、DeepSeek
- **产业链视角** - GPU供应链、数据中心扩张、半导体CapEx三条主线分析
- **投资建议** - 短中长期配置建议、精选标的、风险控制
- **深度洞察** - 传导机制分析、受益/受损环节识别、跟踪指标

### 📈 多维度数据收集
- **Yahoo Finance** - 实时行情（无需 API Key）
- **Finnhub** - 全球财经新闻
- **FRED** - 美国宏观经济指标
- **政府 RSS** - Fed 公告、SEC 新闻
- **💵 美元与利率环境** - 美元指数、美债收益率、主要货币对（免费）

### 💰 智慧资金追踪（新增）
- **对冲基金 13F** - SEC EDGAR 直接解析，追踪顶级基金持仓（免费）
- **Polymarket** - 预测市场赔率，政策/经济事件定价（免费）
- **Reddit 情绪** - ApeWisdom r/wallstreetbets 等热门讨论（免费）
- **X.com 情绪** - StockGeist 社交媒体情绪分析（可选 API Key）

### 🎨 NotebookLM 智能信息图
- **自动生成** - 基于每日简报自动生成中文信息图
- **可视化摘要** - 指数表现、产业链股票、市场要闻一图尽览
- **邮件集成** - 信息图自动附加到每日邮件

### 🌐 静态网站（GitHub Pages）
- **每日研报展示** - Astro 构建的静态网站，自动发布每日简报
- **信息图 + Slides** - 研报页面集成信息图查看器和 Slides 画廊
- **中英文双语** - 支持中文和英文界面
- **RSS 订阅** - 提供 RSS Feed，方便通过阅读器订阅
- **自动部署** - GitHub Actions 每日生成后自动构建并部署到 GitHub Pages

---

## 🚀 快速开始

### 1. 克隆并安装

```bash
git clone https://github.com/luoli523/fin-report.git
cd fin-report

# 运行安装脚本 (自动检测环境、安装依赖、创建配置)
./install.sh
```

安装脚本会自动：
- ✅ 检查 Node.js (>= 18.0) 和 Python (>= 3.9) 版本
- ✅ 检查 NotebookLM CLI 安装状态
- ✅ 安装 npm 依赖
- ✅ 创建 `.env` 配置文件
- ✅ 创建必要的目录结构
- ✅ 验证 TypeScript 编译

### 2. 配置 API Keys

如果 `.env` 文件不存在，安装脚本会自动从模板创建。手动创建：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 数据收集 API（可选但推荐）
FINNHUB_API_KEY=your_finnhub_key
FRED_API_KEY=your_fred_key

# LLM 深度分析（推荐启用）
LLM_ENABLED=true
LLM_PROVIDER=openai
LLM_MODEL=gpt-5.2
LLM_API_KEY=your_openai_key
LLM_MAX_TOKENS=16384
LLM_TIMEOUT=300000
```

### 3. 查看所有可用命令 📖

```bash
npm run help
```

显示完整的命令行帮助，包括所有可用的 npm scripts、使用示例和配置说明。

### 4. 一键生成简报 🎯

```bash
npm run daily
```

这将自动执行完整流程：
1. **📊 收集数据** (~30秒) - 市场行情、新闻、经济指标、美元/利率、智慧资金数据
2. **🧠 智能分析** (~2秒) - 多维度数据分析
3. **🤖 LLM 深度分析** (~90秒) - GPT-5.2 产业链 + 智慧资金洞察
4. **📄 生成简报** (~1秒) - 专业投资报告（含智慧资金和美元分析）
5. **🎨 生成信息图** (~60秒) - NotebookLM 中文可视化
6. **📑 生成 Slides** (~60秒) - NotebookLM PPT
7. **📧 发送邮件** - 含信息图和 Slides 附件
8. **📱 发送 Telegram** - 简报摘要
9. **🌐 发布网站** - 自动构建并部署到 GitHub Pages

生成的文件：
- `output/ai-briefing-YYYY-MM-DD.md` - Markdown 简报
- `output/ai-briefing-YYYY-MM-DD-infographic.png` - 信息图
- `output/ai-briefing-YYYY-MM-DD-slide-deck.pdf` - Slides

---

## 📄 简报内容

生成的简报包含 **7 大核心板块**：

### 一、核心股票池表现

#### 主要指数（含深度分析）
五大指数实时行情 + **深度分析**（数据面、信息面、底层逻辑）：

| 指数名称 | 代号 | 最新点位 | 涨跌幅 | 表现 |
|----------|------|----------|--------|------|
| S&P 500 | ^GSPC | 6950.23 | +0.50% | 🔴 |
| 道琼斯工业 | ^DJI | 49412.40 | +0.64% | 🔴 |
| 纳斯达克综合 | ^IXIC | 23601.36 | +0.43% | 🔴 |
| 罗素2000 | ^RUT | 2659.67 | -0.36% | 🟢 |
| VIX恐慌指数 | ^VIX | 16.15 | +0.37% | 🟢 |

每个指数包含：
- **数据面分析** - 收盘点位、技术面信号
- **信息面分析** - 当日影响指数的新闻、政策、经济数据
- **底层逻辑** - 为什么涨/跌、板块贡献、资金流向
- **指数间联动** - 成长vs价值、大盘vs小盘、VIX关系

#### 💵 美元与利率环境（新增）
全面监控美元指数、美债收益率和主要货币对，并提供深度分析：

**美元指数 (DXY)**
- 实时价格、涨跌幅、趋势判断（走强/走弱/持稳）
- 水平评估（强势/中性/弱势）
- 对股市、大宗商品、新兴市场的影响分析

**美债收益率**（覆盖 3M、2Y、5Y、10Y、30Y）
- 各期限收益率及涨跌
- **收益率曲线形态**：正常/倒挂/平坦/陡峭
- **2Y-10Y 利差**：经典衰退预警指标
- **波动性分析**：低/中/高波动及市场含义
- **市场影响**：融资成本、利率趋势对资产的影响
- **风险提示**：经济衰退风险、市场不确定性
- **投资展望**：基于收益率曲线的配置建议

**主要货币对**
- USDCHF（瑞郎 - 避险货币）
- USDSGD（新元 - 亚太经济）
- USDJPY（日元 - 套息交易）
- USDCNH（人民币 - 中国经济）

**综合评估**
- 关键要点整合
- 交易指引（防御/进取策略、资产配置）

> 💡 **LLM 增强**: 启用 LLM 后，美元与利率分析将获得：
> - 结合当日新闻的深度解读
> - AI产业链视角的行业轮动建议
> - 跨市场联动分析（美元-利率-股市）
> - 具体的标的推荐和时机判断
> 
> 详见 [`docs/FOREX_LLM_ANALYSIS.md`](./docs/FOREX_LLM_ANALYSIS.md)

#### ETF 表现
8 只核心 ETF 实时行情：

| 分类 | ETF名称 | 代号 | 最新价格 | 涨跌幅 | 表现 |
|------|---------|------|----------|--------|------|
| 半导体 | VanEck Semiconductor ETF | SMH | $398.82 | -0.32% | 🟢 |
| 科技龙头 | Invesco QQQ Trust | QQQ | $625.46 | +0.44% | 🔴 |
| ... | ... | ... | ... | ... | ... |

#### AI 产业链股票
按 9 大分类展示 46 只标的的实时行情：

| 分类 | 公司 | 股票代号 | 最新股价 | 涨跌幅 | 表现 |
|------|------|----------|----------|--------|------|
| GPU/加速与半导体 | NVIDIA Corporation | NVDA | $184.84 | +0.91% | 🔴 |
| ... | ... | ... | ... | ... | ... |

### 二、市场宏观动态与要闻
- 5-10 条最重要新闻，带影响解读
- 覆盖政策监管、供应链、资本市场情绪

### 三、关键公司深度动态
- 股价异动公司的深度分析
- 投资逻辑、价格目标、催化剂、风险提示

### 四、行业影响与关联分析
- **GPU供应链** - 供给 → 成本 → 云厂商毛利
- **数据中心扩张** - 需求 → 服务器/网络/电力
- **半导体CapEx** - 投资 → 设备/EDA订单

### 五、产业链资本动向
- 重大 CapEx、并购、投资动态

### 六、投资建议与策略展望
- 短期（1月）/ 中期（3-6月）/ 长期（6-12月）配置
- 精选标的、风险控制、对冲建议

### 七、智慧资金与市场情绪（新增）
- **国会交易** - 议员买卖动向、政策敏感信号
- **对冲基金** - 机构共识持仓、显著变动解读
- **预测市场** - Polymarket 赔率、政策/经济预期
- **社交情绪** - Reddit/X.com 散户情绪、逆向信号
- **综合研判** - 多数据源交叉验证、重点标的推荐

---

## 📊 监控标的 (60只)

### 主要指数 (5)
`^GSPC` S&P 500 | `^DJI` 道琼斯 | `^IXIC` 纳斯达克 | `^RUT` Russell 2000 | `^VIX` 恐慌指数

### ETF (8)
`SMH` `SOXX` 半导体 | `QQQ` 纳斯达克100 | `VOO` 标普500 | `ARKQ` `BOTZ` `ROBT` 机器人/AI | `GLD` 黄金对冲

### GPU/加速与半导体 (8)
`NVDA` NVIDIA | `AMD` AMD | `AVGO` Broadcom | `QCOM` 高通 | `MU` 美光 | `ARM` Arm | `WDC` 西部数据 | `STX` 希捷

### 晶圆与制造 (2)
`TSM` 台积电 | `ASML` 阿斯麦

### 设备/EDA (5)
`AMAT` 应用材料 | `LRCX` 泛林 | `KLAC` KLA | `SNPS` Synopsys | `CDNS` Cadence

### 服务器与基础设施 (7)
`SMCI` 超微 | `DELL` 戴尔 | `HPE` 惠普企业 | `ANET` Arista | `VRT` Vertiv | `ETN` 伊顿 | `CRWV` CoreWeave

### 云与平台 (4)
`MSFT` 微软 | `AMZN` 亚马逊 | `GOOGL` 谷歌 | `ORCL` 甲骨文

### 应用与软件 (6)
`META` Meta | `ADBE` Adobe | `CRM` Salesforce | `NOW` ServiceNow | `SNOW` Snowflake | `DDOG` Datadog

### 自动驾驶/机器人/航天 (5)
`TSLA` 特斯拉 | `MBLY` Mobileye | `ABB` ABB | `FANUY` 发那科 | `RKLB` Rocket Lab

### 数据中心能源 (4)
`VST` Vistra | `CEG` Constellation | `OKLO` Oklo | `BE` Bloom Energy

### 其他 (6)
`AAPL` 苹果 | `INTC` 英特尔 | `MRVL` Marvell | `PLTR` Palantir | `LLY` 礼来 | `JPM` 摩根大通

---

## 🛠️ 命令汇总

### 推荐工作流

```bash
# 每日简报（完整流程：生成 + 发送）
npm run daily

# 等同于
npm run workflow:full
```

### 核心命令

| 命令 | 说明 | 包含步骤 |
|------|------|----------|
| `npm run daily` | 完整流程 | 收集 → 分析 → 生成 → 信息图 → Slides → 邮件 → Telegram → 网站部署 |
| `npm run workflow:full` | 同上 | 收集 → 分析 → 生成 → 信息图 → Slides → 邮件 → Telegram → 网站部署 |
| `npm run workflow:pro` | 只生成简报 | 收集 → 分析 → 生成 |

### 独立命令

| 命令 | 说明 |
|------|------|
| `npm run collect` | 收集市场数据 |
| `npm run analyze` | 分析数据 |
| `npm run generate:pro` | 生成简报（不含信息图/Slides） |
| `npm run generate:quick` | 快速生成（跳过 LLM） |
| `npm run send-email` | 发送邮件（自动含信息图+Slides） |
| `npm run send-telegram` | 发送 Telegram |
| `npm run generate:nlm-infographic` | 单独生成 NotebookLM 信息图 |
| `npm run generate:nlm-slides` | 生成 NotebookLM Slides (PPT) |

### 分步执行

```bash
# 1. 数据收集
npm run collect

# 2. 数据分析
npm run analyze

# 3. 生成简报
npm run generate:pro

# 4. 生成 NotebookLM 信息图
npm run generate:nlm-infographic

# 5. 生成 NotebookLM Slides
npm run generate:nlm-slides

# 6. 发送邮件（自动附加信息图和 Slides）
npm run send-email

# 7. 发送 Telegram
npm run send-telegram
```

### 快捷命令（开发调试用）

```bash
# 快速重新生成（跳过 LLM 分析，使用已有 insights）
npm run generate:quick

# 单独生成信息图/Slides
npm run generate:nlm-infographic
npm run generate:nlm-infographic 2026-01-25  # 指定日期
npm run generate:nlm-slides
npm run generate:nlm-slides 2026-01-25       # 指定日期

# 命令行参数
npm run generate:pro -- --skip-llm         # 跳过 LLM
```

### 单独收集器

```bash
# 核心数据
npm run collect:yahoo    # 美股行情（无需API）
npm run collect:finnhub  # 财经新闻
npm run collect:fred     # 经济数据
npm run collect:sec      # SEC文件
npm run collect:rss      # 政府RSS

# 智慧资金数据
npm run collect:hedgefund        # 对冲基金 13F（SEC EDGAR）
npm run collect:prediction       # Polymarket 预测市场
npm run collect:sentiment        # Reddit 情绪（ApeWisdom）
```

### 测试命令

```bash
# 外汇数据（美元指数、美债收益率、货币对）在 npm run collect 中自动收集
npm run collect
```

### 发送命令

```bash
npm run send-email              # 发送邮件（自动含信息图+Slides）
npm run send-email 2026-01-25   # 发送指定日期邮件
npm run send-telegram           # 发送 Telegram
npm run send-telegram 2026-01-25
```

### 信息图与 Slides 生成

```bash
# NotebookLM 信息图 - 自动集成到 daily workflow
npm run generate:nlm-infographic              # 当天简报
npm run generate:nlm-infographic 2026-01-25   # 指定日期

# NotebookLM Slides (PPT)
npm run generate:nlm-slides                  # 当天简报
npm run generate:nlm-slides 2026-01-25       # 指定日期
```

### 其他命令

```bash
npm run verify:config           # 验证配置
npm run workflow:intelligent    # 智能分析工作流
```

---

## ⚙️ LLM 配置

### 支持的模型

| 提供商 | 模型 | 推荐场景 |
|--------|------|----------|
| **OpenAI** | `gpt-5.2` ⭐ | 最佳质量，深度分析 |
| **OpenAI** | `gpt-4o` | 性价比之选 |
| **OpenAI** | `gpt-4o-mini` | 低成本快速 |
| **Google** | `gemini-2.0-flash` | 免费！ |
| **Anthropic** | `claude-3.5-sonnet` | 高质量 |
| **DeepSeek** | `deepseek-chat` | 中文优化 |

### 配置示例

```env
# GPT-5.2 (推荐)
LLM_ENABLED=true
LLM_PROVIDER=openai
LLM_MODEL=gpt-5.2
LLM_API_KEY=sk-xxx
LLM_MAX_TOKENS=16384
LLM_TIMEOUT=300000

# Gemini (免费)
LLM_ENABLED=true
LLM_PROVIDER=google
LLM_MODEL=gemini-2.0-flash
LLM_API_KEY=your_google_key
```

---

## 💰 智慧资金数据配置

系统支持追踪多种"聪明钱"数据源，帮助识别机构动向和市场情绪。

### 数据源概览

| 数据源 | 说明 | API | 状态 |
|--------|------|-----|------|
| **对冲基金 13F** | SEC EDGAR 直接解析，追踪 Citadel、D.E. Shaw、Bridgewater 等顶级基金持仓 | 免费 | ✅ 可用 |
| **Polymarket** | 预测市场赔率，政策/经济事件定价 | 免费 | ✅ 可用 |
| **Reddit 情绪** | ApeWisdom 聚合 r/wallstreetbets、r/stocks 等热门讨论 | 免费 | ✅ 可用 |
| **X.com 情绪** | StockGeist 社交媒体情绪分析 | 可选（10,000 免费额度） | ✅ 可用 |
| **国会交易** | Finnhub Congressional Trading API | 可能需付费 | ⚠️ 测试中 |

### 配置示例

```env
# 智慧资金数据配置（可选）

# StockGeist X.com 情绪分析（可选，有免费额度）
# 注册: https://www.stockgeist.ai/
STOCKGEIST_API_KEY=your_stockgeist_key

# 其他智慧资金数据源均为免费，无需配置
```

### 追踪的对冲基金

系统默认追踪以下顶级对冲基金的 13F 持仓：

| 基金 | CIK | 说明 |
|------|-----|------|
| Citadel Advisors | 1423053 | 全球最大对冲基金之一 |
| D.E. Shaw | 1009207 | 量化投资先驱 |
| Bridgewater | 1350694 | 全球最大对冲基金 |
| Renaissance Technologies | 1037389 | 量化投资传奇 |
| Two Sigma | 1179392 | 科技驱动投资 |
| AQR Capital | 1167557 | 因子投资专家 |
| Tiger Global | 1167483 | 科技投资专家 |
| Coatue Management | 1535392 | 科技成长投资 |
| Viking Global | 1103804 | 长期价值投资 |
| Point72 | 1603466 | 多策略对冲基金 |

### 智慧资金分析输出

简报第七部分自动生成以下分析：

```markdown
## 七、智慧资金与市场情绪

### 1. 国会议员交易动向
- 交易概况、重点股票、政策信号解读

### 2. 对冲基金持仓变动
- 机构共识持仓、显著变动、布局意图

### 3. 预测市场信号
- 关键预测、概率、对股市影响

### 4. 社交情绪分析
- 散户情绪、逆向信号、投资机会

### 5. 智慧资金综合研判
- 整体信号、重点标的、可操作建议
```

---

## 📁 项目结构

```
fin-report/
├── src/
│   ├── collectors/          # 数据收集器
│   │   ├── yahoo-finance.ts # 美股行情（免费）
│   │   ├── finnhub.ts       # 财经新闻
│   │   ├── fred.ts          # 经济数据
│   │   ├── forex-collector.ts    # 美元/利率/外汇（免费）
│   │   ├── hedge-fund.ts    # 对冲基金 13F（SEC EDGAR 免费）
│   │   ├── prediction-market.ts  # Polymarket 预测市场（免费）
│   │   ├── social-sentiment.ts   # Reddit 情绪（ApeWisdom 免费）
│   │   ├── twitter-sentiment.ts  # X.com 情绪（StockGeist 可选）
│   │   ├── congress-trading.ts   # 国会交易（Finnhub）
│   │   └── history.ts       # 历史数据管理
│   │
│   ├── analyzers/           # 数据分析
│   │   ├── market.ts        # 市场分析
│   │   ├── news.ts          # 新闻分析
│   │   ├── economic.ts      # 经济分析
│   │   ├── forex.ts         # 美元/利率/外汇分析
│   │   ├── smart-money.ts   # 智慧资金分析
│   │   └── llm/             # LLM增强分析
│   │       ├── providers/   # 多LLM提供商
│   │       └── smart-money-llm.ts  # 智慧资金深度分析
│   │
│   ├── generators/          # 报告生成
│   │   └── professional-briefing.ts  # 专业简报生成器
│   │
│   ├── services/            # 服务模块
│   │   ├── email.ts         # 邮件发送（支持信息图附件）
│   │   └── telegram.ts      # Telegram 发送
│   │
│   ├── config/              # 配置管理
│   │   └── index.ts         # 全局配置
│   │
│   └── scripts/             # 运行脚本
│       ├── generate-professional-briefing.ts  # 主工作流
│       └── generate-notebooklm-infographic.ts # 信息图生成
│
├── prompts/                 # LLM提示词
│   ├── professional-briefing-system.txt
│   ├── professional-briefing-task.txt
│   └── smart-money-analysis.txt   # 智慧资金分析提示词
│
├── data/
│   ├── raw/                 # 原始数据
│   ├── processed/           # 处理后数据
│   └── history/             # 历史数据
│
├── output/                  # 生成的简报
├── docs/                    # 详细文档
├── config/                  # 配置工具
│
├── website/                 # Astro 静态网站 (GitHub Pages)
│   ├── src/
│   │   ├── pages/           # 页面路由
│   │   │   ├── index.astro  # 首页（最新研报）
│   │   │   ├── archive.astro # 历史归档
│   │   │   ├── rss.xml.ts   # RSS Feed
│   │   │   ├── reports/     # 中文研报详情页
│   │   │   └── en/          # 英文版页面
│   │   ├── components/      # UI 组件
│   │   │   ├── InfographicViewer.astro  # 信息图查看器
│   │   │   └── SlideGallery.astro       # Slides 画廊
│   │   ├── content/reports/ # 研报 Markdown 内容
│   │   ├── layouts/         # 页面布局
│   │   └── i18n/            # 国际化
│   └── public/images/       # 信息图和 Slides 图片
│
└── scripts/
    └── prepare-website-content.sh  # 研报内容发布脚本
```

---

## 🔧 自定义配置

### 修改监控标的

编辑 `src/config/index.ts` 中的 `MONITORED_SYMBOLS`：

```typescript
export const MONITORED_SYMBOLS = {
  gpuAccelerator: [
    'NVDA', 'AMD', 'AVGO', 'QCOM', 'MU', 'ARM',
    // 添加新的股票...
  ],
  // ...
};
```

### 修改 LLM 提示词

编辑 `prompts/` 目录下的文件：
- `professional-briefing-system.txt` - AI 角色定义
- `professional-briefing-task.txt` - 输出格式和要求

---

## 📚 详细文档

| 文档 | 说明 |
|------|------|
| [`docs/LLM_ENHANCEMENT.md`](./docs/LLM_ENHANCEMENT.md) | LLM 配置详解 |
| [`docs/LLM_PROVIDER_COMPARISON.md`](./docs/LLM_PROVIDER_COMPARISON.md) | LLM 提供商对比 |
| [`docs/COLLECTORS_OVERVIEW.md`](./docs/COLLECTORS_OVERVIEW.md) | 数据收集器说明 |
| [`docs/FOREX_MODULE.md`](./docs/FOREX_MODULE.md) | 💵 美元与利率环境模块 |
| [`docs/FOREX_LLM_ANALYSIS.md`](./docs/FOREX_LLM_ANALYSIS.md) | 🤖 美元/利率 LLM 深度分析 |
| [`docs/SYMBOLS_CONFIGURATION.md`](./docs/SYMBOLS_CONFIGURATION.md) | 股票配置指南 |
| [`docs/PROMPT_CUSTOMIZATION.md`](./docs/PROMPT_CUSTOMIZATION.md) | 提示词定制 |
| [`docs/INTELLIGENT_ANALYZER.md`](./docs/INTELLIGENT_ANALYZER.md) | 智能分析器 |
| [`docs/INFOGRAPHIC_GUIDE.md`](./docs/INFOGRAPHIC_GUIDE.md) | 信息图表生成 |
| [`config/README.md`](./config/README.md) | 配置管理 |

---

## 🎨 NotebookLM 信息图配置

系统支持使用 Google NotebookLM 自动生成中文信息图，并附加到每日邮件中。

### 功能特点

- **自动化生成** - 每日简报生成后自动创建可视化信息图
- **中文优化** - 使用简体中文生成，适合中文用户
- **邮件集成** - 信息图自动内嵌到邮件正文并作为附件发送
- **高质量输出** - Portrait 布局，详细模式，专业美观

### 安装配置

#### 1. 安装 NotebookLM CLI

```bash
pip install notebooklm-py
```

#### 2. 认证登录

```bash
notebooklm login
```

按提示完成 Google 账号认证。

#### 3. 验证安装

```bash
notebooklm status
notebooklm list
```

### 使用方式

**自动模式（推荐）**：运行 `npm run daily` 时自动生成信息图

**手动模式**：
```bash
# 生成当天简报的信息图
npm run generate:nlm-infographic

# 生成指定日期的信息图
npm run generate:nlm-infographic 2026-01-25

# 生成 Slides (PPT)
npm run generate:nlm-slides
npm run generate:nlm-slides 2026-01-25
```

**注意**：信息图和 Slides 现在是独立步骤，不包含在 `generate:pro` 中。如需跳过，直接不运行对应命令即可。

### 输出示例

文件会自动保存到 `output/` 目录：
- 信息图：`ai-briefing-YYYY-MM-DD-infographic.png`
- Slides：`ai-briefing-YYYY-MM-DD-slide-deck.pdf`
- 内容：主要指数、产业链股票涨跌、市场要闻、投资建议

### 注意事项

- 需要稳定的网络连接（访问 Google 服务）
- 首次使用需完成 Google 账号认证
- 如果 NotebookLM CLI 未安装或未认证，系统会自动跳过信息图生成

---

## 📧 邮件发送配置

简报生成后可自动发送到指定邮箱，支持两种方式：

### 方式一：使用 Nodemailer（推荐 - 完全自动化）

在 `.env` 文件中配置以下环境变量：

```env
# 邮件发送配置
EMAIL_ENABLED=true
EMAIL_TO=your-email@example.com
EMAIL_FROM=your-gmail@gmail.com

# Gmail SMTP 配置（推荐）
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your-gmail@gmail.com
EMAIL_SMTP_PASS=your-app-password
```

#### Gmail App Password 获取步骤：

1. 登录 Google 账号，访问 [Google 账号安全设置](https://myaccount.google.com/security)
2. 确保已启用**两步验证**
3. 搜索或找到 **App passwords（应用专用密码）**
4. 选择应用类型为 "Mail"，设备为 "Other"，输入名称如 "Finance Briefing"
5. 点击生成，复制 16 位密码（格式：xxxx xxxx xxxx xxxx）
6. 将此密码填入 `EMAIL_SMTP_PASS`（去掉空格）

配置完成后，运行 `npm run daily` 将自动发送简报到指定邮箱。

**单独发送邮件（不重新生成简报）：**

```bash
# 发送当天简报（自动附加信息图和 Slides，如果存在）
npm run send-email

# 发送指定日期简报
npm run send-email 2026-01-25
```

> 📷 如果对应日期的信息图 (`ai-briefing-YYYY-MM-DD-infographic.png`) 和 Slides (`ai-briefing-YYYY-MM-DD-slide-deck.pdf`) 存在，会自动附加到邮件中。

### 方式二：使用 Claude Code + Composio（交互式）

如果你使用 Claude Code，可以通过 `connect-apps` skill 发送邮件：

```bash
# 1. 安装插件
/plugin install composio-toolrouter

# 2. 运行设置
/composio-toolrouter:setup

# 3. 重启 Claude Code 后，可以直接说：
"把今天的简报发送到 my-email@example.com"
```

这种方式支持 Gmail OAuth 认证，无需配置 App Password，但需要手动触发。

---

## 📱 Telegram 发送配置

简报摘要可自动发送到 Telegram，使用 **Telegram Bot API**（免费、无限制）。

### 配置步骤

#### 1. 创建 Telegram Bot

1. 在 Telegram 中搜索 **@BotFather**
2. 发送 `/newbot` 命令
3. 按提示设置 Bot 名称和用户名
4. 获取 **Bot Token**（格式：`123456789:ABCdefGHI...`）

#### 2. 获取 Chat ID

**方法一：使用 @userinfobot**
1. 在 Telegram 中搜索 **@userinfobot**
2. 发送任意消息，Bot 会返回你的 Chat ID

**方法二：通过 API 获取**
1. 先向你的 Bot 发送任意消息
2. 访问 `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. 在返回的 JSON 中找到 `chat.id`

#### 3. 配置环境变量

```env
# Telegram 发送配置
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

#### 4. 发送测试

```bash
# 发送当天简报
npm run send-telegram

# 发送指定日期简报
npm run send-telegram 2026-01-25
```

### 消息内容

系统会自动提取简报摘要发送到 Telegram：
- 📈 涨幅榜 Top 5
- 📉 跌幅榜 Top 5
- 💡 市场情绪
- 📰 今日要闻

完整报告通过邮件发送。

### 群组通知

如需发送到群组：
1. 将 Bot 添加到群组
2. 设置 Bot 为群管理员（可选，用于发送消息）
3. 获取群组 Chat ID（负数，如 `-123456789`）
4. 更新 `TELEGRAM_CHAT_ID` 为群组 ID

---

## 🌐 网站部署（GitHub Pages）

项目包含一个基于 Astro 构建的静态网站，自动部署到 GitHub Pages，用于展示每日研报。

**在线访问**：`https://<username>.github.io/fin-report/`

### 网站功能

- **首页** - 展示最新一期研报，含信息图和 Slides
- **历史归档** - 按日期浏览所有历史研报
- **研报详情** - 信息图查看器（点击放大）+ Slides 画廊（键盘/触屏切换）+ 完整 Markdown 内容
- **RSS 订阅** - 通过 RSS 阅读器订阅每日更新
- **中英文双语** - 支持中文和英文界面切换

### 本地开发

```bash
cd website
npm install
npm run dev     # 启动开发服务器 http://localhost:4321
npm run build   # 构建静态站点到 dist/
```

### 自动发布流程

网站内容在 GitHub Actions 中自动发布：
1. 每日简报生成完成后，`scripts/prepare-website-content.sh` 将研报和图片复制到 `website/` 目录
2. 自动构建 Astro 静态站点
3. 通过 `peaceiris/actions-gh-pages` 部署到 `gh-pages` 分支

---

## 🤖 GitHub Actions 自动化

项目已配置 GitHub Actions 工作流，可以实现每日自动生成简报并发送邮件。

### 自动运行时间

- **定时运行**：每周二至周六，新加坡时间 09:30（UTC 01:30）
- **对应美股**：周一至周五收盘后
- **支持手动触发**：可随时在 GitHub Actions 页面手动运行

### 配置 GitHub Secrets

在 GitHub 仓库的 `Settings → Secrets and variables → Actions` 中添加以下 Secrets：

#### 数据收集 API
| Secret 名称 | 说明 | 必需 |
|-------------|------|:----:|
| `FINNHUB_API_KEY` | Finnhub 新闻 API | 推荐 |
| `FRED_API_KEY` | FRED 经济数据 API | 推荐 |
| `ALPHA_VANTAGE_API_KEY` | Alpha Vantage 备用 | 可选 |

#### LLM 配置
| Secret 名称 | 说明 | 示例值 |
|-------------|------|--------|
| `LLM_ENABLED` | 是否启用 LLM | `true` |
| `LLM_PROVIDER` | LLM 提供商 | `openai` |
| `LLM_MODEL` | 模型名称 | `gpt-5.2` |
| `LLM_API_KEY` | API 密钥 | `sk-xxx` |
| `LLM_MAX_TOKENS` | 最大 Token 数 | `16384` |
| `LLM_TIMEOUT` | 超时时间(ms) | `300000` |

#### 邮件配置
| Secret 名称 | 说明 | 示例值 |
|-------------|------|--------|
| `EMAIL_ENABLED` | 是否发送邮件 | `true` |
| `EMAIL_TO` | 收件人邮箱 | `you@example.com` |
| `EMAIL_FROM` | 发件人邮箱 | `sender@gmail.com` |
| `EMAIL_SMTP_HOST` | SMTP 服务器 | `smtp.gmail.com` |
| `EMAIL_SMTP_PORT` | SMTP 端口 | `587` |
| `EMAIL_SMTP_USER` | SMTP 用户名 | `sender@gmail.com` |
| `EMAIL_SMTP_PASS` | SMTP 密码/App密码 | `xxxx xxxx xxxx xxxx` |

#### Telegram 配置
| Secret 名称 | 说明 | 示例值 |
|-------------|------|--------|
| `TELEGRAM_ENABLED` | 是否发送Telegram | `true` |
| `TELEGRAM_BOT_TOKEN` | Bot Token | `123456789:ABCdef...` |
| `TELEGRAM_CHAT_ID` | Chat ID | `123456789` |

#### NotebookLM 信息图配置（可选）
| Secret 名称 | 说明 | 获取方式 |
|-------------|------|----------|
| `NOTEBOOKLM_STORAGE_STATE` | 认证信息（base64） | 见下方说明 |

**导出 NotebookLM 认证信息：**

```bash
# 1. 确保本地已完成 NotebookLM 认证
notebooklm login

# 2. 运行导出脚本
./scripts/export-notebooklm-auth.sh

# 3. 复制输出的 base64 字符串
# 4. 添加到 GitHub Secrets: NOTEBOOKLM_STORAGE_STATE
```

> **注意**：NotebookLM 认证可能会过期（通常几周到几个月），届时需要重新导出。如果 GitHub Actions 中信息图生成失败，请重新执行上述步骤。

### 手动触发工作流

1. 进入仓库的 **Actions** 页面
2. 选择 **Daily Finance Briefing** 工作流
3. 点击 **Run workflow**
4. 选择是否发送邮件和 Telegram
5. 点击 **Run workflow** 按钮

### 查看运行结果

- 工作流完成后，简报会作为 **Artifact** 保存（保留 30 天）
- 可在 Actions 运行详情页的 **Summary** 中预览简报前 50 行
- 如配置了邮件，完整简报会自动发送到指定邮箱
- 如配置了 WhatsApp，简报摘要会自动发送到指定手机

---

## ⚠️ 常见问题

**Q: 如何查看所有可用的命令？**  
A: 运行 `npm run help` 查看完整的命令列表、使用示例和配置说明。

**Q: 没有 LLM API Key 能用吗？**  
A: 可以！系统会使用规则引擎生成基础报告。但推荐启用 LLM 获得深度洞察。

**Q: 推荐用哪个 LLM？**  
A: GPT-5.2 质量最佳；Gemini 2.0 Flash 免费；GPT-4o-mini 性价比高。

**Q: 数据多久更新？**  
A: 手动运行命令时更新。建议美股收盘后（北京时间早上 5-6 点，新加坡时间早上 9-10 点）运行。美元指数、美债收益率、外汇数据均为实时更新。

**Q: LLM 分析超时怎么办？**  
A: 增加 `LLM_TIMEOUT` 值（默认 300000 = 5分钟）。

**Q: 如何添加新的监控标的？**  
A: 编辑 `src/config/index.ts` 中的 `MONITORED_SYMBOLS` 对象，在对应分类中添加股票代码即可。

**Q: GitHub Actions 没有自动运行怎么办？**  
A: 检查 Secrets 是否正确配置，可以先手动触发测试。注意 cron 时间是 UTC 时区。

**Q: 邮件发送失败怎么办？**  
A: 确认 Gmail App Password 正确，确保已开启两步验证。检查 `EMAIL_SMTP_PASS` 是否去掉了空格。

**Q: 报告中某些数据显示 N/A？**  
A: 这通常是因为 LLM 无法从当日新闻中提取具体数值。这是正常现象，表示该数据暂无可靠来源。

**Q: 智慧资金数据需要付费吗？**  
A: 大部分免费！对冲基金 13F（SEC EDGAR）、Polymarket、Reddit 情绪（ApeWisdom）均完全免费。X.com 情绪需要 StockGeist API Key（有 10,000 免费额度）。

**Q: 对冲基金 13F 数据延迟多久？**  
A: 根据 SEC 规定，13F 报告需在季度结束后 45 天内提交。因此数据通常延迟 1-2 个月，适合用于了解机构长期布局，而非短期交易。

**Q: 如何添加更多对冲基金追踪？**  
A: 编辑 `src/collectors/hedge-fund.ts` 中的 `TRACKED_FUNDS` 数组，添加基金名称和 CIK 号码即可。

**Q: 美债收益率倒挂是什么意思？**  
A: 当短期国债收益率（如2年期）高于长期国债收益率（如10年期）时，称为"倒挂"。这是经济衰退的经典预警信号，历史上倒挂后12-18个月内往往出现经济衰退。

**Q: 美元指数怎么解读？**  
A: DXY > 105 为强势美元，通常压制大宗商品和新兴市场；DXY < 95 为弱势美元，利好黄金、原油和跨国企业海外收入。系统会自动提供详细的市场影响分析和交易指引。

---

## ⚖️ 免责声明

本工具仅供学习和参考使用，生成的简报不构成任何投资建议。投资有风险，决策需谨慎。

- ⚠️ 数据来源于第三方 API，不保证准确性和实时性
- ⚠️ LLM 分析基于模型推理，可能存在偏差
- ⚠️ 使用者应独立判断，自行承担投资风险

---

## 📄 License

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

**Happy Trading! 📈**
