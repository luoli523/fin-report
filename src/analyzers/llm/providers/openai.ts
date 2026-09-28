/**
 * OpenAI LLM 提供商
 */

import { BaseLLMProvider } from './base';
import { LLMResponse } from '../types';
import https from 'https';

export class OpenAIProvider extends BaseLLMProvider {
  private readonly baseURL: string;

  constructor(config: any) {
    super(config);
    // 确保 baseURL 末尾有斜杠，以便正确构建完整 URL
    const base = config.baseURL || 'https://api.openai.com/v1';
    this.baseURL = base.endsWith('/') ? base : base + '/';
    this.validateConfig();
  }

  async chat(messages: { role: string; content: string }[]): Promise<LLMResponse> {
    // GPT-5 和 o1 系列使用 max_completion_tokens，其他模型使用 max_tokens
    const isNewModel = this.config.model.startsWith('gpt-5') || 
                       this.config.model.startsWith('o1') ||
                       this.config.model.startsWith('o3');
    
    const requestBody = JSON.stringify({
      model: this.config.model,
      messages,
      temperature: this.config.temperature || 0.7,
      ...(isNewModel 
        ? { max_completion_tokens: this.config.maxTokens || 4096 }
        : { max_tokens: this.config.maxTokens || 4096 }
      ),
    });

    const response = await this.makeRequest('/chat/completions', requestBody);

    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response from OpenAI');
    }

    const choice = response.choices[0];
    const usage = response.usage;

    return {
      content: choice.message.content || '',
      usage: usage ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      } : undefined,
      model: response.model,
      finishReason: choice.finish_reason,
    };
  }

  private makeRequest(endpoint: string, body: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // 移除 endpoint 开头的斜杠（如果有）以正确拼接 URL
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
      const url = new URL(cleanEndpoint, this.baseURL);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: this.config.timeout || 60000,
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.setEncoding('utf8'); // 避免多字节字符在 chunk 边界被截断

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`OpenAI API error (${res.statusCode}): ${parsed.error?.message || 'Unknown error'}`));
            } else {
              resolve(parsed);
            }
          } catch (error) {
            console.error('[OpenAI] Failed to parse response');
            console.error('[OpenAI] Status code:', res.statusCode);
            console.error('[OpenAI] Response preview:', data.substring(0, 500));
            reject(new Error(`Failed to parse OpenAI response: ${error}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`OpenAI request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('OpenAI request timeout'));
      });

      req.write(body);
      req.end();
    });
  }

  protected estimateCost(promptTokens: number, completionTokens: number): number {
    // OpenAI 定价 (2024-2026)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.0025, output: 0.01 },          // per 1K tokens - 最新旗舰
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },  // 性价比之王！
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'o1-preview': { input: 0.015, output: 0.06 },       // 推理模型
      'o1-mini': { input: 0.003, output: 0.012 },
    };

    const modelPricing = pricing[this.config.model] || pricing['gpt-4o'];
    return (
      (promptTokens / 1000) * modelPricing.input +
      (completionTokens / 1000) * modelPricing.output
    );
  }
}
