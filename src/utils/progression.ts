import { ExerciseResult } from '../lib/supabaseClient';
import { Exercise, TimelineBlock, BlockType, WorkoutTemplate, WorkoutSettings } from '../types';
import { HistoryState } from './historyStore';
import { getExerciseSnapshot, ExerciseHistorySnapshot } from './workoutDiaryStore';
import { FinishedExerciseData } from '../types/workoutDiary';

// New Smart Progression Calculation
export const calculateSmartLoad = (
    exerciseName: string,
    defaultWeight: number,
    snapshot: Record<string, ExerciseHistorySnapshot>
): { weight: number, isNew: boolean, stats?: { count: number, gain: number } } => {

    const entry = snapshot[exerciseName];

    // 1. New Exercise (No history)
    if (!entry) {
        return {
            weight: defaultWeight,
            isNew: true,
            stats: { count: 1, gain: 0 }
        };
    }

    const lastResult = entry.last;

    // 2. Skipped previously -> Maintain weight
    if (lastResult.skipped) {
        return {
            weight: lastResult.weight,
            isNew: false,
            stats: {
                count: lastResult.total_executions_count,
                gain: lastResult.weight - entry.startWeight // No change
            }
        };
    }

    // 3. Step Loading Logic (Every 3rd successful workout -> Increase)
    // Counts: 1=Start, 2=Confirm, 3=Increase!
    const count = lastResult.total_executions_count;
    let nextWeight = lastResult.weight;

    if (count > 0 && count % 3 === 0) {
        nextWeight += 2.5;
    }

    const gain = nextWeight - entry.startWeight;

    return {
        weight: nextWeight,
        isNew: false,
        stats: {
            count: count + 1, // Current workout is next
            gain: gain > 0 ? gain : 0
        }
    };
};

export const prepareWorkoutTimeline = async (
    template: WorkoutTemplate,
    settings: WorkoutSettings,
    _legacyHistoryIgnored: HistoryState
): Promise<TimelineBlock[]> => {

    // Fetch FAST snapshot from local Workout Diary
    const snapshot = await getExerciseSnapshot();
    console.log(`[Progression] Snapshot loaded with ${Object.keys(snapshot).length} exercises`);

    const blocks: TimelineBlock[] = [];
    let blockId = 0;

    // 1. CHECK_IN (Body Weight Start)
    blocks.push({
        id: `blk_${blockId++}`,
        type: BlockType.CHECK_IN,
        duration: 0,
        requiresConfirmation: true
    });

    // 2. PREP
    const prepDuration = (template.type === 'CUSTOM' && template.customPrepDuration)
        ? template.customPrepDuration
        : 30;
    blocks.push({ id: `blk_${blockId++}`, type: BlockType.PREP, duration: prepDuration });

    if (!template.exercises || !Array.isArray(template.exercises)) {
        console.warn("Template has no exercises!");
        return blocks;
    }

    // CUSTOM WORKOUT LOGIC
    if (template.type === 'CUSTOM') {
        const customRestSets = template.customRestBetweenSets || settings.restBetweenSets;
        const customRestEx = template.customRestBetweenExercises || settings.restBetweenExercises;

        for (let i = 0; i < template.exercises.length; i++) {
            const ex = template.exercises[i];
            const rawConfig = template.customConfig?.[ex.id] || { sets: 3, reps: 10, weight: 20 };

            const safeSets = (typeof rawConfig.sets === 'number' && !isNaN(rawConfig.sets) && rawConfig.sets > 0) ? rawConfig.sets : 3;
            const safeReps = (typeof rawConfig.reps === 'number' && !isNaN(rawConfig.reps) && rawConfig.reps > 0) ? rawConfig.reps : 10;
            const safeWeight = (typeof rawConfig.weight === 'number' && !isNaN(rawConfig.weight)) ? rawConfig.weight : 20;

            for (let set = 1; set <= safeSets; set++) {
                const duration = safeReps * 2 + 10;
                blocks.push({
                    id: `blk_${blockId++}`,
                    type: BlockType.WORK,
                    duration: duration,
                    exerciseName: ex.name,
                    exerciseId: ex.id,
                    reps: safeReps,
                    weight: safeWeight,
                    setNumber: set,
                    totalSets: safeSets,
                    isNewExercise: false,
                    cycleIndex: 0,
                    muscleGroup: ex.group,
                    customLabel: `ПОДХОД ${set}/${safeSets}`
                });

                if (set < safeSets) {
                    blocks.push({
                        id: `blk_${blockId++}`,
                        type: BlockType.REST,
                        duration: customRestSets,
                        nextExercise: `${ex.name} (Сет ${set + 1})`
                    });
                }
            }

            if (i < template.exercises.length - 1) {
                blocks.push({
                    id: `blk_${blockId++}`,
                    type: BlockType.TRANSITION,
                    duration: customRestEx,
                    nextExercise: template.exercises[i + 1].name
                });
            }
        }
    }
    else {
        // PROGRESSIVE WORKOUT LOGIC (New Smart Flow)
        for (let i = 0; i < template.exercises.length; i++) {
            const ex = template.exercises[i];

            // Calculate Smart Load
            const { weight, isNew, stats } = calculateSmartLoad(ex.name, ex.defaultWeight, snapshot);

            console.log(`[Progression] ${ex.name}: Weight ${weight}, New? ${isNew}`);

            // Fixed 4 sets: 1 Warmup + 3 Working
            const totalSets = 4;

            for (let set = 1; set <= totalSets; set++) {
                const isWarmup = set === 1;
                const currentSetWeight = isWarmup ? 0 : weight;

                // Duration Formula: reps * 2 + 10
                const reps = settings.repsPerSet || 8;
                const workDuration = reps * 2 + 10;

                let setLabel = isWarmup ? "Разминочный подход" : `Рабочий сет №${set - 1}`;

                // Logic: Ask for weight ONLY on First Working Set (Set 2) of a New Exercise
                const askForWeight = isNew && set === 2;

                blocks.push({
                    id: `blk_${blockId++}`,
                    type: BlockType.WORK,
                    duration: workDuration,
                    exerciseName: ex.name,
                    exerciseId: ex.id,
                    reps: reps,
                    weight: currentSetWeight,
                    setNumber: set, // 1..4
                    totalSets: totalSets,
                    isNewExercise: isNew,
                    cycleIndex: 0, // Deprecated, keep 0
                    muscleGroup: ex.group,
                    customLabel: setLabel,
                    requiresWeightInput: askForWeight, // NEW FLAG
                    statsDisplay: stats // Pass stats to be displayed
                });

                // REST
                if (set < totalSets) {
                    blocks.push({
                        id: `blk_${blockId++}`,
                        type: BlockType.REST,
                        duration: settings.restBetweenSets,
                        nextExercise: `${ex.name} (Сет ${set + 1})`
                    });
                }
            }

            // TRANSITION
            if (i < template.exercises.length - 1) {
                blocks.push({
                    id: `blk_${blockId++}`,
                    type: BlockType.TRANSITION,
                    duration: settings.restBetweenExercises,
                    nextExercise: template.exercises[i + 1].name
                });
            }
        }
    }

    // 3. CHECK_OUT
    blocks.push({ id: `blk_${blockId++}`, type: BlockType.CHECK_OUT, duration: 0, requiresConfirmation: true });
    // 4. FINISH
    blocks.push({ id: `blk_${blockId++}`, type: BlockType.FINISH, duration: 0 });

    return blocks;
};
