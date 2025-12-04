'use server';

import { AppSettings } from '@/types';
import { callAIAPI } from '@/lib/ai-api';

interface TransferRecognitionResult {
    fromAccount: string;
    toAccount: string;
    amount: number;
    currency: string;
    targetAmount?: number;
    targetCurrency?: string;
    fee?: number;
    feeCurrency?: string;
    date: string;
    note?: string;
}

export async function recognizeTransfer(
    images: string[],
    settings: AppSettings,
    accountNames: string[] = [],
    text: string = '',
    defaultCurrency: string = 'USD'
): Promise<{ success: boolean; data?: TransferRecognitionResult; error?: string }> {
    const { apiBaseUrl, apiKey, model } = settings;

    const today = new Date().toISOString().split('T')[0];
    const textContext = text ? `\n\nAdditional Text Context: "${text}"` : '';
    const accountsContext = accountNames.length > 0
        ? `\n\nUser's Available Accounts:\n${accountNames.map(name => `- ${name}`).join('\n')}`
        : '';

    const SYSTEM_PROMPT = `You are an expert financial assistant AI. Analyze the provided image(s) AND/OR text to extract TRANSFER/REMITTANCE transaction details.

IMPORTANT RULES:
1. **TRANSFER DETECTION**: This is specifically for money transfers between accounts (bank transfer, Alipay transfer, WeChat Pay transfer, wire transfer, etc.)
2. **KEY INFORMATION TO EXTRACT**:
   - FROM account/source (转出账户)
   - TO account/recipient (转入账户)
   - Transfer amount (转账金额)
   - Currency (币种)
   - If cross-currency: target amount and target currency
   - Transaction fee (手续费) if mentioned
   - Transfer date
   - Transfer note/description

3. **ACCOUNT MATCHING**: When possible, match the extracted account names to the user's available accounts list below. Use the exact account name from the list if you find a match.${accountsContext}

4. **LANGUAGE SUPPORT**: Support both English and Chinese input. Keep account names and notes in their original language.
5. **DEFAULT CURRENCY**: If currency is not stated, use "${defaultCurrency}".
6. **TEXT-ONLY MODE**: If no images but text is provided, parse the text for transfer details.
7. **ACCOUNT NAMES**: Extract actual account names or identifiers (e.g., "工商银行储蓄卡", "Visa 1234", "支付宝", "Cash")

Output Format (strict JSON):
{
  "fromAccount": "string",        // Source account name/identifier
  "toAccount": "string",          // Destination account name/identifier  
  "amount": number,               // Amount sent from source
  "currency": "ISO_CODE",         // e.g., USD, CNY, EUR
  "targetAmount": number,         // (optional) Amount received if different
  "targetCurrency": "ISO_CODE",   // (optional) Currency received if cross-currency
  "fee": number,                  // (optional) Transaction fee
  "feeCurrency": "ISO_CODE",      // (optional) Fee currency
  "date": "YYYY-MM-DD",          // Transfer date, default to ${today} if not found
  "note": "string"                // (optional) Transfer description/note
}

Context:
- Text: ${textContext}

EXAMPLES:
- "从工商银行转账500元到支付宝" → fromAccount="工商银行", toAccount="支付宝", amount=500, currency="CNY"
- "Wire $1000 from Chase to Wells Fargo, fee $25" → fromAccount="Chase", toAccount="Wells Fargo", amount=1000, currency="USD", fee=25
- Image of Alipay transfer showing 100 CNY sent → Extract all visible details`;

    if (images.length === 0 && !text) {
        return { success: false, error: 'No images or text provided' };
    }

    const result = await callAIAPI<TransferRecognitionResult>(
        settings,
        SYSTEM_PROMPT,
        images,
        {
            maxTokens: 2000,
            jsonFormatPrompt: 'Return ONLY raw JSON object. No markdown.'
        }
    );

    if (!result.success) {
        return { success: false, error: result.error };
    }

    if (!result.data) {
        return { success: false, error: 'AI returned empty response' };
    }

    console.log('[recognizeTransfer] Successfully parsed transfer:', result.data);
    return { success: true, data: result.data };
}
