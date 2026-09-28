/**
 * Anthropic Claude LLM 提供商
 */

import { BaseLLMProvider } from './base';
import { LLMResponse } from '../types';
import https from 'https';

export class AnthropicProvider extends BaseLLMProvider {
  private readonly baseURL: string;
  private readonly apiVersion: string;

  constructor(config: any) {
    super(config);
    this.baseURL = config.baseURL || 'https://api.anthropic.com';
    this.apiVersion = '2023-06-01';
    this.validateConfig();
  }

  async chat(messages: { role: string; content: string }[]): Promise<LLMResponse> {
    // Anthropic 需要分离 system 消息
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const requestBody = JSON.stringify({
      model: this.config.model,
      max_tokens: this.config.maxTokens || 4096,
      temperature: this.config.temperature || 0.7,
      system: systemMessage?.content,
      messages: userMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    });

    const response = await this.makeRequest('/v1/messages', requestBody);

    if (!response.content || response.content.length === 0) {
      throw new Error('No response from Anthropic');
    }

    const textContent = response.content.find((c: any) => c.type === 'text');
    const usage = response.usage;

    return {
      content: textContent?.text || '',
      usage: usage ? {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
      } : undefined,
      model: response.model,
      finishReason: response.stop_reason,
    };
  }

  private makeRequest(endpoint: string, body: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseURL);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': this.apiVersion,
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
              reject(new Error(`Anthropic API error: ${parsed.error?.message || 'Unknown error'}`));
            } else {
              resolve(parsed);
            }
          } catch (error) {
            reject(new Error(`Failed to parse Anthropic response: ${error}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Anthropic request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Anthropic request timeout'));
      });

      req.write(body);
      req.end();
    });
  }

  protected estimateCost(promptTokens: number, completionTokens: number): number {
    // Anthropic Claude 定价 (2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },  // per 1K tokens
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
      'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
    };

    const modelPricing = pricing[this.config.model] || pricing['claude-3-5-sonnet-20241022'];
    return (
      (promptTokens / 1000) * modelPricing.input +
      (completionTokens / 1000) * modelPricing.output
    );
  }
}
