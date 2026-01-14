const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

export interface FoodAnalysisResult {
    isFood: boolean;
    foodName: string;
    calories: number;
    protein: number;
    fats: number;
    carbs: number;
    portion: string;
    weight: number;
    foodType: string;
    confidence: 'EXACT' | 'HIGH' | 'MEDIUM' | 'LOW';
    recognizedText?: string;
}

interface UserHints {
    foodName?: string;
    weight?: string;
    portionSize?: 'S' | 'M' | 'L';
}

/**
 * Build prompt for GPT-4 Vision with structured hints
 */
const buildPrompt = (hints: UserHints): string => {
    const hintsParts = [];
    if (hints.foodName) hintsParts.push(`Название от пользователя: "${hints.foodName}"`);
    if (hints.weight) hintsParts.push(`Вес от пользователя: ${hints.weight}г`);
    if (hints.portionSize) {
        const sizeDesc = hints.portionSize === 'S' ? 'Маленькая' : hints.portionSize === 'M' ? 'Средняя' : 'Большая';
        hintsParts.push(`Размер порции: ${sizeDesc} (${hints.portionSize})`);
    }

    const hintsText = hintsParts.length > 0
        ? `ПОДСКАЗКИ ПОЛЬЗОВАТЕЛЯ (учитывай их приоритетно, особенно вес!):\n${hintsParts.join('\n')}`
        : 'ПОДСКАЗОК НЕТ, определи сам.';

    return `
Ты эксперт по питанию и OCR-сканер. Твоя задача выполниться В ДВА ЭТАПА в рамках одного ответа.

ЭТАП 1: OCR (Распознавание текста)
Внимательно прочитай ВЕСЬ текст на фото (название, бренд, вес, nutrition facts, состав).
Если текста нет - напиши "Текст не найден".

ЭТАП 2: АНАЛИЗ ПИТАНИЯ
Используя текст из Этапа 1 и визуал, определи КБЖУ.
- Если нашел таблицу КБЖУ: пересчитай на ВЕСЬ вес упаковки.
- Если нашел вес: используй его.
- Если текста нет: оценивай визуально.

ПОДСКАЗКИ ПОЛЬЗОВАТЕЛЯ:
${hintsText}

ФОРМАТ JSON (строго):
{
   "isFood": true,
   "recognizedText": "Здесь выпиши весь найденный текст с упаковки (бренд, состав, кбжу цифры)...",
   "foodName": "Название Продукта",
   "portion": "описание порции",
   "weight": 100, (число в граммах)
   "foodType": "Категория",
   "calories": 250, (ИТОГО)
   "protein": 10,
   "fats": 10,
   "carbs": 30,
   "confidence": "HIGH" (EXACT если КБЖУ считано с упаковки, иначе HIGH/MEDIUM/LOW)
}

ВАЖНО: Поле "recognizedText" обязательно заполни тем, что смог прочитать. Это критично для точности.
`.trim();
};

export const analyzeFoodPhoto = async (
    photoBase64: string,
    hints: UserHints = {}
): Promise<FoodAnalysisResult> => {
    if (!OPENAI_API_KEY) {
        console.error('API Key missing. Checked EXPO_PUBLIC_OPENAI_API_KEY');
        throw new Error('OpenAI API Key not configured');
    }

    const prompt = buildPrompt(hints);

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${photoBase64}`,
                                    detail: 'low'
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 500,
                temperature: 0.3
            })
        });

        const data = await response.json();

        if (!data.choices?.[0]?.message?.content) {
            console.error('OpenAI Raw Response:', JSON.stringify(data));
            throw new Error('Invalid response from AI');
        }

        let content = data.choices[0].message.content;
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();

        const result: FoodAnalysisResult = JSON.parse(content);

        // Check isFood flag
        if (result.isFood === false) {
            return {
                isFood: false, foodName: '', calories: 0, protein: 0, fats: 0, carbs: 0, portion: '', weight: 0, foodType: '', confidence: 'LOW'
            };
        }

        return result;

    } catch (error) {
        console.error('AI Analysis failed:', error);
        throw error;
    }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeFoodPhotoWithRetry = async (
    photoBase64: string,
    hints: UserHints = {},
    retries = 3
): Promise<FoodAnalysisResult> => {
    try {
        return await analyzeFoodPhoto(photoBase64, hints);
    } catch (error) {
        if (retries > 0) {
            console.log(`Retrying analysis... (${retries} left)`);
            await sleep(1000 * (4 - retries));
            return analyzeFoodPhotoWithRetry(photoBase64, hints, retries - 1);
        }
        throw error;
    }
};
