'use server';

import { AppSettings } from '@/types';

interface TransactionItem {
    name: string;
    category: string;
    amount: number;
}

interface RecognitionResult {
    amount: number;
    currency: string;
    merchant: string;
    date: string;
    category: string;
    summary: string;
}

export async function recognizeReceipt(
    images: string[],
    settings: AppSettings,
    categories: string[] = [],
    text: string = ''
): Promise<{ success: boolean; data?: RecognitionResult[]; error?: string }> {
    const { apiBaseUrl, apiKey, model } = settings;

    const today = new Date().toISOString().split('T')[0];
    const categoriesStr = categories.length > 0 ? `\nExisting Categories: ${categories.join(', ')}` : '';
    const textContext = text ? `\n\nAdditional Text Context: "${text}"` : '';

    const SYSTEM_PROMPT = `You are an expert accountant AI. Analyze the receipt/bill image(s) AND/OR the provided text context to extract transaction details.
    
IMPORTANT RULES:
1. **SPLIT BY CATEGORY**: If a single receipt contains items from different categories (e.g., Food + Electronics, or Groceries + Clothing), you MUST create SEPARATE transactions for each category.
   - Example: Walmart receipt with $50 food + $200 electronics = 2 transactions
   - Group items of the same category together with their subtotal
2. **MULTIPLE RECEIPTS**: If multiple receipt images are provided, analyze all of them and create transactions for each.
3. **TEXT-ONLY MODE**: If NO images are provided but text is given, parse the text to extract transaction details.
4. **TEXT AS CONTEXT**: If BOTH images and text are provided, use the text to clarify unclear information in the images.
5. **AMOUNT CALCULATION**: For split transactions, calculate the subtotal for each category group accurately.
6. **MERCHANT vs SUMMARY**:
   - **merchant**: Write the PLATFORM/STORE name (e.g., "Amazon", "Instacart", "Walmart")
   - **summary**: Write SPECIFIC ITEMS purchased with brand/product details (e.g., "FoodBasic:[and some details]")
7. Return a strict JSON ARRAY of transaction objects.

Output Format:
[
  {
    "amount": number,           // Subtotal for this category
    "currency": "ISO_CODE",     // e.g., USD, CNY, EUR
    "merchant": "string",       // PLATFORM/STORE name (Amazon, Instacart, Walmart, etc.)
    "date": "YYYY-MM-DD",      // Transaction date. If not visible, use ${today}
    "category": "string",       // Category name
    "summary": "string"         // SPECIFIC items with brand/details
  }
]

Context:
- Category: Match to existing categories when appropriate. If no good match, suggest a descriptive new category name.${categoriesStr}
- Text: ${textContext}
IMPORTANT:
- **TOTAL AMOUNT**: Always look for the FINAL TOTAL (after tax/discounts) at the bottom of the receipt. Do not use the subtotal unless it is the only amount available.

EXAMPLES:
- Single receipt (Walmart) with Food ($30) + Electronics ($150) → Return 2 objects
- Two separate receipts → Return 2+ objects
- Single receipt with only one category → Return 1 object
- Amazon receipt: merchant="Amazon", summary="美的加湿器, 飞利浦电动牙刷"
- Instacart receipt: merchant="Instacart", summary="FoodBasic牛奶, 鸡蛋, 有机苹果"
- Text: "Paid $25 for lunch at Chipotle" → Return 1 object with category "Food"`;

    if (!apiKey) {
        console.error('[recognizeReceipt] API Key is missing');
        return { success: false, error: 'API Key is missing. Please configure it in Settings.' };
    }

    if (!apiBaseUrl) {
        console.error('[recognizeReceipt] API Base URL is missing');
        return { success: false, error: 'API Base URL is missing. Please configure it in Settings.' };
    }

    if (!model) {
        console.error('[recognizeReceipt] Model is missing');
        return { success: false, error: 'Model is missing. Please configure it in Settings.' };
    }

    if (images.length === 0 && !text) {
        return { success: false, error: 'No images or text provided.' };
    }

    try {
        let endpoint = apiBaseUrl;
        if (!endpoint.endsWith('/chat/completions')) {
            endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
        }

        console.log('[recognizeReceipt] Calling AI API:', endpoint);
        console.log('[recognizeReceipt] Using model:', model);
        console.log('[recognizeReceipt] Number of images:', images.length);
        console.log('[recognizeReceipt] Text length:', text.length);
        console.log('[recognizeReceipt] Categories:', categories.length);

        // Log image sizes for diagnostics
        images.forEach((img, idx) => {
            const sizeKB = Math.round(img.length / 1024);
            console.log(`[recognizeReceipt] Image ${idx + 1} size: ${sizeKB} KB`);
        });

        const contentParts: any[] = [
            {
                type: 'text',
                text: SYSTEM_PROMPT + '\n\nREQUIRED JSON FORMAT:\n[\n  {\n    "amount": number,\n    "currency": "ISO_CODE",\n    "merchant": "string",\n    "date": "YYYY-MM-DD",\n    "category": "string",\n    "summary": "string"\n  }\n]\nReturn ONLY raw JSON array. No markdown.',
            }
        ];

        images.forEach(imgBase64 => {
            contentParts.push({
                type: 'image_url',
                image_url: { url: imgBase64 }
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
                max_tokens: 20000,
                temperature: 0.2
            })
        });

        const responseText = await response.text();
        console.log('[recognizeReceipt] Raw AI Response:', responseText.substring(0, 500));

        if (!response.ok) {
            console.error('[recognizeReceipt] API Error:', response.status, responseText);
            return {
                success: false,
                error: `API Error: ${response.status} - ${responseText.substring(0, 200)}`
            };
        }

        const result = JSON.parse(responseText);

        // Detailed diagnostics
        console.log('[recognizeReceipt] Response structure:', {
            hasChoices: !!result.choices,
            choicesLength: result.choices?.length,
            finishReason: result.choices?.[0]?.finish_reason,
            hasContent: !!result.choices?.[0]?.message?.content,
            contentLength: result.choices?.[0]?.message?.content?.length || 0,
            usage: result.usage
        });

        const content = result.choices?.[0]?.message?.content;
        const finishReason = result.choices?.[0]?.finish_reason;

        if (!content || content.trim() === '') {
            console.error('[recognizeReceipt] AI returned empty content');
            console.error('[recognizeReceipt] Finish reason:', finishReason);
            console.error('[recognizeReceipt] Full response:', JSON.stringify(result, null, 2));

            // Provide more specific error messages
            if (finishReason === 'stop' && result.usage?.completion_tokens === 0) {
                return {
                    success: false,
                    error: 'AI model refused to generate content. This may be due to:\n' +
                        '1. Safety filters blocking the image content\n' +
                        '2. Image quality or format issues\n' +
                        '3. Model configuration problems\n' +
                        'Try a different image or check model settings.'
                };
            }

            return {
                success: false,
                error: `AI returned empty response (finish_reason: ${finishReason})`
            };
        }

        console.log('[recognizeReceipt] AI Content:', content);

        // Clean JSON
        let cleanedContent = content.trim();
        if (cleanedContent.startsWith('```json')) {
            cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
        } else if (cleanedContent.startsWith('```')) {
            cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }

        console.log('[recognizeReceipt] Cleaned content:', cleanedContent);

        const parsed: RecognitionResult[] = JSON.parse(cleanedContent);

        if (!Array.isArray(parsed) || parsed.length === 0) {
            return { success: false, error: 'Invalid response format from AI' };
        }

        console.log('[recognizeReceipt] Successfully parsed:', parsed.length, 'transactions');
        return { success: true, data: parsed };

    } catch (error: any) {
        console.error('[recognizeReceipt] Error:', error);
        return {
            success: false,
            error: error.message || 'Unknown error occurred'
        };
    }
}
