/**
 * AI API 客户端模块
 * 处理与外部 AI 服务（如 OpenAI）的通信
 */

import { AppSettings } from '@/types';

/**
 * AI API 通用响应接口
 */
interface AIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * 调用 AI API 的通用函数
 * 
 * @param settings - 应用设置，包含 API Key 和 Base URL
 * @param systemPrompt - 系统提示词，用于定义 AI 的行为
 * @param images - 图片 URL 数组（用于多模态输入）
 * @param options - 可选配置：最大 Token 数、温度、JSON 格式化提示
 */
export async function callAIAPI<T>(
    settings: AppSettings,
    systemPrompt: string,
    images: string[],
    options: {
        maxTokens?: number;
        temperature?: number;
        jsonFormatPrompt?: string;
    } = {}
): Promise<AIResponse<T>> {
    const { apiBaseUrl, apiKey, model } = settings;

    // 验证必要配置
    if (!apiKey) {
        console.error('[AI API] API Key is missing');
        return { success: false, error: 'API Key 缺失。请在设置中配置。' };
    }

    if (!apiBaseUrl) {
        console.error('[AI API] API Base URL is missing');
        return { success: false, error: 'API Base URL 缺失。请在设置中配置。' };
    }

    if (!model) {
        console.error('[AI API] Model is missing');
        return { success: false, error: '模型名称缺失。请在设置中配置。' };
    }

    try {
        // 构建完整 API 端点
        let endpoint = apiBaseUrl;
        if (!endpoint.endsWith('/chat/completions')) {
            endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
        }

        console.log('[AI API] Calling endpoint:', endpoint);
        console.log('[AI API] Using model:', model);

        // 构建消息内容
        const contentParts: any[] = [
            {
                type: 'text',
                text: systemPrompt + (options.jsonFormatPrompt ? '\n\n' + options.jsonFormatPrompt : '')
            }
        ];

        // 添加图片内容
        images.forEach(img => {
            contentParts.push({
                type: 'image_url',
                image_url: { url: img }
            });
        });

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: contentParts
                    }
                ],
                max_tokens: options.maxTokens || 2000,
                temperature: options.temperature || 0.2
            })
        });

        const responseText = await response.text();

        if (!response.ok) {
            console.error('[AI API] API Error:', response.status, responseText);
            return {
                success: false,
                error: `API 错误: ${response.status} - ${responseText.substring(0, 200)}`
            };
        }

        // 解析响应
        const result = JSON.parse(responseText);
        const content = result.choices?.[0]?.message?.content;

        if (!content || content.trim() === '') {
            console.error('[AI API] Empty content received');
            return { success: false, error: 'AI 返回了空响应' };
        }

        // 清理 JSON 字符串（移除 Markdown 代码块标记）
        let cleanedContent = content.trim();
        if (cleanedContent.startsWith('```json')) {
            cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
        } else if (cleanedContent.startsWith('```')) {
            cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }

        const parsed = JSON.parse(cleanedContent);
        return { success: true, data: parsed };

    } catch (error: any) {
        console.error('[AI API] Error:', error);
        return {
            success: false,
            error: error.message || '发生未知错误'
        };
    }
}
