import { UserProfile, NutritionPlan } from '../types';

export const calculateNutrition = (profile: UserProfile): NutritionPlan => {
    // 1. BMI Calculation
    const bmr = calculateBMR(profile);

    // 2. TDEE Calculation
    let activityMultiplier = 1.2;
    switch (profile.activityLevel) {
        case 'SEDENTARY': activityMultiplier = 1.2; break;
        case 'LIGHT': activityMultiplier = 1.375; break;
        case 'MODERATE': activityMultiplier = 1.55; break;
        case 'HEAVY': activityMultiplier = 1.725; break;
        case 'EXTREME': activityMultiplier = 1.9; break;
    }
    const tdee = Math.round(bmr * activityMultiplier);

    // 3. Goal Adjustment
    let targetCalories = tdee;
    let goalLabel = 'MAINTENANCE'; // For debug or UI hints if needed

    switch (profile.mainGoal) {
        case 'WEIGHT_LOSS':
            targetCalories = Math.round(tdee * 0.80); // -20%
            break;
        case 'MUSCLE_GAIN':
            targetCalories = Math.round(tdee * 1.10); // +10% (Clean bulk)
            break;
        case 'RECOMPOSITION':
            targetCalories = tdee;
            break;
        case 'MAINTENANCE':
            targetCalories = tdee;
            break;
        case 'CUTTING':
            targetCalories = Math.round(tdee * 0.75); // Aggressive -25%
            break;
        case 'STRENGTH':
            targetCalories = Math.round(tdee * 1.15); // +15%
            break;
        case 'ENDURANCE':
            targetCalories = Math.round(tdee * 1.05); // +5%
            break;
    }

    // 4. Macros (Weight Based: P=2g/kg, F=1g/kg, C=Rest)
    // Formula from screenshot:
    // Protein = W * 2
    // Fats = W * 1
    // Carbs = (Target - (P*4 + F*9)) / 4

    let protein = Math.round(profile.weight * 2);
    let fats = Math.round(profile.weight * 1);

    // Adjust for specific goals if needed manually, but user asked for THIS formula.
    // However, if caloric needs are very high (Bulk), fixed Protein might be too low relative to total?
    // No, 2g/kg is standard. Carbs will fill the gap.
    // If caloric needs are very low, Carbs might be too low.
    // Let's implement clamp or logic?
    // User request: "Fix formulas... P=W*2, F=W*1". I will stick to it.

    const proteinCal = protein * 4;
    const fatsCal = fats * 9;
    let remainingCal = targetCalories - (proteinCal + fatsCal);

    if (remainingCal < 0) remainingCal = 0; // Safety check

    const carbs = Math.round(remainingCal / 4);

    return {
        bmr: Math.round(bmr),
        tdee,
        targetCalories,
        protein,
        fats,
        carbs
    };
};

const calculateBMR = (profile: UserProfile): number => {
    // Mifflin-St Jeor
    // Men: (10 × weight) + (6.25 × height) - (5 × age) + 5
    // Women: (10 × weight) + (6.25 × height) - (5 × age) - 161

    let base = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age);
    if (profile.gender === 'MALE') {
        base += 5;
    } else {
        base -= 161;
    }
    return base;
};
