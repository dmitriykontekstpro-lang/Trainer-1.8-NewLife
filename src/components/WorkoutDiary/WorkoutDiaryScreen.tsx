import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { fetchWorkoutHistory } from '../../utils/workoutDiaryStore';
import { DayTrainData } from '../../types/workoutDiary';
import { WorkoutDetailsModal } from './WorkoutDetailsModal';

interface WorkoutDiaryScreenProps {
    onClose: () => void;
}

export const WorkoutDiaryScreen: React.FC<WorkoutDiaryScreenProps> = ({ onClose }) => {
    const [history, setHistory] = useState<DayTrainData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWorkout, setSelectedWorkout] = useState<DayTrainData | null>(null);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        setLoading(true);
        const data = await fetchWorkoutHistory();
        setHistory(data);
        setLoading(false);
    };

    const renderItem = ({ item }: { item: DayTrainData }) => {
        const dateObj = new Date(item.date);
        const day = dateObj.getDate();
        const month = dateObj.toLocaleDateString('ru-RU', { month: 'short' }).toUpperCase();

        return (
            <TouchableOpacity
                onPress={() => setSelectedWorkout(item)}
                className="bg-gray-900 mb-3 p-4 rounded-xl border border-gray-800 flex-row items-center justify-between"
            >
                <View className="flex-row items-center gap-4">
                    <View className="bg-gray-800 w-16 h-16 rounded-lg items-center justify-center border border-gray-700">
                        <Text className="text-white font-bold text-xl">{day}</Text>
                        <Text className="text-gray-500 text-[10px] uppercase font-bold">{month}</Text>
                    </View>
                    <View>
                        <Text className="text-white font-bold text-lg uppercase">ТРЕНИРОВКА</Text>
                        <Text className="text-flow-green text-xs font-mono">{item.exercises_count} УПРАЖНЕНИЙ</Text>
                    </View>
                </View>
                <Text className="text-gray-600 text-2xl">›</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-black">
            {/* Header */}
            <View className="pt-12 pb-4 px-6 border-b border-gray-900 bg-black flex-row justify-between items-center bg-gray-900/50">
                <Text className="text-white font-bold text-2xl uppercase tracking-wider">ДНЕВНИК</Text>
                <TouchableOpacity onPress={onClose} className="p-2 bg-gray-800 rounded-full w-10 h-10 items-center justify-center">
                    <Text className="text-gray-400 font-bold">✕</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#39FF14" />
                </View>
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={item => item.date}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                    ListEmptyComponent={
                        <View className="items-center justify-center mt-20">
                            <Text className="text-gray-600 text-center">История тренировок пуста</Text>
                        </View>
                    }
                />
            )}

            <WorkoutDetailsModal
                visible={!!selectedWorkout}
                workout={selectedWorkout}
                onClose={() => setSelectedWorkout(null)}
            />
        </View>
    );
};
