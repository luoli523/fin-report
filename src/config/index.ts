/**
 * 监控的股票和指数列表（全局唯一配置）
 * 按照 AI 产业链分类，覆盖上游制造/中游芯片/下游应用
 * 
 * 只需在这里修改，即可全局生效
 */
export const MONITORED_SYMBOLS = {
  // 主要指数 (5)
  indices: [
    '^GSPC',   // S&P 500
    '^DJI',    // Dow Jones Industrial Average
    '^IXIC',   // NASDAQ Composite
    '^RUT',    // Russell 2000
    '^VIX',    // CBOE Volatility Index
  ],

  // ETF (8) - 用于对冲和配置建议
  etf: [
    'SMH',     // VanEck Semiconductor ETF
    'SOXX',    // iShares Semiconductor ETF
    'QQQ',     // Invesco QQQ (NASDAQ 100)
    'VOO',     // Vanguard S&P 500 ETF
    'ARKQ',    // ARK Autonomous Tech & Robotics ETF
    'BOTZ',    // Global X Robotics & AI ETF
    'ROBT',    // First Trust Nasdaq AI & Robotics ETF
    'GLD',     // SPDR Gold Trust (对冲)
  ],

  // ===== AI 产业链分类 =====

  // 1. GPU/加速与半导体 (8)
  gpuAccelerator: [
    'NVDA',    // NVIDIA Corporation - AI芯片龙头
    'AMD',     // Advanced Micro Devices - GPU/CPU
    'AVGO',    // Broadcom Inc. - 网络芯片/定制ASIC
    'QCOM',    // QUALCOMM - 移动AI芯片
    'MU',      // Micron Technology - HBM内存
    'ARM',     // Arm Holdings - 芯片架构
    'WDC',     // Western Digital - 存储芯片/HDD/SSD
    'STX',     // Seagate Technology - 存储/硬盘
  ],

  // 2. 晶圆与制造 (2)
  waferManufacturing: [
    'TSM',     // Taiwan Semiconductor - 代工龙头
    'ASML',    // ASML Holding - 光刻机垄断
  ],

  // 3. 设备/EDA (5)
  equipmentEda: [
    'AMAT',    // Applied Materials - 半导体设备
    'LRCX',    // Lam Research - 刻蚀设备
    'KLAC',    // KLA Corporation - 检测设备
    'SNPS',    // Synopsys - EDA软件
    'CDNS',    // Cadence Design - EDA软件
  ],

  // 4. 服务器与基础设施 (7)
  serverInfra: [
    'SMCI',    // Super Micro Computer - AI服务器
    'DELL',    // Dell Technologies - 企业服务器
    'HPE',     // Hewlett Packard Enterprise - 服务器
    'ANET',    // Arista Networks - 数据中心网络
    'VRT',     // Vertiv Holdings - 电源/散热
    'ETN',     // Eaton Corporation - 电气设备
    'CRWV',    // CoreWeave - 云GPU基础设施
  ],

  // 5. 云与平台 (4)
  cloudPlatform: [
    'MSFT',    // Microsoft - Azure/OpenAI合作
    'AMZN',    // Amazon - AWS
    'GOOGL',   // Alphabet - Google Cloud/DeepMind
    'ORCL',    // Oracle - 云基础设施
  ],

  // 6. 应用与软件 (6)
  aiSoftware: [
    'META',    // Meta Platforms - AI应用/Llama
    'ADBE',    // Adobe - AI创意工具
    'CRM',     // Salesforce - 企业AI
    'NOW',     // ServiceNow - 企业自动化
    'SNOW',    // Snowflake - 数据平台
    'DDOG',    // Datadog - 监控/可观测性
  ],

  // 7. 自动驾驶/机器人/航天 (5)
  autonomousRobotics: [
    'TSLA',    // Tesla - 自动驾驶/机器人
    'MBLY',    // Mobileye - 自动驾驶芯片
    'ABB',     // ABB Ltd - 工业机器人
    'FANUY',   // Fanuc - 工业自动化
    'RKLB',    // Rocket Lab USA - 航天/火箭发射
  ],

  // 8. 数据中心能源 (4)
  dataCenterEnergy: [
    'VST',     // Vistra Corp - 数据中心电力
    'CEG',     // Constellation Energy - 核能/清洁能源
    'OKLO',    // Oklo Inc - 小型核反应堆
    'BE',      // Bloom Energy - 燃料电池
  ],

  // 9. 其他重要标的 (6) - 补充覆盖
  others: [
    'AAPL',    // Apple - 设备端AI
    'INTC',    // Intel - 传统芯片巨头
    'MRVL',    // Marvell - 定制芯片
    'PLTR',    // Palantir - AI数据分析
    'LLY',     // Eli Lilly - AI制药
    'JPM',     // JPMorgan - 金融AI应用
  ],
};

/**
 * AI产业链分类映射（用于报告生成）
 */
export const AI_INDUSTRY_CATEGORIES = {
  'GPU/加速与半导体': MONITORED_SYMBOLS.gpuAccelerator,
  '晶圆与制造': MONITORED_SYMBOLS.waferManufacturing,
  '设备/EDA': MONITORED_SYMBOLS.equipmentEda,
  '服务器与基础设施': MONITORED_SYMBOLS.serverInfra,
  '云与平台': MONITORED_SYMBOLS.cloudPlatform,
  '应用与软件': MONITORED_SYMBOLS.aiSoftware,
  '自动驾驶/机器人': MONITORED_SYMBOLS.autonomousRobotics,
  '数据中心能源': MONITORED_SYMBOLS.dataCenterEnergy,
  '其他': MONITORED_SYMBOLS.others,
};

/**
 * 股票信息映射（代码 -> 公司名称）
 */
export const STOCK_INFO: Record<string, { name: string; category: string }> = {
  // GPU/加速与半导体
  'NVDA': { name: 'NVIDIA Corporation', category: 'GPU/加速与半导体' },
  'AMD': { name: 'Advanced Micro Devices', category: 'GPU/加速与半导体' },
  'AVGO': { name: 'Broadcom Inc.', category: 'GPU/加速与半导体' },
  'QCOM': { name: 'QUALCOMM Incorporated', category: 'GPU/加速与半导体' },
  'MU': { name: 'Micron Technology', category: 'GPU/加速与半导体' },
  'ARM': { name: 'Arm Holdings plc', category: 'GPU/加速与半导体' },
  'WDC': { name: 'Western Digital Corporation', category: 'GPU/加速与半导体' },
  'STX': { name: 'Seagate Technology Holdings', category: 'GPU/加速与半导体' },
  // 晶圆与制造
  'TSM': { name: 'Taiwan Semiconductor', category: '晶圆与制造' },
  'ASML': { name: 'ASML Holding N.V.', category: '晶圆与制造' },
  // 设备/EDA
  'AMAT': { name: 'Applied Materials', category: '设备/EDA' },
  'LRCX': { name: 'Lam Research', category: '设备/EDA' },
  'KLAC': { name: 'KLA Corporation', category: '设备/EDA' },
  'SNPS': { name: 'Synopsys, Inc.', category: '设备/EDA' },
  'CDNS': { name: 'Cadence Design Systems', category: '设备/EDA' },
  // 服务器与基础设施
  'SMCI': { name: 'Super Micro Computer', category: '服务器与基础设施' },
  'DELL': { name: 'Dell Technologies', category: '服务器与基础设施' },
  'HPE': { name: 'Hewlett Packard Enterprise', category: '服务器与基础设施' },
  'ANET': { name: 'Arista Networks', category: '服务器与基础设施' },
  'VRT': { name: 'Vertiv Holdings', category: '服务器与基础设施' },
  'ETN': { name: 'Eaton Corporation', category: '服务器与基础设施' },
  'CRWV': { name: 'CoreWeave Inc.', category: '服务器与基础设施' },
  // 云与平台
  'MSFT': { name: 'Microsoft Corporation', category: '云与平台' },
  'AMZN': { name: 'Amazon.com, Inc.', category: '云与平台' },
  'GOOGL': { name: 'Alphabet Inc.', category: '云与平台' },
  'ORCL': { name: 'Oracle Corporation', category: '云与平台' },
  // 应用与软件
  'META': { name: 'Meta Platforms, Inc.', category: '应用与软件' },
  'ADBE': { name: 'Adobe Inc.', category: '应用与软件' },
  'CRM': { name: 'Salesforce, Inc.', category: '应用与软件' },
  'NOW': { name: 'ServiceNow, Inc.', category: '应用与软件' },
  'SNOW': { name: 'Snowflake Inc.', category: '应用与软件' },
  'DDOG': { name: 'Datadog, Inc.', category: '应用与软件' },
  // 自动驾驶/机器人/航天
  'TSLA': { name: 'Tesla, Inc.', category: '自动驾驶/机器人' },
  'MBLY': { name: 'Mobileye Global Inc.', category: '自动驾驶/机器人' },
  'ABB': { name: 'ABB Ltd', category: '自动驾驶/机器人' },
  'FANUY': { name: 'Fanuc Corporation', category: '自动驾驶/机器人' },
  'RKLB': { name: 'Rocket Lab USA, Inc.', category: '自动驾驶/机器人' },
  // 数据中心能源
  'VST': { name: 'Vistra Corp.', category: '数据中心能源' },
  'CEG': { name: 'Constellation Energy', category: '数据中心能源' },
  'OKLO': { name: 'Oklo Inc.', category: '数据中心能源' },
  'BE': { name: 'Bloom Energy', category: '数据中心能源' },
  // 其他
  'AAPL': { name: 'Apple Inc.', category: '其他' },
  'INTC': { name: 'Intel Corporation', category: '其他' },
  'MRVL': { name: 'Marvell Technology', category: '其他' },
  'PLTR': { name: 'Palantir Technologies', category: '其他' },
  'LLY': { name: 'Eli Lilly and Company', category: '其他' },
  'JPM': { name: 'JPMorgan Chase & Co.', category: '其他' },
  // ETF
  'SMH': { name: 'VanEck Semiconductor ETF', category: 'ETF' },
  'SOXX': { name: 'iShares Semiconductor ETF', category: 'ETF' },
  'QQQ': { name: 'Invesco QQQ Trust', category: 'ETF' },
  'VOO': { name: 'Vanguard S&P 500 ETF', category: 'ETF' },
  'ARKQ': { name: 'ARK Autonomous Tech ETF', category: 'ETF' },
  'BOTZ': { name: 'Global X Robotics & AI ETF', category: 'ETF' },
  'ROBT': { name: 'First Trust Nasdaq AI & Robotics ETF', category: 'ETF' },
  'GLD': { name: 'SPDR Gold Trust', category: 'ETF' },
};

/**
 * 获取所有监控的股票代码（扁平化数组）
 */
export function getAllMonitoredSymbols(): string[] {
  return [
    ...MONITORED_SYMBOLS.indices,
    ...MONITORED_SYMBOLS.etf,
    ...MONITORED_SYMBOLS.gpuAccelerator,
    ...MONITORED_SYMBOLS.waferManufacturing,
    ...MONITORED_SYMBOLS.equipmentEda,
    ...MONITORED_SYMBOLS.serverInfra,
    ...MONITORED_SYMBOLS.cloudPlatform,
    ...MONITORED_SYMBOLS.aiSoftware,
    ...MONITORED_SYMBOLS.autonomousRobotics,
    ...MONITORED_SYMBOLS.dataCenterEnergy,
    ...MONITORED_SYMBOLS.others,
  ];
}

/**
 * 获取所有股票代码（不包括指数和ETF）
 * 用于 SEC/EDGAR 等只支持股票的收集器
 */
export function getStockSymbols(): string[] {
  return [
    ...MONITORED_SYMBOLS.gpuAccelerator,
    ...MONITORED_SYMBOLS.waferManufacturing,
    ...MONITORED_SYMBOLS.equipmentEda,
    ...MONITORED_SYMBOLS.serverInfra,
    ...MONITORED_SYMBOLS.cloudPlatform,
    ...MONITORED_SYMBOLS.aiSoftware,
    ...MONITORED_SYMBOLS.autonomousRobotics,
    ...MONITORED_SYMBOLS.dataCenterEnergy,
    ...MONITORED_SYMBOLS.others,
  ];
}

/**
 * 获取所有指数代码
 */
export function getIndexSymbols(): string[] {
  return MONITORED_SYMBOLS.indices;
}

/**
 * 获取ETF代码
 */
export function getETFSymbols(): string[] {
  return MONITORED_SYMBOLS.etf;
}

/**
 * 按产业链分类获取股票
 */
export function getStocksByCategory(): Record<string, string[]> {
  return AI_INDUSTRY_CATEGORIES;
}
