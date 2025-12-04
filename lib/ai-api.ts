import { AppSettings } from '@/types';

interface AIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

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

    if (!apiKey) {
        console.error('[AI API] API Key is missing');
        return { success: false, error: 'API Key is missing. Please configure it in Settings.' };
    }

    if (!apiBaseUrl) {
        console.error('[AI API] API Base URL is missing');
        return { success: false, error: 'API Base URL is missing. Please configure it in Settings.' };
    }

    if (!model) {
        console.error('[AI API] Model is missing');
        return { success: false, error: 'Model is missing. Please configure it in Settings.' };
    }

    try {
        let endpoint = apiBaseUrl;
        if (!endpoint.endsWith('/chat/completions')) {
            endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
        }

        console.log('[AI API] Calling endpoint:', endpoint);
        console.log('[AI API] Using model:', model);

        const contentParts: any[] = [
            {
                type: 'text',
                text: systemPrompt + (options.jsonFormatPrompt ? '\n\n' + options.jsonFormatPrompt : '')
            }
        ];

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
                error: `API Error: ${response.status} - ${responseText.substring(0, 200)}`
            };
        }

        const result = JSON.parse(responseText);
        const content = result.choices?.[0]?.message?.content;

        if (!content || content.trim() === '') {
            console.error('[AI API] Empty content received');
            return { success: false, error: 'AI returned empty response' };
        }

        // Clean JSON
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
            error: error.message || 'Unknown error occurred'
        };
    }
}
