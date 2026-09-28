/**
 * Telegram 发送服务
 * 使用 Telegram Bot API 发送简报摘要
 * 
 * 设置步骤：
 * 1. 在 Telegram 中搜索 @BotFather
 * 2. 发送 /newbot 创建新 Bot
 * 3. 获取 Bot Token
 * 4. 获取你的 Chat ID（可以发送消息给 @userinfobot）
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

export function getTelegramConfig(): TelegramConfig {
  return {
    enabled: process.env.TELEGRAM_ENABLED === 'true',
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  };
}

/**
 * 发送简单文本消息到 Telegram
 * @param message 消息内容
 * @returns 是否发送成功
 */
export async function sendTelegramMessage(message: string): Promise<boolean> {
  const config = getTelegramConfig();

  if (!config.enabled || !config.botToken || !config.chatId) {
    return false;
  }

  try {
    const apiUrl = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
      }),
    });

    const result = await response.json() as any;
    return result.ok;
  } catch (error) {
    return false;
  }
}

/**
 * 发送简报文件到 Telegram
 * @param briefingPath 简报文件路径
 * @param caption 可选的文件说明
 * @returns 是否发送成功
 */
export async function sendBriefingDocument(briefingPath: string, caption?: string): Promise<boolean> {
  const config = getTelegramConfig();

  if (!config.enabled || !config.botToken || !config.chatId) {
    return false;
  }

  if (!fs.existsSync(briefingPath)) {
    return false;
  }

  try {
    const fileContent = fs.readFileSync(briefingPath);
    const fileName = path.basename(briefingPath);
    
    const formData = new FormData();
    formData.append('chat_id', config.chatId);
    formData.append('document', new Blob([fileContent]), fileName);
    formData.append('caption', caption || '📊 AI Industry 每日简报');

    const apiUrl = `https://api.telegram.org/bot${config.botToken}/sendDocument`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json() as any;
    return result.ok;
  } catch (error) {
    return false;
  }
}

/**
 * 发送图片到 Telegram（适合发送信息图）
 * @param photoPath 图片文件路径
 * @param caption 可选的图片说明
 * @returns 是否发送成功
 */
export async function sendTelegramPhoto(photoPath: string, caption?: string): Promise<boolean> {
  const config = getTelegramConfig();

  if (!config.enabled || !config.botToken || !config.chatId) {
    return false;
  }

  if (!fs.existsSync(photoPath)) {
    return false;
  }

  try {
    const fileContent = fs.readFileSync(photoPath);
    const fileName = path.basename(photoPath);
    
    const formData = new FormData();
    formData.append('chat_id', config.chatId);
    formData.append('photo', new Blob([fileContent]), fileName);
    if (caption) {
      formData.append('caption', caption);
    }

    const apiUrl = `https://api.telegram.org/bot${config.botToken}/sendPhoto`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json() as any;

    if (!result.ok) {
      // 如果图片太大（>10MB），fallback 到 sendDocument
      if (result.description?.includes('too big') || result.description?.includes('file is too big')) {
        console.log('   图片过大，改用文件方式发送...');
        return sendBriefingDocument(photoPath, caption);
      }
      throw new Error(result.description || 'Telegram API error');
    }

    return true;
  } catch (error) {
    return false;
  }
}
