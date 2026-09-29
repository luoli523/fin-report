/**
 * Ollama 本地 LLM 提供商
 */

import { BaseLLMProvider } from './base';
import { LLMResponse } from '../types';
import http from 'http';

export class OllamaProvider extends BaseLLMProvider {
  private readonly baseURL: string;

  constructor(config: any) {
    super(config);
    this.baseURL = config.baseURL || 'http://localhost:11434';
  }

  async chat(messages: { role: string; content: string }[]): Promise<LLMResponse> {
    const requestBody = JSON.stringify({
      model: this.config.model,
      messages,
      stream: false,
      keep_alive: this.config.keepAlive,
      think: this.config.thinking,
      format: this.config.jsonOutput ? 'json' : undefined,
      options: {
        temperature: this.config.temperature || 0.7,
        num_predict: this.config.maxTokens || 4096,
        num_ctx: this.config.contextWindow,
      },
    });

    const response = await this.makeRequest('/api/chat', requestBody);

    if (!response.message) {
      throw new Error('No response from Ollama');
    }

    // Some MLX Qwen responses include an unparsed thinking block even when
    // think=false. Only the answer after the closing marker is user content.
    const content = String(response.message.content).split('</think>').at(-1)!.trim();

    // Ollama 不返回 token 使用情况，我们进行估算
    const promptTokens = messages.reduce((sum, m) => sum + this.estimateTokens(m.content), 0);
    const completionTokens = this.estimateTokens(response.message.content);

    return {
      content,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      model: response.model,
      finishReason: response.done ? 'stop' : 'length',
    };
  }

  private makeRequest(endpoint: string, body: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseURL);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 11434,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: this.config.timeout || 120000, // 本地模型可能需要更长时间
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.setEncoding('utf8'); // 避免多字节字符在 chunk 边界被截断

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`Ollama API error: ${parsed.error || 'Unknown error'}`));
            } else {
              resolve(parsed);
            }
          } catch (error) {
            reject(new Error(`Failed to parse Ollama response: ${error}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Ollama request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Ollama request timeout'));
      });

      req.write(body);
      req.end();
    });
  }

  protected requiresApiKey(): boolean {
    return false; // Ollama 本地模型不需要 API key
  }

  protected estimateCost(): number {
    return 0; // 本地模型无成本
  }
}
