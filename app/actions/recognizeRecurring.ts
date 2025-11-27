'use server';

import { AppSettings } from '@/types';

interface RecurringRecognitionResult {
    name: string;
    amount: number;
    currency: string;
    category: string;
    frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    startDate: string;
}

export async function recognizeRecurring(
    images: string[],
    settings: AppSettings,
    categories: string[] = [],
    text: string = ''
): Promise<{ success: boolean; data?: RecurringRecognitionResult[]; error?: string }> {
    const { apiBaseUrl, apiKey, model } = settings;

    const today = new Date().toISOString().split('T')[0];
    const categoriesStr = categories.length > 0 ? `\nExisting Categories: ${categories.join(', ')}` : '';
    const textContext = text ? `\n\nAdditional Text Context: "${text}"` : '';

    const SYSTEM_PROMPT = `You are an expert accountant AI. Analyze the subscription/bill image(s) AND/OR the provided text context to extract recurring payment information.

IMPORTANT RULES:
1. **Identify Subscriptions**: Look for recurring charges like Netflix, Spotify, Rent, Utilities, Gym, etc.
2. **Frequency Detection**: Determine if the payment is WEEKLY, MONTHLY, or YEARLY. Default to MONTHLY if unclear but looks like a subscription.
3. **Start Date**: If a specific due date or start date is visible, use it. Otherwise use ${today}.
4. **TEXT-ONLY MODE**: If NO images are provided but text is given, parse the text to extract recurring payment details.
5. **TEXT AS CONTEXT**: If BOTH images and text are provided, use the text to clarify unclear information in the images.
6. Return a strict JSON ARRAY of recurring rule objects.

Output Format:
[
  {
    "name": "string",           // Service name (e.g., Netflix, Rent)
    "amount": number,           // Payment amount
    "currency": "ISO_CODE",     // e.g., USD, CNY
    "category": "string",       // Category name (use existing or suggest new)
    "frequency": "WEEKLY" | "MONTHLY" | "YEARLY",
    "startDate": "YYYY-MM-DD"   // Next due date or start date
  }
]

Context:
- Category: Match to existing categories when appropriate.${categoriesStr}
- Text: ${textContext}
- Frequency: Infer from context (e.g., "$10/month" -> MONTHLY, "Annual fee" -> YEARLY).

EXAMPLES:
- "Netflix $15.99/mo" -> { name: "Netflix", amount: 15.99, frequency: "MONTHLY", ... }
- "Yearly Gym Membership $500" -> { name: "Gym", amount: 500, frequency: "YEARLY", ... }
- Text: "Spotify premium 9.99 per month" -> { name: "Spotify", amount: 9.99, frequency: "MONTHLY", ... }`;

    if (!apiKey) return { success: false, error: 'API Key is missing.' };
    if (!apiBaseUrl) return { success: false, error: 'API Base URL is missing.' };
    if (!model) return { success: false, error: 'Model is missing.' };

    try {
        let endpoint = apiBaseUrl;
        if (!endpoint.endsWith('/chat/completions')) {
            endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
        }

        const contentParts: any[] = [
            {
                type: 'text',
                text: SYSTEM_PROMPT + '\n\nREQUIRED JSON FORMAT:\n[\n  {\n    "name": "string",\n    "amount": number,\n    "currency": "ISO_CODE",\n    "category": "string",\n    "frequency": "WEEKLY" | "MONTHLY" | "YEARLY",\n    "startDate": "YYYY-MM-DD"\n  }\n]\nReturn ONLY raw JSON array. No markdown.',
            }
        ];

        images.forEach(img => {
            contentParts.push({
                type: 'image_url',
                image_url: { url: img },
            });
        });

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: contentParts }],
                max_tokens: 10000,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, error: `API Error: ${response.status} - ${errorText}` };
        }

        const result = await response.json();
        const content = result.choices[0]?.message?.content;

        if (!content) return { success: false, error: 'No content received from AI.' };

        let parsedData: RecurringRecognitionResult[];
        try {
            const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
            parsedData = JSON.parse(cleanContent);
            if (!Array.isArray(parsedData)) parsedData = [parsedData];
        } catch (e) {
            return { success: false, error: 'Failed to parse AI response.' };
        }

        return { success: true, data: parsedData };

    } catch (error: any) {
        return { success: false, error: 'Recognition error: ' + (error.message || String(error)) };
    }
}
