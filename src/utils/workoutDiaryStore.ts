import { supabase } from '../lib/supabaseClient';
import { DayTrainData, FinishedExerciseData } from '../types/workoutDiary';

const TABLE_NAME = 'food_diary'; // We use the same table but a different column 'day_train'
const SHARED_USER_ID = 'be55ca-shared-user'; // Same fixed ID

/**
 * Fetch all workout history
 * Returns list of DayTrainData, sorted by date DESC
 */
export const fetchWorkoutHistory = async (): Promise<DayTrainData[]> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('date, day_train')
            .eq('user_id', SHARED_USER_ID)
            .order('date', { ascending: false });

        if (error) {
            console.error('[WorkoutStore] Fetch error:', error);
            return [];
        }

        const history: DayTrainData[] = [];
        data?.forEach((row: any) => {
            if (row.day_train) {
                // Handle potential string vs object response from Supabase
                let parsedEntry: DayTrainData;
                if (typeof row.day_train === 'string') {
                    try {
                        parsedEntry = JSON.parse(row.day_train);
                    } catch (e) {
                        console.error('Failed to parse day_train JSON', e);
                        return;
                    }
                } else {
                    parsedEntry = row.day_train;
                }

                // Double check date from row vs JSON (prefer row date for sorting)
                parsedEntry.date = row.date;
                history.push(parsedEntry);
            }
        });

        return history;
    } catch (e) {
        console.error('[WorkoutStore] Exception in fetch:', e);
        return [];
    }
};

/**
 * Calculate execution counts for new exercises based on history
 */
const calculateCounts = (
    newExercises: Omit<FinishedExerciseData, 'total_executions_count'>[],
    history: DayTrainData[]
): FinishedExerciseData[] => {

    // Create a map of counters: { "Exercise Name": count }
    const counters: Record<string, number> = {};

    // 1. Scan history (oldest to newest) to build baseline counts
    // Since history is DESC (newest first), we reverse it for counting
    [...history].reverse().forEach(day => {
        day.exercises.forEach(ex => {
            if (!ex.skipped) {
                counters[ex.name] = (counters[ex.name] || 0) + 1;
            }
        });
    });

    // 2. Assign counts to new exercises
    return newExercises.map(ex => {
        if (ex.skipped) {
            return { ...ex, total_executions_count: 0 }; // Skipped doesn't increment or count
        }
        const currentCount = (counters[ex.name] || 0) + 1;
        counters[ex.name] = currentCount; // Increment for potential duplicates in same workout?
        return { ...ex, total_executions_count: currentCount };
    });
};

/**
 * Save a new workout
 * 1. Fetch current row to preserve food data
 * 2. Calculate stats
 * 3. Upsert
 */
export const saveWorkoutLog = async (
    dateKey: string, // YYYY-MM-DD
    rawExercises: Omit<FinishedExerciseData, 'total_executions_count'>[]
) => {
    try {
        // 1. Get History for stats
        const history = await fetchWorkoutHistory();

        // 2. Calculate cumulative counts
        const exercisesWithStats = calculateCounts(rawExercises, history);

        const newTrainData: DayTrainData = {
            date: dateKey,
            exercises: exercisesWithStats,
            exercises_count: exercisesWithStats.length
        };

        // 3. Get existing row to preserve 'day_json' (food)
        const { data: existingRow, error: fetchError } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('user_id', SHARED_USER_ID)
            .eq('date', dateKey)
            .single();

        let upsertPayload: any = {
            user_id: SHARED_USER_ID,
            date: dateKey,
            day_train: newTrainData,
            updated_at: new Date().toISOString()
        };

        if (existingRow && existingRow.day_json) {
            // Preserve existing food data
            upsertPayload.day_json = existingRow.day_json;
        } else {
            // If no row exists or day_json is null, initialize as empty array to ensure correct format
            upsertPayload.day_json = [];
        }

        // 4. Write to DB
        const { error: saveError } = await supabase
            .from(TABLE_NAME)
            .upsert(upsertPayload, { onConflict: 'user_id, date' });

        if (saveError) {
            console.error('[WorkoutStore] Save error:', saveError);
            throw saveError;
        }

        console.log('[WorkoutStore] Workout saved successfully.');
        return newTrainData;

    } catch (e) {
        console.error('[WorkoutStore] Save exception:', e);
        throw e;
    }
};


export interface ExerciseHistorySnapshot {
    last: FinishedExerciseData;
    startWeight: number;
}

/**
 * Get a snapshot of the latest performance for every exercise + Start Weight.
 * Used for fast progression calculation.
 */
export const getExerciseSnapshot = async (): Promise<Record<string, ExerciseHistorySnapshot>> => {
    try {
        const history = await fetchWorkoutHistory();
        const snapshot: Record<string, ExerciseHistorySnapshot> = {};

        // History is DESC (Newest First).
        // Iterate to find Last (first encountered) and Start (last encountered)
        history.forEach(day => {
            day.exercises.forEach(ex => {
                if (ex.skipped) return; // Ignore skips for stats

                if (!snapshot[ex.name]) {
                    // First encounter (Newest) -> Initialize
                    snapshot[ex.name] = { last: ex, startWeight: ex.weight };
                }
                // Keep updating startWeight as we go back in time
                snapshot[ex.name].startWeight = ex.weight;
            });
        });

        return snapshot;
    } catch (e) {
        console.error('[WorkoutStore] Snapshot failed', e);
        return {};
    }
};
