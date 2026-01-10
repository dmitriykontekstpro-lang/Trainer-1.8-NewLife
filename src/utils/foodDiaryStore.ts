import { supabase } from '../lib/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItemJSON, DailyNutritionSummary, MealType, NutritionPlan, FoodAnalysisResult } from '../types';

const STORAGE_KEY = 'food_diary_entries';

// Helper: Generate UUID (if not using a library)
export const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Helper: Get today's key YYYY-MM-DD
export const getLocalDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

// --- CORE STORE LOGIC ---

// 1. Load Local Entries
const loadLocalEntries = async (): Promise<FoodItemJSON[]> => {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (e) {
        console.error('Failed to load local food entries', e);
        return [];
    }
};

// 2. Save Local Entries
const saveLocalEntries = async (entries: FoodItemJSON[]) => {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
        console.error('Failed to save local food entries', e);
    }
};

/**
 * Sync logic with Supabase (Upsert day_json)
 */
const syncDayWithSupabase = async (dateKey: string, entriesForDay: FoodItemJSON[]) => {
    try {
        const userId = (global as any).userId;
        if (!userId || userId === 'offline-user') return;

        console.log(`[FoodStore] Syncing ${dateKey} to Supabase...`, entriesForDay);

        const { error } = await supabase
            .from('food_diary')
            .upsert({
                user_id: userId,
                date: dateKey,
                day_json: entriesForDay,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, date' });

        if (error) {
            console.error('[FoodStore] Supabase sync error', error);
        } else {
            console.log('[FoodStore] Synced successfully.');
        }

    } catch (e) {
        console.error('[FoodStore] Sync exception', e);
    }
};


/**
 * Add a new food item
 */
export const addFoodItem = async (
    item: Omit<FoodItemJSON, 'id'>,
    dateKey: string
): Promise<string> => {
    const all = await loadLocalEntries();

    // Create full object
    const newItem: FoodItemJSON = {
        ...item,
        id: generateUUID() // Always generate new ID
    };

    // Add to local
    // We store ALL entries in one big array locally for simplicity, 
    // but in future might want to split by keys.
    // For now, let's assume `STORAGE_KEY` holds *everything* for valid cache.
    // But to match "day_json" structure, we might want to store { [date]: items[] }.
    // Let's stick to flat list locally for now to minimize refactor from "Native" repo logic 
    // IF the native logic used flat list. 
    // Actually, looking at previous file, it used flat list. We can adapt.

    // But wait, we need to add theDATE to the item locally so we know when it was eaten?
    // The JSON structure `FoodItemJSON` DOES NOT have a date field.
    // This implies the date is determined by the ROW in Supabase (date column).
    // So locally, we MUST store it with a date attached, otherwise we lose context.

    // Let's wrap local storage slightly differently or add a transient field.
    // Hack: We'll modify the Local Storage to be a Dictionary: { "YYYY-MM-DD": [items] }

    let db = await loadLocalEntriesDict();
    if (!db[dateKey]) db[dateKey] = [];

    db[dateKey].push(newItem);

    await saveLocalEntriesDict(db);

    // Sync immediately
    await syncDayWithSupabase(dateKey, db[dateKey]);

    return newItem.id;
};

/**
 * Update an item (e.g. after AI analysis)
 */
export const updateFoodItem = async (
    id: string,
    updates: Partial<FoodItemJSON>,
    dateKey: string
): Promise<void> => {
    const db = await loadLocalEntriesDict();
    if (!db[dateKey]) return;

    const idx = db[dateKey].findIndex(i => i.id === id);
    if (idx === -1) return;

    db[dateKey][idx] = { ...db[dateKey][idx], ...updates };

    await saveLocalEntriesDict(db);
    await syncDayWithSupabase(dateKey, db[dateKey]);
};

/**
 * Delete an item
 */
export const deleteFoodItem = async (id: string, dateKey: string): Promise<void> => {
    const db = await loadLocalEntriesDict();
    if (!db[dateKey]) return;

    db[dateKey] = db[dateKey].filter(i => i.id !== id);

    await saveLocalEntriesDict(db);
    await syncDayWithSupabase(dateKey, db[dateKey]);
};

/**
 * Get summary for a specific day
 */
export const getDailySummary = async (
    dateKey: string,
    targetNutrition?: NutritionPlan
): Promise<DailyNutritionSummary> => {
    const db = await loadLocalEntriesDict();
    const entries = db[dateKey] || [];

    const totalCalories = entries.reduce((s, i) => s + i.calories, 0);
    const totalProtein = entries.reduce((s, i) => s + i.protein, 0);
    const totalFats = entries.reduce((s, i) => s + i.fats, 0);
    const totalCarbs = entries.reduce((s, i) => s + i.carbs, 0);

    // Calculate progress
    const tC = targetNutrition?.targetCalories || 2000;
    const tP = targetNutrition?.protein || 150;
    const tF = targetNutrition?.fats || 60;
    const tCb = targetNutrition?.carbs || 250;

    return {
        date: dateKey,
        totalCalories,
        totalProtein,
        totalFats,
        totalCarbs,
        caloriesProgress: Math.round((totalCalories / tC) * 100),
        proteinProgress: Math.round((totalProtein / tP) * 100),
        fatsProgress: Math.round((totalFats / tF) * 100),
        carbsProgress: Math.round((totalCarbs / tCb) * 100),
        entries
    };
};

/**
 * Load raw entries for a day (for UI list)
 */
export const getDayEntries = async (dateKey: string): Promise<FoodItemJSON[]> => {
    const db = await loadLocalEntriesDict();
    return db[dateKey] || [];
};

/**
 * Sync Pull (On Init)
 * Fetches data from Supabase and populates local cache
 */
export const syncPullFromSupabase = async (dateKey: string) => {
    try {
        const userId = (global as any).userId;
        if (!userId) return;

        const { data, error } = await supabase
            .from('food_diary')
            .select('day_json')
            .eq('user_id', userId)
            .eq('date', dateKey)
            .single();

        if (data && data.day_json) {
            const db = await loadLocalEntriesDict();
            db[dateKey] = data.day_json as FoodItemJSON[];
            await saveLocalEntriesDict(db);
            console.log(`[FoodStore] Pulled ${dateKey} from cloud.`);
        }
    } catch (e) {
        // Likely no row found, ignore
    }
}


// --- INTERNAL STORAGE HELPERS ---
interface FoodDiaryDB {
    [date: string]: FoodItemJSON[];
}

const loadLocalEntriesDict = async (): Promise<FoodDiaryDB> => {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        // Check if migrated. Old formatting was Array. New is Dict.
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            // Migration logic would go here if we had old users.
            // For now, reset or assume empty if structure mismatch
            return {};
        }
        return parsed;
    } catch {
        return {};
    }
};

const saveLocalEntriesDict = async (db: FoodDiaryDB) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};
