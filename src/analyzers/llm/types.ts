/**
 * LLM 提供商通用类型
 */

export type LLMProvider = 'openai' | 'anthropic' | 'ollama' | 'deepseek' | 'google';

/** 模型名直接透传给各家 API，不做枚举约束 */
export type LLMModel = string;

export interface LLMConfig {
  enabled: boolean;
  provider: LLMProvider;
  model: LLMModel;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
}
