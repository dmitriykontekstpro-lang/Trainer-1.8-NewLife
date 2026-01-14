import { supabase } from '../lib/supabaseClient';

const TABLE_NAME = 'food_diary'; // Using existing main table
const SHARED_USER_ID = 'be55ca-shared-user';

export interface WeightRecord {
    date: string; // YYYY-MM-DD
    weight: number;
}

/**
 * Save or update user weight (waist_user) for a specific date in 'food_diary'.
 * Enforces 1 record per date (via food_diary PK).
 */
export const saveUserWeight = async (weight: number, date: Date): Promise<void> => {
    const dateKey = date.toISOString().split('T')[0];

    // Format to 2 decimal places (e.g. 80.01)
    const formattedWeight = parseFloat(weight.toFixed(2));

    // We must UPSERT carefully to not wipe existing food/training data.
    // 1. Fetch existing row first? Supabase upsert merges columns if we just send the new one?
    // Supabase JS 'upsert' fully replaces the row UNLESS we use 'ignoreDuplicates' (which skips).
    // TO UPDATE A SINGLE COLUMN in an existing row without wiping others:
    // We should use UPDATE if exists, INSERT if not?
    // Or better: Fetch first.

    // Check existence
    const { data: existing } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('user_id', SHARED_USER_ID)
        .eq('date', dateKey)
        .single();

    let payload: any = {
        user_id: SHARED_USER_ID,
        date: dateKey,
        waist_user: formattedWeight, // The Target Column
        updated_at: new Date().toISOString()
    };

    if (existing) {
        // If row exists, we just update it. 
        // Note: Supabase 'update' is a PATCH (partial update).
        const { error } = await supabase
            .from(TABLE_NAME)
            .update({ waist_user: formattedWeight, updated_at: new Date().toISOString() })
            .eq('user_id', SHARED_USER_ID)
            .eq('date', dateKey);

        if (error) throw error;
    } else {
        // If (rarely) no food/train data for today yet, create row.
        // But be careful - 'upsert' without other fields is fine if they are nullable.
        const { error } = await supabase
            .from(TABLE_NAME)
            .insert(payload);

        if (error) throw error;
    }
};

/**
 * Get the latest weight record (for profile/current state).
 */
export const getLatestUserWeight = async (): Promise<number | null> => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('waist_user, date')
        .eq('user_id', SHARED_USER_ID)
        .not('waist_user', 'is', null) // Only rows where weight exists
        .order('date', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('[WeightStore] Get latest error:', error);
        return null;
    }

    return data?.waist_user || null;
};

/**
 * Get weight history (for graphs).
 */
export const getWeightHistory = async (): Promise<WeightRecord[]> => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('date, waist_user')
        .eq('user_id', SHARED_USER_ID)
        .not('waist_user', 'is', null)
        .order('date', { ascending: false });

    if (error) {
        console.error('[WeightStore] History error:', error);
        return [];
    }

    return data?.map((row: any) => ({
        date: row.date,
        weight: row.waist_user
    })) || [];
};
