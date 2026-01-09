import { Exercise, MuscleGroup, WorkoutTemplate, WeeklySchedule, UserProfile, TrainingLocation } from '../types';
import { EXERCISE_DB } from '../data';

// Map of risky exercises for injuries (IDs)
const RISKY_MAP: Record<string, string[]> = {
    'KNEES': ['lg_1', 'lg_3', 'lg_4', 'lg_5', 'lg_11', 'lg_15'], // Squats, lunges, leg press (maybe)
    'BACK': ['bk_1', 'bk_3', 'lg_1', 'lg_2', 'lg_5'], // Deadlift, rows, squats
    'SHOULDERS': ['sh_1', 'sh_8', 'ch_4', 'tri_5'], // Overhead press, dips
    'NECK': [], // Hard to say specific IDs without more metadata
    'WRISTS': [],
    'SPINE': ['bk_1', 'lg_1', 'sh_1'] // Axial load
};

const getSafeExercises = (group: MuscleGroup, injuries: string[], location: TrainingLocation): Exercise[] => {
    let candidates = EXERCISE_DB[group] || [];

    // Filter by Location capability (Approximation)
    // If HOME, filter out machine exercises? 
    // This is hard since Exercise type doesn't have 'equipment' field.
    // For MVP, if location is HOME, we might need a specific subset or we just give all and user swaps?
    // Let's rely on the fact that existing DB is mixed.
    // Ideally we should have equipment tags. 
    // For now, I will NOT filter by location strictly to avoid empty arrays, but ideally we should.

    // Filter by Injuries
    if (injuries && injuries.length > 0) {
        candidates = candidates.filter(ex => {
            for (const injury of injuries) {
                // Map injury name (Russian from UI? No, UI uses Keys like 'KNEES' but mapped to Russian text?)
                // UserProfile stores: ['ШЕЯ', 'ПЛЕЧИ', 'СПИНА', 'ПОЯСНИЦА', 'КОЛЕНИ', 'ЗАПЯСТЬЯ']
                // Need to map Russian UI terms to my RISKY_MAP keys.

                let mapKey = '';
                if (injury === 'КОЛЕНИ') mapKey = 'KNEES';
                if (injury === 'СПИНА' || injury === 'ПОЯСНИЦА') mapKey = 'BACK';
                if (injury === 'ПЛЕЧИ') mapKey = 'SHOULDERS';

                if (mapKey && RISKY_MAP[mapKey]?.includes(ex.id)) {
                    return false;
                }
            }
            return true;
        });
    }

    return candidates;
};

const createTemplate = (
    id: string,
    name: string,
    groups: MuscleGroup[],
    injuries: string[],
    location: TrainingLocation
): WorkoutTemplate => {
    const exercises: Exercise[] = [];

    groups.forEach(group => {
        const safe = getSafeExercises(group, injuries, location);
        // Pick 2-3 exercises per group
        // Simple logic: existing order usually puts compounds first.
        const count = group === MuscleGroup.ABS ? 1 : 2;
        for (let i = 0; i < count && i < safe.length; i++) {
            // Avoid duplicates if multiple groups same? (e.g. Full body has Chest, Chest?)
            if (!exercises.find(e => e.id === safe[i].id)) {
                exercises.push(safe[i]);
            }
        }
    });

    return {
        id,
        name,
        primaryGroup: groups[0],
        secondaryGroup: groups.length > 1 ? groups[1] : MuscleGroup.NONE,
        exercises,
        type: 'PROGRESSIVE' // Default to progressive for generated
    };
};

export const generateProgram = (profile: UserProfile): { schedule: WeeklySchedule, templates: WorkoutTemplate[] } => {
    const templates: WorkoutTemplate[] = [];
    const schedule: WeeklySchedule = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
    const injuries = profile.injuries || [];

    // Strategy based on Days
    if (profile.daysPerWeek <= 2) {
        // FULL BODY A / B
        const tplA = createTemplate('gen_fb_a', 'ФУЛЛ-БАДИ А',
            [MuscleGroup.CHEST, MuscleGroup.BACK, MuscleGroup.LEGS, MuscleGroup.ABS], injuries, profile.location);

        const tplB = createTemplate('gen_fb_b', 'ФУЛЛ-БАДИ Б',
            [MuscleGroup.SHOULDERS, MuscleGroup.BICEPS, MuscleGroup.TRICEPS, MuscleGroup.LEGS], injuries, profile.location); // Variation

        templates.push(tplA, tplB);
        schedule[1] = 'gen_fb_a'; // Mon
        schedule[4] = 'gen_fb_b'; // Thu
    }
    else if (profile.daysPerWeek === 3) {
        // PUSH / PULL / LEGS (Classic) or FB? Beginners often do FB x 3.
        // Let's do Upper / Lower / Full for variety or PPL. PPL is solid.
        // Or "Push + Pull", "Legs + Shoulders"?

        // PPL:
        const push = createTemplate('gen_push', 'ТЯНИ (PUSH)',
            [MuscleGroup.CHEST, MuscleGroup.SHOULDERS, MuscleGroup.TRICEPS], injuries, profile.location);

        const pull = createTemplate('gen_pull', 'ТОЛКАЙ (PULL)',
            [MuscleGroup.BACK, MuscleGroup.BICEPS, MuscleGroup.ABS], injuries, profile.location);

        const legs = createTemplate('gen_legs', 'НОГИ (LEGS)',
            [MuscleGroup.LEGS, MuscleGroup.ABS], injuries, profile.location);

        templates.push(push, pull, legs);
        schedule[1] = 'gen_push'; // Mon
        schedule[3] = 'gen_pull'; // Wed
        schedule[5] = 'gen_legs'; // Fri
    }
    else if (profile.daysPerWeek >= 4) {
        // UPPER / LOWER Split x2
        const upperA = createTemplate('gen_up_a', 'ВЕРХ А',
            [MuscleGroup.CHEST, MuscleGroup.BACK, MuscleGroup.SHOULDERS], injuries, profile.location);
        const lowerA = createTemplate('gen_low_a', 'НИЗ А',
            [MuscleGroup.LEGS, MuscleGroup.ABS], injuries, profile.location);

        const upperB = createTemplate('gen_up_b', 'ВЕРХ Б (РУКИ)',
            [MuscleGroup.CHEST, MuscleGroup.BACK, MuscleGroup.BICEPS, MuscleGroup.TRICEPS], injuries, profile.location);

        // Lower B same as A for simplicity or variants
        const lowerB = createTemplate('gen_low_b', 'НИЗ Б',
            [MuscleGroup.LEGS, MuscleGroup.ABS], injuries, profile.location);

        templates.push(upperA, lowerA, upperB, lowerB);
        schedule[1] = 'gen_up_a';
        schedule[2] = 'gen_low_a';
        schedule[4] = 'gen_up_b';
        schedule[5] = 'gen_low_b';

        if (profile.daysPerWeek === 5) {
            // Add extra? Maybe cardio or weak point. 
            // Just repeat 1 for now or 4 days is enough for base.
            // User selected 5, let's fill Sat
            schedule[6] = 'gen_low_a'; // Extra legs? Or Active Rest?
        }
    }

    return { schedule, templates };
};
