import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { WorkoutTemplate, DailyNutritionSummary, UserProfile } from '../../types';
import { calculateNutrition } from '../../utils/calculations';
import { LobbyCard } from './LobbyCard';

interface LobbyProps {
    todayTemplate?: WorkoutTemplate;
    onStart: () => void;
    onOpenSettings: () => void;
    onOpenProfile: () => void; // New prop
    todayName: string;
    isSyncing?: boolean;
    totalDuration?: number;
    onAskTrainer: () => void;
    onOpenFoodDiary: () => void;
    onOpenWorkoutDiary: () => void;

    // New Props for Data Logic
    dailySummary?: DailyNutritionSummary | null;
    userProfile?: UserProfile | null;
}

export const Lobby: React.FC<LobbyProps> = ({
    todayTemplate,
    onStart,
    onOpenSettings,
    onOpenProfile,
    todayName,
    isSyncing,
    totalDuration,
    onAskTrainer,
    onOpenFoodDiary,
    onOpenWorkoutDiary,
    dailySummary,
    userProfile
}) => {
    // Date Info
    const now = new Date();
    const monthNames = ['ЯНВАРЬ', 'ФЕВРАЛЬ', 'МАРТ', 'АПРЕЛЬ', 'МАЙ', 'ИЮНЬ',
        'ИЮЛЬ', 'АВГУСТ', 'СЕНТЯБРЬ', 'ОКТЯБРЬ', 'НОЯБРЬ', 'ДЕКАБРЬ'];
    const currentMonth = monthNames[now.getMonth()];
    const dayOfMonth = now.getDate();

    // Nutrition Data
    const plan = userProfile ? calculateNutrition(userProfile) : null;
    const targetCalories = plan?.targetCalories || 2000;
    const currentCalories = Math.round(dailySummary?.totalCalories || 0);

    // Macro Progress %
    const pTarget = plan?.protein || 1;
    const fTarget = plan?.fats || 1;
    const cTarget = plan?.carbs || 1;

    const pCurrent = dailySummary?.totalProtein || 0;
    const fCurrent = dailySummary?.totalFats || 0;
    const cCurrent = dailySummary?.totalCarbs || 0;

    const pPerc = Math.round((pCurrent / pTarget) * 100);
    const fPerc = Math.round((fCurrent / fTarget) * 100);
    const cPerc = Math.round((cCurrent / cTarget) * 100);

    // Goal Translation
    const getGoalLabel = (goal?: string) => {
        switch (goal) {
            case 'WEIGHT_LOSS': return 'ПОХУДЕНИЕ';
            case 'MUSCLE_GAIN': return 'НАБОР МАССЫ';
            case 'RECOMPOSITION': return 'РЕКОМПОЗИЦИЯ';
            case 'STRENGTH': return 'СИЛА';
            case 'ENDURANCE': return 'ВЫНОСЛИВОСТЬ';
            case 'MAINTENANCE': return 'ПОДДЕРЖАНИЕ';
            case 'CUTTING': return 'СУШКА';
            default: return 'НЕТ ЦЕЛИ';
        }
    };

    return (
        <View className="h-full w-full bg-black p-6 pt-8">
            {/* Header */}
            <View className="mb-8 flex-row justify-between items-start">
                <View>
                    <Text className="text-white font-sans font-bold text-3xl uppercase tracking-tighter">{currentMonth}</Text>
                    <Text className="text-gray-500 font-mono text-sm tracking-wider mt-1">{todayName} {dayOfMonth}</Text>
                </View>

                {/* Settings Button */}
                <TouchableOpacity
                    onPress={onOpenSettings}
                    className="w-10 h-10 rounded-full bg-gray-900 border border-gray-700 items-center justify-center"
                >
                    <Text className="text-xl">⚙️</Text>
                </TouchableOpacity>
            </View>

            {/* Grid */}
            <View className="flex-row flex-wrap justify-between">

                {/* 1. Workout Card */}
                <LobbyCard
                    title="СЕГОДНЯ"
                    icon="💪"
                    onPress={onStart}
                    actionLabel={todayTemplate ? "НАЧАТЬ" : undefined}
                    disabled={!todayTemplate}
                    loading={isSyncing}
                >
                    {todayTemplate ? (
                        <View>
                            <Text className="text-white font-bold text-2xl uppercase mb-1 leading-tight" numberOfLines={2}>
                                {todayTemplate.name}
                            </Text>
                            <Text className="text-gray-500 text-xs font-mono">
                                {todayTemplate.exercises.length} УПР • ~{totalDuration || 45} МИН
                            </Text>
                        </View>
                    ) : (
                        <View>
                            <Text className="text-gray-500 font-bold text-xl uppercase">ОТДЫХ</Text>
                            <Text className="text-gray-600 text-xs">Тренировок нет</Text>
                        </View>
                    )}
                </LobbyCard>

                {/* 2. Food Card */}
                <LobbyCard
                    title="ПИТАНИЕ"
                    icon="🍽️"
                    onPress={onOpenFoodDiary}
                    actionLabel="ОТКРЫТЬ"
                >
                    <View>
                        <View className="flex-row items-baseline gap-1 mb-4">
                            <Text className="text-white font-bold text-2xl">
                                {targetCalories}<Text className="text-gray-500">/</Text>{currentCalories}
                            </Text>
                        </View>

                        <View className="flex-row justify-between">
                            <View className="items-center">
                                <Text className="text-flow-green font-bold text-sm">{pPerc}%</Text>
                                <Text className="text-gray-500 text-[10px] font-bold">БЕЛКИ</Text>
                            </View>
                            <View className="items-center">
                                <Text className="text-flow-green font-bold text-sm">{fPerc}%</Text>
                                <Text className="text-gray-500 text-[10px] font-bold">ЖИРЫ</Text>
                            </View>
                            <View className="items-center">
                                <Text className="text-flow-green font-bold text-sm">{cPerc}%</Text>
                                <Text className="text-gray-500 text-[10px] font-bold">УГЛЕВ</Text>
                            </View>
                        </View>

                        {/* Progress Bar */}
                        <View className="h-1 bg-gray-800 rounded-full mt-4 overflow-hidden w-full">
                            <View
                                style={{ width: `${Math.min((currentCalories / targetCalories) * 100, 100)}%` }}
                                className="h-full bg-flow-green"
                            />
                        </View>
                    </View>
                </LobbyCard>

                {/* 3. Profile Card */}
                <LobbyCard
                    title="ПРОФИЛЬ"
                    icon="👤"
                    onPress={onOpenProfile}
                    actionLabel="НАСТРОЙКИ"
                >
                    <View>
                        <Text className="text-gray-400 text-xs uppercase mb-1">ЦЕЛЬ</Text>
                        <Text className="text-white font-bold text-sm uppercase mb-3">
                            {getGoalLabel(userProfile?.mainGoal)}
                        </Text>

                        <View className="flex-row items-baseline gap-1">
                            <Text className="text-white font-bold text-2xl">
                                {userProfile?.weight || '--'}
                            </Text>
                            <Text className="text-gray-500 text-xs">КГ</Text>
                        </View>
                    </View>
                </LobbyCard>

                {/* 4. Log Card */}
                <LobbyCard
                    title="ДНЕВНИК"
                    icon="📅"
                    onPress={onOpenWorkoutDiary}
                >
                    <View className="items-center justify-center py-4">
                        <Text className="text-gray-400 font-bold text-[10px] uppercase text-center mb-1">
                            ИСТОРИЯ
                        </Text>
                        <Text className="text-white font-bold text-lg uppercase text-center leading-5">
                            ВСЕ{'\n'}ТРЕНИРОВКИ
                        </Text>
                    </View>
                </LobbyCard>

            </View>

            {/* Quick Actions */}
            <View className="absolute top-28 right-6">
                <TouchableOpacity
                    onPress={onAskTrainer}
                    className="w-10 h-10 rounded-full bg-gray-900 border border-gray-700 items-center justify-center shadow-lg"
                >
                    <Text className="text-xl">👨‍🏫</Text>
                </TouchableOpacity>
            </View>

        </View>
    );
};
