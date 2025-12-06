'use server';

import { AppSettings } from '@/types';
import { callAIAPI } from '@/lib/ai-api';

interface RecurringRecognitionResult {
    name: string;
    amount: number;
    currency: string;
    category: string;
    frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    startDate: string;
    accountName?: string;
    projectName?: string;
}

export async function recognizeRecurring(
    images: string[],
    settings: AppSettings,
    categories: string[] = [],
    accounts: string[] = [],
    projects: string[] = [],
    text: string = '',
    defaultCurrency: string = 'USD',
    defaultAccountName: string = '',
    defaultProjectName: string = ''
): Promise<{ success: boolean; data?: RecurringRecognitionResult[]; error?: string }> {
    const { apiBaseUrl, apiKey, model } = settings;

    const today = new Date().toISOString().split('T')[0];
    const categoriesStr = categories.length > 0 ? `\nExisting Categories: ${categories.join(', ')}` : '';
    const accountsStr = accounts.length > 0 ? `\nExisting Accounts: ${accounts.join(', ')}` : '';
    const projectsStr = projects.length > 0 ? `\nActive Projects: ${projects.join(', ')}` : '';

    const textContext = text ? `\n\nAdditional Text Context: "${text}"` : '';
    const accountContext = defaultAccountName ? `\nDefault Payment Account: "${defaultAccountName}"` : '';
    const projectContext = defaultProjectName ? `\nDefault Project: "${defaultProjectName}"` : '';

    const SYSTEM_PROMPT = `You are an expert accountant AI. Analyze the subscription/bill image(s) AND/OR the provided text context to extract recurring payment information.

IMPORTANT RULES:
1. **Identify Subscriptions**: Look for recurring charges like Netflix, Spotify, Rent, Utilities, Gym, etc.
2. **Frequency Detection**: Determine if the payment is WEEKLY, MONTHLY, or YEARLY. Default to MONTHLY if unclear but looks like a subscription.
3. **Start Date**: If a specific due date or start date is visible, use it. Otherwise use ${today}.
4. **TEXT-ONLY MODE**: If NO images are provided but text is given, parse the text to extract recurring payment details.
5. **TEXT AS CONTEXT**: If BOTH images and text are provided, use the text to clarify unclear information in the images.
6. **LANGUAGE SUPPORT**: Support both English and Chinese input. Output name/category in the language of the input or receipt.
7. **DEFAULT CURRENCY**: If the currency is not explicitly stated in the image or text, use "${defaultCurrency}".
8. **PAYMENT ACCOUNT**: Identify the payment method/account (e.g., "Visa 1234", "Cash", "Alipay"). Match it to one of the **Existing Accounts** if possible. If not found${defaultAccountName ? ', use the Default Payment Account.' : ', leave empty.'}
9. **PROJECT**: Analyze if the subscription belongs to a specific project (e.g., "Web Hosting", "Office Rent"). Match it to one of the **Active Projects** if possible. If not clear${defaultProjectName ? ', use the Default Project.' : ', leave empty.'}
10. Return a strict JSON ARRAY of recurring rule objects.

Output Format:
[
  {
    "name": "string",           // Service name (e.g., Netflix, Rent)
    "amount": number,           // Payment amount
    "currency": "ISO_CODE",     // e.g., USD, CNY. Default to ${defaultCurrency} if not found.
    "category": "string",       // Category name (use existing or suggest new)
    "frequency": "WEEKLY" | "MONTHLY" | "YEARLY",
    "startDate": "YYYY-MM-DD",  // Next due date or start date
    "accountName": "string",    // Payment account name (from Existing Accounts if matched)
    "projectName": "string"     // Project name (from Active Projects if matched)
  }
]

Context:
- Category: Match to existing categories when appropriate.${categoriesStr}
- Account: Match to existing accounts. ${accountsStr}
- Project: Match to active projects. ${projectsStr}
- Text: ${textContext}${accountContext}${projectContext}
- Frequency: Infer from context (e.g., "$10/month" -> MONTHLY, "Annual fee" -> YEARLY).

EXAMPLES:
- "Netflix $15.99/mo" -> { name: "Netflix", amount: 15.99, frequency: "MONTHLY", ... }
- "Yearly Gym Membership $500" -> { name: "Gym", amount: 500, frequency: "YEARLY", ... }
- Text: "Spotify premium 9.99 per month" -> { name: "Spotify", amount: 9.99, frequency: "MONTHLY", currency: "USD", ... }
- Text: "房租 3000 每月 using Chase Checking" -> { name: "房租", amount: 3000, currency: "${defaultCurrency}", frequency: "MONTHLY", accountName: "Chase Checking", ... }
- Text: "Server hosting $50/mo for App Project" -> { name: "Server Hosting", amount: 50, frequency: "MONTHLY", projectName: "App Project", ... }`;

    const result = await callAIAPI<RecurringRecognitionResult[]>(
        settings,
        SYSTEM_PROMPT,
        images,
        {
            maxTokens: 10000,
            jsonFormatPrompt: 'REQUIRED JSON FORMAT:\n[\n  {\n    "name": "string",\n    "amount": number,\n    "currency": "ISO_CODE",\n    "category": "string",\n    "frequency": "WEEKLY" | "MONTHLY" | "YEARLY",\n    "startDate": "YYYY-MM-DD",\n    "accountName": "string",\n    "projectName": "string"\n  }\n]\nReturn ONLY raw JSON array. No markdown.'
        }
    );

    if (!result.success || !result.data) {
        return { success: false, error: result.error || 'No data returned' };
    }

    let parsedData = result.data;
    if (!Array.isArray(parsedData)) {
        parsedData = [parsedData];
    }

    return { success: true, data: parsedData };
}
