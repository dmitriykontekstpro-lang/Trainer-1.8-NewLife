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
        case 'HEAVY': activityMultiplier = 1.7; break;
    }
    const tdee = Math.round(bmr * activityMultiplier);

    // 3. Goal Adjustment
    let targetCalories = tdee;
    switch (profile.mainGoal) {
        case 'WEIGHT_LOSS':
            targetCalories = Math.round(tdee * 0.85); // -15%
            break;
        case 'MUSCLE_GAIN':
            targetCalories = Math.round(tdee * 1.15); // +15%
            break;
        case 'RECOMPOSITION':
            targetCalories = tdee;
            break;
        case 'STRENGTH':
            targetCalories = Math.round(tdee * 1.10); // +10% surplus
            break;
        case 'ENDURANCE':
            targetCalories = Math.round(tdee * 1.05); // Maintenance+
            break;
    }

    // 4. Macros (Standard Split: Protein 2g/kg (approx), Fats 1g/kg, Rest Carbs)
    // Simplified Ratios for now:
    // Loss: 40% P, 35% F, 25% C
    // Gain: 30% P, 25% F, 45% C
    // Maint: 30% P, 30% F, 40% C

    let pRatio = 0.3;
    let fRatio = 0.3;
    let cRatio = 0.4;

    if (profile.mainGoal === 'WEIGHT_LOSS') {
        pRatio = 0.4; fRatio = 0.35; cRatio = 0.25;
    } else if (profile.mainGoal === 'MUSCLE_GAIN') {
        pRatio = 0.3; fRatio = 0.25; cRatio = 0.45;
    }

    const protein = Math.round((targetCalories * pRatio) / 4);
    const fats = Math.round((targetCalories * fRatio) / 9);
    const carbs = Math.round((targetCalories * cRatio) / 4);

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
