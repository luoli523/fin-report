/**
 * 多模型注册表（v2 流水线）
 *
 * - 从 config/llm-profiles.json 读取模型 profile 与步骤映射
 * - 密钥只从环境变量读取（profile.apiKeyEnv）
 * - 环境变量 LLM_STEP_<STEP>=<profile> 可覆盖某一步骤使用的模型
 */

import * as fs from 'fs';
import * as path from 'path';
import { createLLMProvider, BaseLLMProvider } from '../analyzers/llm/providers';
import { LLMConfig, LLMProvider } from '../analyzers/llm/types';

export type LLMStep = 'triage' | 'synthesis' | 'watchlist' | 'portfolio' | 'narration_public' | 'narration_private' | 'narration_review';

interface ProfileDef {
  provider: LLMProvider;
  model: string;
  apiKeyEnv?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  thinking?: boolean;
  contextWindow?: number;
  keepAlive?: number;
  jsonOutput?: boolean;
}

interface ProfilesFile {
  profiles: Record<string, ProfileDef>;
  steps: Record<string, string>;
}

const DEFAULT_KEY_ENV: Record<LLMProvider, string> = {
  google: 'GOOGLE_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  ollama: '',
};

let cached: ProfilesFile | null = null;

function loadProfiles(): ProfilesFile {
  if (cached) return cached;
  const file = path.resolve(process.cwd(), 'config/llm-profiles.json');
  cached = JSON.parse(fs.readFileSync(file, 'utf-8')) as ProfilesFile;
  return cached;
}

export function resolveProfileName(step: LLMStep): string {
  const override = process.env[`LLM_STEP_${step.toUpperCase()}`];
  if (override) return override;
  const { steps } = loadProfiles();
  const name = steps[step];
  if (!name) throw new Error(`config/llm-profiles.json 未为步骤 ${step} 指定 profile`);
  return name;
}

export function resolveConfig(step: LLMStep): LLMConfig & { profileName: string } {
  const { profiles } = loadProfiles();
  const profileName = resolveProfileName(step);
  const def = profiles[profileName];
  if (!def) throw new Error(`profile "${profileName}" 不存在于 config/llm-profiles.json`);

  const keyEnv = def.apiKeyEnv || DEFAULT_KEY_ENV[def.provider];
  const apiKey = keyEnv ? process.env[keyEnv] || '' : '';
  if (!apiKey && def.provider !== 'ollama') {
    throw new Error(`步骤 ${step} 使用 profile "${profileName}"，但环境变量 ${keyEnv} 未设置`);
  }

  return {
    enabled: true,
    provider: def.provider,
    model: def.model as any,
    apiKey,
    baseURL: def.baseURL,
    temperature: def.temperature ?? 0.3,
    maxTokens: def.maxTokens ?? 16384,
    timeout: def.timeout ?? 180000,
    thinking: def.thinking,
    contextWindow: def.contextWindow,
    keepAlive: def.keepAlive,
    jsonOutput: def.jsonOutput,
    profileName,
  };
}

export function getProvider(step: LLMStep): { provider: BaseLLMProvider; config: LLMConfig & { profileName: string } } {
  const config = resolveConfig(step);
  return { provider: createLLMProvider(config), config };
}

/** 去掉 markdown 代码块标记，并截取首尾大括号之间的内容 */
export function extractJSON(text: string): string {
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return t;
}

/**
 * 调用某一步骤的模型，要求返回 JSON；解析失败时带错误重试一次
 */
export async function chatJSON<T = any>(
  step: LLMStep,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ data: T; raw: string; model: string; profile: string; tokens?: number }> {
  const { provider, config } = getProvider(step);
  console.log(`[llm:${step}] profile=${config.profileName} provider=${config.provider} model=${config.model}`);

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  let lastError = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const started = Date.now();
    const response = await provider.chat(
      attempt === 1
        ? messages
        : [
            ...messages,
            { role: 'assistant', content: lastError.slice(0, 2000) },
            { role: 'user', content: '上面的输出不是合法 JSON，无法被 JSON.parse 解析。请只输出合法 JSON，不要任何解释和代码块标记。' },
          ],
    );
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`[llm:${step}] ${secs}s, tokens=${response.usage?.totalTokens ?? '?'}, finish=${response.finishReason ?? '?'}`);

    try {
      const data = JSON.parse(extractJSON(response.content)) as T;
      return { data, raw: response.content, model: config.model, profile: config.profileName, tokens: response.usage?.totalTokens };
    } catch (e: any) {
      lastError = response.content;
      console.warn(`[llm:${step}] JSON 解析失败 (attempt ${attempt}): ${e.message}`);
    }
  }
  throw new Error(`[llm:${step}] 两次尝试均未得到合法 JSON`);
}
