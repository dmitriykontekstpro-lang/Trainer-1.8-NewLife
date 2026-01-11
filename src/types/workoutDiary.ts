export interface FinishedExerciseData {
    id: string; // exerciseId
    name: string;
    weight: number;
    sets: number; // сколько подходов СДЕЛАЛ
    total_executions_count: number; // накопительный номер тренировки (1, 2, 3...)
    skipped: boolean;
}

export interface DayTrainData {
    date: string; // ISO string
    exercises: FinishedExerciseData[];
    exercises_count: number;
}
