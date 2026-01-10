import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WorkoutTemplate } from '../types';

interface LobbyProps {
    todayTemplate?: WorkoutTemplate;
    onStart: () => void;
    onOpenSettings: () => void;
    todayName: string;
    isSyncing?: boolean;
    totalDuration?: number; // New prop
    onAskTrainer: () => void;
    onOpenFoodDiary: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({ todayTemplate, onStart, onOpenSettings, todayName, isSyncing, totalDuration, onAskTrainer, onOpenFoodDiary }) => {
    // Get current date info
    const now = new Date();
    const monthNames = ['ЯНВАРЬ', 'ФЕВРАЛЬ', 'МАРТ', 'АПРЕЛЬ', 'МАЙ', 'ИЮНЬ',
        'ИЮЛЬ', 'АВГУСТ', 'СЕНТЯБРЬ', 'ОКТЯБРЬ', 'НОЯБРЬ', 'ДЕКАБРЬ'];
    const currentMonth = monthNames[now.getMonth()];
    const dayOfMonth = now.getDate();
    const dayOfWeekShort = todayName;

    return (
        <View className="h-full w-full bg-black flex-col justify-between p-6">

            {/* Header */}
            <View className="flex-row justify-between items-start pt-4">
                <View>
                    <Text className="text-white font-sans font-bold text-3xl uppercase tracking-tighter">{currentMonth}</Text>
                    <Text className="text-gray-500 font-mono text-sm tracking-wider mt-1">{dayOfWeekShort} {dayOfMonth}</Text>
                </View>
                <View className="flex-row gap-2">
                    <TouchableOpacity
                        onPress={onOpenFoodDiary}
                        className="w-12 h-12 rounded bg-gray-900 items-center justify-center border border-gray-800"
                    >
                        <Text className="text-2xl">🍽️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onAskTrainer}
                        className="w-12 h-12 rounded bg-gray-900 items-center justify-center border border-gray-800"
                    >
                        <Text className="text-2xl">👨‍🏫</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onOpenSettings}
                        className="w-12 h-12 rounded bg-gray-900 items-center justify-center border border-gray-800"
                    >
                        <Text className="text-2xl text-gray-400">⚙</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Hero */}
            <View className="flex-1 justify-center items-center">
                {todayTemplate ? (
                    <View className="items-center">
                        <Text className="text-flow-green font-mono text-xs mb-2 tracking-widest uppercase">
                            СЕГОДНЯШНЯЯ ЦЕЛЬ
                        </Text>
                        <Text className="text-white font-sans font-bold text-5xl text-center uppercase leading-tight mb-2">
                            {todayTemplate.name.split('+').map((part, i) => (
                                <Text key={i}>
                                    {part.trim()}
                                    {i < todayTemplate.name.split('+').length - 1 && '\n+\n'}
                                </Text>
                            ))}
                        </Text>
                        <View className="flex-row gap-2 mt-4">
                            <View className="bg-gray-900 px-3 py-1 rounded border border-gray-800">
                                <Text className="text-gray-400 text-xs uppercase">{todayTemplate.exercises.length} УПРАЖНЕНИЙ</Text>
                            </View>
                            <View className="bg-gray-900 px-3 py-1 rounded border border-gray-800">
                                <Text className="text-gray-400 text-xs uppercase">{totalDuration ? `${totalDuration} МИН` : '~45 МИН'}</Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View className="items-center opacity-50">
                        <Text className="text-gray-600 font-sans font-bold text-3xl text-center uppercase mb-2">
                            ОТДЫХ
                        </Text>
                        <Text className="text-gray-600 font-mono text-xs text-center">
                            СЕГОДНЯ НЕТ ТРЕНИРОВОК
                        </Text>
                    </View>
                )}
            </View>

            {/* Footer */}
            <View className="pb-8">
                {todayTemplate ? (
                    <TouchableOpacity
                        onPress={onStart}
                        disabled={isSyncing}
                        className={`w-full py-6 rounded-2xl items-center justify-center shadow-lg shadow-green-900/20 ${isSyncing ? 'bg-gray-800' : 'bg-flow-green'
                            }`}
                    >
                        {isSyncing ? (
                            <View className="flex-row items-center gap-3">
                                <ActivityIndicator color="#39FF14" />
                                <Text className="text-white font-sans font-bold text-xl uppercase tracking-widest">
                                    ЗАГРУЗКА...
                                </Text>
                            </View>
                        ) : (
                            <Text className="text-black font-sans font-bold text-xl uppercase tracking-widest">
                                НАЧАТЬ
                            </Text>
                        )}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        disabled
                        className="w-full bg-gray-900 py-6 rounded-2xl items-center justify-center border border-gray-800"
                    >
                        <Text className="text-gray-700 font-sans font-bold text-xl uppercase tracking-widest">
                            НЕТ ЦЕЛИ
                        </Text>
                    </TouchableOpacity>
                )}

                <View className="flex-row justify-center items-center gap-2 mt-4">
                    <View className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-yellow-500' : 'bg-flow-green'}`}></View>
                    <Text className="text-[10px] font-mono text-gray-500 uppercase">
                        {isSyncing ? 'СИНХРОНИЗАЦИЯ...' : 'СИСТЕМА ГОТОВА'}
                    </Text>
                </View>
            </View>

        </View>
    );
};
