import { UserProfile } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

export interface TrainerJson {
    exercises: { group: string; list: string[] }[];
    nutrition: {
        calories: number;
        delta: string; // Surplus or Deficit value
        protein: { grams: number; percent: number };
        fats: { grams: number; percent: number };
        carbs: { grams: number; percent: number };
    };
    progress: {
        pace: string;
        description: string;
    };
    goal: {
        percent: number;
        startWeight: number;
        currentWeight: number;
        targetWeight: number;
        message: string;
    };
}

const getActivityLabel = (level: string) => {
    switch (level) {
        case 'SEDENTARY': return 'Сидячий образ жизни, без спорта';
        case 'LIGHT': return 'Легкая активность (1-3 тренировки в неделю)';
        case 'MODERATE': return 'Средняя активность (3-5 тренировок)';
        case 'HEAVY': return 'Высокая активность (тяжелый труд или спорт каждый день)';
        default: return level;
    }
};

const getSleepLabel = (sleep: string) => {
    switch (sleep) {
        case 'LESS_6': return 'Меньше 6 часов (Недосып)';
        case '7_8': return '7-8 часов (Норма)';
        case 'MORE_9': return 'Более 9 часов';
        default: return sleep;
    }
}

export const generateTrainerAdvice = async (profile: UserProfile, currentWeight?: number): Promise<TrainerJson> => {
    if (!API_KEY) {
        throw new Error('OpenAI Key not found');
    }

    const goalText = profile.mainGoal === 'MUSCLE_GAIN' ? 'Набор мышечной массы (Гипертрофия)' :
        profile.mainGoal === 'WEIGHT_LOSS' ? 'Сжиросжигание (Дефицит калорий)' : 'Рекомпозиция (Баланс)';

    const genderEx = profile.gender === 'MALE' ? 'Мужчина' : 'Женщина';
    const effectiveCurrentWeight = currentWeight || profile.weight;

    // Build explicit physics description
    const physics = `
    - Пол: ${genderEx}
    - Возраст: ${profile.age} лет
    - Рост: ${profile.height} см
    - Текущий Вес: ${effectiveCurrentWeight} кг (Стартовый был: ${profile.weight} кг)
    - Целевой Вес: ${profile.targetWeight} кг
    - Уровень жира: ${profile.bodyFat || 'Не указан'}
    `;

    const lifestyle = `
    - Активность: ${getActivityLabel(profile.activityLevel)}
    - Сон: ${getSleepLabel(profile.sleepDuration)}
    - Опыт тренировок: ${profile.experience}
    - Травмы: ${profile.injuries && profile.injuries.length > 0 ? profile.injuries.join(', ') : 'Здоров'}
    - Хронические: ${profile.chronic && profile.chronic.length > 0 ? profile.chronic.join(', ') : 'Нет'}
    `;

    const prompt = `
    РОЛЬ:
    Ты опытный тренер (мужчина, 45 лет, стаж 20+ лет). 
    Ты опираешься на научный подход и свой огромный опыт. 
    Твой стиль общения: профессиональный, четкий, без воды, мотивирующий.

    ПОРТРЕТ ПОДОПЕЧНОГО:
    ${physics}
    ${lifestyle}
    
    ЦЕЛЬ: ${goalText}
    Режим тренировок: ${profile.daysPerWeek} раз(а) в неделю по ${profile.sessionDuration} мин.

    ЗАДАЧА - Сформировать отчет в формате JSON:
    
    1. ARSENAL (УПРАЖНЕНИЯ):
       Предложи ровно по 3 (ТРИ) самых эффективных упражнения для каждой из следующих групп мышц:
       - ГРУДЬ
       - СПИНА
       - НОГИ (Квадрицепс/Бицепс бедра)
       - ПЛЕЧИ (Дельты)
       - РУКИ (Бицепс + Трицепс)
       - ПРЕСС
       Упражнения должны соответствовать уровню опыта (${profile.experience}) и учитывать травмы (${profile.injuries?.join(', ') || 'нет'}).
       
    2. NUTRITION (КБЖУ):
       Рассчитай КБЖУ используя формулу Миффлина-Сан Жеора, учитывая ПОЛ, ВОЗРАСТ, РОСТ, ВЕС и АКТИВНОСТЬ.
       Сделай поправку на цель:
       - Для похудения: дефицит 10-20%.
       - Для массы: профицит 10-15%.
       - Для рекомпозиции: около поддержки.
       
       ВАЖНО: В поле "delta" укажи этот профицит/дефицит текстом (например "+350 ккал" или "-500 ккал"). Если норма (0), пиши "Поддержка".
       Белки: 1.6-2.2г на кг веса. Жиры: 0.8-1g. Остальное углеводы.

    3. PROGRESS (ПРОГНОЗ):
       Рассчитай реалистичный средний темп прогресса (кг в неделю).
       
    4. GOAL STATUS (СТАТУС ЦЕЛИ):
       Рассчитай % достижения цели от [Стартовый Вес] до [Целевой Вес].
       Формула: (Старт - Текущий) / (Старт - Цель). 
       Если Текущий == Стартовый, 0%.
       Максимум 100%.

    ФОРМАТ ОТВЕТА (Строго JSON, без markdown-обертки):
    {
       "exercises": [ { "group": "ГРУДЬ", "list": ["Жим", "Разводка", "..."] }, ... ],
       "nutrition": { 
           "calories": 2500, 
           "delta": "+300 ккал",
           "protein": { "grams": 160, "percent": 30 },
           "fats": { "grams": 70, "percent": 25 },
           "carbs": { "grams": 300, "percent": 45 }
       },
       "progress": {
           "pace": "0.5 кг/нед",
           "description": "Пояснение..."
       },
       "goal": {
           "percent": 0,
           "startWeight": ${profile.weight},
           "currentWeight": ${effectiveCurrentWeight},
           "targetWeight": ${profile.targetWeight},
           "message": "Цитата..."
       }
    }
    `;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: 'You are a fitness expert. Output JSON only.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }

        const content = data.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error('OpenAI Call Failed:', error);
        throw error;
    }
};
