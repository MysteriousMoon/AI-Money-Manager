'use server';

export async function fetchAIModels(baseUrl: string, apiKey: string) {
    try {
        // 确保 baseUrl 以 /v1 结尾或是支持 /models 的根路径
        // OpenAI 标准是 GET /v1/models
        let url = baseUrl.replace(/\/+$/, '');
        if (!url.endsWith('/v1')) {
            url += '/v1';
        }
        url += '/models';

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to fetch models:', response.status, errorText);
            return { success: false, error: `Failed to fetch models: ${response.statusText}` };
        }

        const data = await response.json();

        // OpenAI 响应格式: { data: [{ id: 'model-name', ... }, ...] }
        if (data && Array.isArray(data.data)) {
            const models = data.data.map((m: any) => m.id).sort();
            return { success: true, models };
        }

        return { success: false, error: 'Invalid response format' };
    } catch (error) {
        console.error('Error fetching models:', error);
        return { success: false, error: 'Network error or invalid URL' };
    }
}
