import { supabase } from '../lib/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItemJSON, DailyNutritionSummary, MealType, NutritionPlan, FoodAnalysisResult } from '../types';

const STORAGE_KEY = 'food_diary_entries';
const SHARED_FOOD_USER_ID = 'be55ca-shared-user'; // Fixed ID for single-timeline logic

// Helper: Generate UUID (if not using a library)
export const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Helper: Get today's key YYYY-MM-DD (Local Time)
export const getLocalDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

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

/**
 * Sync logic with Supabase (Upsert day_json)
 */
const syncDayWithSupabase = async (dateKey: string, entriesForDay: FoodItemJSON[]) => {
    try {
        console.log(`[FoodStore] Syncing ${dateKey} to Supabase...`, entriesForDay);

        const { error } = await supabase
            .from('food_diary')
            .upsert({
                user_id: SHARED_FOOD_USER_ID,
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
    // Create full object
    const newItem: FoodItemJSON = {
        ...item,
        id: generateUUID(), // Always generate new ID
        createdAt: new Date().toISOString()
    };

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
        const { data, error } = await supabase
            .from('food_diary')
            .select('day_json')
            .eq('user_id', SHARED_FOOD_USER_ID)
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

/**
 * Fetch ALL food data for the shared user (History)
 * Initializes local cache with everything found in Supabase.
 */
export const fetchAllFoodData = async () => {
    try {
        console.log('[FoodStore] Fetching full history...');
        const { data, error } = await supabase
            .from('food_diary')
            .select('user_id, date, day_json')
            .like('user_id', `${SHARED_FOOD_USER_ID}%`); // Use LIKE to match potential trailing whitespace

        if (error) console.error('[FoodStore] Fetch error:', error);

        if (data && data.length > 0) {
            const db = await loadLocalEntriesDict();
            let count = 0;
            data.forEach(row => {
                // Trim ID to handle dirty data
                if (row.user_id.trim() === SHARED_FOOD_USER_ID && row.day_json) {
                    db[row.date] = row.day_json as FoodItemJSON[];
                    count++;
                }
            });
            await saveLocalEntriesDict(db);
            console.log(`[FoodStore] Loaded history for ${count} days.`);
        } else {
            console.log('[FoodStore] No history found (data empty).');
        }
    } catch (e) {
        console.error('[FoodStore] Failed to fetch history', e);
    }
};
