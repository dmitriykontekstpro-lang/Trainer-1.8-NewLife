import { FoodAnalysisResult } from "./foodAnalyzer";

const BASE_URL = 'https://world.openfoodfacts.org/api/v0/product/';

export const fetchProductByBarcode = async (barcode: string): Promise<FoodAnalysisResult | null> => {
    try {
        console.log(`[OpenFoodFacts] Searching for barcode: ${barcode}`);
        const response = await fetch(`${BASE_URL}${barcode}.json`);
        const data = await response.json();

        if (data.status === 1 && data.product) {
            const p = data.product;

            // Extract Nutrients (try per 100g first)
            const nutriments = p.nutriments || {};
            const servingSize = p.serving_size || '100g'; // Fallback text

            // Try to parse serving size grams
            let servingWeight = 100;
            // "45 g (1 BAR)" -> 45
            const servingMatch = servingSize.match(/(\d+(\.\d+)?)\s*g/i);
            if (servingMatch) {
                servingWeight = parseFloat(servingMatch[1]);
            } else if (p.product_quantity) {
                servingWeight = parseFloat(p.product_quantity);
            }

            // Calories per 100g
            const cal100 = nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0;
            const prot100 = nutriments.proteins_100g || nutriments.proteins || 0;
            const fat100 = nutriments.fat_100g || nutriments.fat || 0;
            const carb100 = nutriments.carbohydrates_100g || nutriments.carbohydrates || 0;

            // Calculate total for serving/package
            const ratio = servingWeight / 100;

            return {
                isFood: true,
                foodName: p.product_name || p.generic_name || 'Неизвестный продукт',
                foodType: p.categories ? p.categories.split(',')[0] : 'Упаковка',
                portion: `Упаковка/Порция (${servingWeight}г)`,
                weight: servingWeight,
                calories: Math.round(cal100 * ratio),
                protein: Math.round(prot100 * ratio),
                fats: Math.round(fat100 * ratio),
                carbs: Math.round(carb100 * ratio),
                confidence: 'EXACT' // 100% Accuracy from DB
            };
        }

        console.log('[OpenFoodFacts] Product not found');
        return null;

    } catch (e) {
        console.error('[OpenFoodFacts] Error:', e);
        return null;
    }
};
