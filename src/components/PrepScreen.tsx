import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { speak } from '../utils/generator';

interface PrepScreenProps {
    onReady: () => void; // Called when time is up or user skips
    onCancel: () => void;
    firstExerciseName?: string;
}

export const PrepScreen: React.FC<PrepScreenProps> = ({ onReady, onCancel, firstExerciseName }) => {
    const [timeLeft, setTimeLeft] = useState(120);

    useEffect(() => {

        // Start prep speech
        speak(firstExerciseName
            ? `Подготовка к тренировке. Первое упражнение: ${firstExerciseName}. У вас есть две минуты.`
            : "Подготовка к тренировке. У вас есть две минуты.");

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                const next = prev - 1;
                if (next <= 0) {
                    return 0;
                }
                return next;
            });
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, []);

    // Auto-start when time is up
    useEffect(() => {
        if (timeLeft === 0) {
            onReady();
        }
    }, [timeLeft]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <View className="flex-1 bg-black items-center justify-between p-6 py-12">

            <View className="items-center mt-10">
                <Text className="text-flow-green font-mono text-xs uppercase tracking-widest mb-4">
                    ПОДГОТОВКА СИСТЕМЫ
                </Text>
                <Text className="text-white font-sans font-bold text-3xl uppercase text-center mb-2">
                    ПРИГОТОВЬТЕСЬ
                </Text>
                <Text className="text-gray-500 text-center px-8 mb-6">
                    Наденьте экипировку, включите музыку и настройтесь на работу.
                </Text>
                {firstExerciseName && (
                    <View className="bg-gray-900 border border-gray-700 px-6 py-3 rounded-xl items-center">
                        <Text className="text-gray-500 text-[10px] uppercase mb-1">ПЕРВОЕ УПРАЖНЕНИЕ</Text>
                        <Text className="text-white font-bold text-lg text-center uppercase">{firstExerciseName}</Text>
                    </View>
                )}
            </View>

            <View className="items-center justify-center h-64 w-64 rounded-full border-4 border-gray-800 relative">
                <Text className="text-7xl font-mono font-bold text-white">
                    {formatTime(timeLeft)}
                </Text>
            </View>

            <View className="w-full items-center gap-4">
                <TouchableOpacity
                    onPress={onReady}
                    className="w-full bg-flow-green py-4 rounded items-center shadow shadow-green-400"
                >
                    <Text className="text-black font-sans font-bold text-xl uppercase tracking-widest">
                        НАЧАТЬ СЕЙЧАС
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};
