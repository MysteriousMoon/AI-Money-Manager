'use server';

import { AppSettings } from '@/types';
import { callAIAPI } from '@/lib/ai-api';

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
    accountName?: string;
}

export async function recognizeReceipt(
    images: string[],
    settings: AppSettings,
    categories: string[] = [],
    text: string = '',
    defaultCurrency: string = 'USD',
    defaultAccountName: string = ''
): Promise<{ success: boolean; data?: RecognitionResult[]; error?: string }> {
    const { apiBaseUrl, apiKey, model } = settings;

    const today = new Date().toISOString().split('T')[0];
    const categoriesStr = categories.length > 0 ? `\nExisting Categories: ${categories.join(', ')}` : '';
    const textContext = text ? `\n\nAdditional Text Context: "${text}"` : '';
    const accountContext = defaultAccountName ? `\nDefault Payment Account: "${defaultAccountName}"` : '';

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
   - **summary**: Write SPECIFIC items purchased with brand/product details (e.g., "FoodBasic:[and some details]")
7. **LANGUAGE SUPPORT**: Support both English and Chinese input. Output summary/merchant in the language of the input or receipt.
8. **DEFAULT CURRENCY**: If the currency is not explicitly stated in the image or text, use "${defaultCurrency}".
9. **PAYMENT ACCOUNT**: Identify the payment method/account (e.g., "Visa 1234", "Cash", "Alipay"). If not found${defaultAccountName ? ', use the Default Payment Account' : ''}.
10. Return a strict JSON ARRAY of transaction objects.

Output Format:
[
  {
    "amount": number,           // Subtotal for this category
    "currency": "ISO_CODE",     // e.g., USD, CNY, EUR. Default to ${defaultCurrency} if not found.
    "merchant": "string",       // PLATFORM/STORE name (Amazon, Instacart, Walmart, etc.)
    "date": "YYYY-MM-DD",      // Transaction date. If not visible, use ${today}
    "category": "string",       // Category name
    "summary": "string",        // SPECIFIC items with brand/details
    "accountName": "string"     // Payment account/method name
  }
]

Context:
- Category: Match to existing categories when appropriate. If no good match, suggest a descriptive new category name.${categoriesStr}
- Text: ${textContext}${accountContext}
IMPORTANT:
- **TOTAL AMOUNT**: Always look for the FINAL TOTAL (after tax/discounts) at the bottom of the receipt. Do not use the subtotal unless it is the only amount available.

EXAMPLES:
- Single receipt (Walmart) with Food ($30) + Electronics ($150) → Return 2 objects
- Two separate receipts → Return 2+ objects
- Single receipt with only one category → Return 1 object
- Amazon receipt: merchant="Amazon", summary="美的加湿器, 飞利浦电动牙刷"
- Instacart receipt: merchant="Instacart", summary="FoodBasic牛奶, 鸡蛋, 有机苹果"
- Text: "Paid $25 for lunch at Chipotle" → Return 1 object with category "Food", currency "USD"
- Text: "午饭 麦当劳 35" → Return 1 object with category "Food", amount 35, currency "${defaultCurrency}"`;

    const result = await callAIAPI<RecognitionResult[]>(
        settings,
        SYSTEM_PROMPT,
        images,
        {
            maxTokens: 20000,
            jsonFormatPrompt: 'REQUIRED JSON FORMAT:\n[\n  {\n    "amount": number,\n    "currency": "ISO_CODE",\n    "merchant": "string",\n    "date": "YYYY-MM-DD",\n    "category": "string",\n    "summary": "string"\n  }\n]\nReturn ONLY raw JSON array. No markdown.'
        }
    );

    if (!result.success) {
        return { success: false, error: result.error };
    }

    if (!Array.isArray(result.data) || result.data.length === 0) {
        return { success: false, error: 'Invalid response format from AI' };
    }

    return { success: true, data: result.data };
}
