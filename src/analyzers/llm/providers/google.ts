/**
 * Google Gemini LLM 提供商
 */

import { BaseLLMProvider } from './base';
import { LLMResponse } from '../types';
import https from 'https';

export class GoogleProvider extends BaseLLMProvider {
  private readonly baseURL: string;

  constructor(config: any) {
    super(config);
    this.baseURL = config.baseURL || 'https://generativelanguage.googleapis.com';
    this.validateConfig();
  }

  async chat(messages: { role: string; content: string }[]): Promise<LLMResponse> {
    // 转换消息格式为 Gemini 格式
    const contents = this.convertMessages(messages);

    const requestBody = JSON.stringify({
      contents,
      generationConfig: {
        temperature: this.config.temperature || 0.7,
        maxOutputTokens: this.config.maxTokens || 4096,
        topP: 0.95,
        topK: 40,
      },
    });

    const response = await this.makeRequest(requestBody);

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No response from Google Gemini');
    }

    const candidate = response.candidates[0];
    const content = (candidate.content?.parts || [])
      .filter((p: any) => typeof p.text === 'string' && !p.thought)
      .map((p: any) => p.text)
      .join('');
    const usage = response.usageMetadata;

    return {
      content,
      usage: usage ? {
        promptTokens: usage.promptTokenCount || 0,
        completionTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
      } : undefined,
      model: this.config.model,
      finishReason: candidate.finishReason,
    };
  }

  /**
   * 转换消息格式为 Gemini 格式
   * Gemini API 使用 'user' 和 'model' 角色
   */
  private convertMessages(messages: { role: string; content: string }[]): any[] {
    return messages.map(msg => {
      let role = msg.role;
      
      // 转换角色名称
      if (role === 'assistant') {
        role = 'model';
      } else if (role === 'system') {
        // Gemini 不支持 system 角色，将其合并到第一个 user 消息中
        role = 'user';
      }

      return {
        role,
        parts: [{ text: msg.content }],
      };
    });
  }

  private makeRequest(body: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Gemini API 使用查询参数传递 API Key
      const endpoint = `/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;
      const url = new URL(endpoint, this.baseURL);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
              reject(new Error(`Google Gemini API error: ${parsed.error?.message || 'Unknown error'}`));
            } else {
              resolve(parsed);
            }
          } catch (error) {
            reject(new Error(`Failed to parse Google Gemini response: ${error}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Google Gemini request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Google Gemini request timeout'));
      });

      req.write(body);
      req.end();
    });
  }

  protected estimateCost(promptTokens: number, completionTokens: number): number {
    // Google Gemini 定价 (2024-2026)
    const pricing: Record<string, { input: number; output: number }> = {
      'gemini-2.0-flash-exp': { input: 0, output: 0 },           // 实验版免费
      'gemini-1.5-pro': { input: 0.00125, output: 0.005 },       // per 1K tokens
      'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },   // 超便宜！
      'gemini-1.0-pro': { input: 0.0005, output: 0.0015 },
    };

    const modelPricing = pricing[this.config.model] || pricing['gemini-1.5-flash'];
    return (
      (promptTokens / 1000) * modelPricing.input +
      (completionTokens / 1000) * modelPricing.output
    );
  }
}
