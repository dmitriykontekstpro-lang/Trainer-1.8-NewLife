import OpenAI from 'openai';

const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
const client = new OpenAI({ apiKey: API_KEY });

export async function identifyWeightFromImage(base64Image: string): Promise<number> {
    try {
        // OpenAI Vision API (GPT-4 Vision)
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini", // Cheaper vision model
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Read the numeric value from the image.
            
SCENARIO A: BATHROOM SCALE / FLOOR SCALE
- If this looks like a digital or analog scale for a person standing on it, return the weight shown on the display.

SCENARIO B: GYM EQUIPMENT
- If this is a weight stack, look for the selector pin.
- If this is a dumbbell/plate, look for the stamped number.

Output rules:
- Return ONLY the number (e.g. "85.4", "45", "100").
- Do not include units.
- If multiple numbers are visible, prioritize the one that represents the 'selected' or 'displayed' main value.
- If unsure, return "0".`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 50
        });

        const text = response.choices[0]?.message?.content || "0";
        // Sanitize output to find the first number
        const match = text.match(/(\d+(\.\d+)?)/);
        const weight = match ? parseFloat(match[0]) : 0;

        return weight;
    } catch (error) {
        console.error("OpenAI Vision Error:", error);
        return 0;
    }
}
