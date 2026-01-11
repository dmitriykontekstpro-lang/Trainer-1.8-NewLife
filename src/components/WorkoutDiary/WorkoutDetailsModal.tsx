import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { DayTrainData, FinishedExerciseData } from '../../types/workoutDiary';

interface WorkoutDetailsModalProps {
    visible: boolean;
    workout: DayTrainData | null;
    onClose: () => void;
}

export const WorkoutDetailsModal: React.FC<WorkoutDetailsModalProps> = ({ visible, workout, onClose }) => {
    if (!workout) return null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View className="flex-1 bg-black/90 justify-end">
                <View className="bg-gray-900 rounded-t-3xl h-[80%] border-t border-gray-700">

                    {/* Header */}
                    <View className="p-6 border-b border-gray-800 flex-row justify-between items-center bg-gray-900 rounded-t-3xl">
                        <View>
                            <Text className="text-gray-500 font-mono text-xs uppercase tracking-widest mb-1">ТРЕНИРОВКА</Text>
                            <Text className="text-white font-bold text-2xl uppercase">
                                {new Date(workout.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className="w-10 h-10 bg-gray-800 rounded-full items-center justify-center border border-gray-700">
                            <Text className="text-white text-xl">✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView className="flex-1 p-6">
                        <View className="pb-10 gap-4">
                            {workout.exercises.map((ex, index) => (
                                <View key={index} className={`p-4 rounded-xl border ${ex.skipped ? 'bg-gray-900 border-gray-800 opacity-50' : 'bg-gray-800 border-gray-700'}`}>
                                    <View className="flex-row justify-between items-start mb-2">
                                        <Text className={`font-bold text-lg flex-1 mr-4 ${ex.skipped ? 'text-gray-500 line-through' : 'text-white'}`}>
                                            {ex.name}
                                        </Text>

                                        {!ex.skipped && ex.total_executions_count > 0 && (
                                            <View className="bg-gray-900 px-2 py-1 rounded border border-gray-600">
                                                <Text className="text-flow-green font-mono text-[10px] uppercase">#{ex.total_executions_count}</Text>
                                            </View>
                                        )}
                                        {ex.skipped && (
                                            <View className="bg-red-900/30 px-2 py-1 rounded border border-red-900">
                                                <Text className="text-red-500 font-mono text-[10px] uppercase">SKIP</Text>
                                            </View>
                                        )}
                                    </View>

                                    {!ex.skipped && (
                                        <View className="flex-row gap-4 mt-2">
                                            <View className="flex-1 bg-black/40 p-2 rounded items-center">
                                                <Text className="text-gray-500 text-[10px] uppercase">ВЕС</Text>
                                                <Text className="text-white font-bold text-lg">{ex.weight} <Text className="text-xs font-normal text-gray-400">кг</Text></Text>
                                            </View>
                                            <View className="flex-1 bg-black/40 p-2 rounded items-center">
                                                <Text className="text-gray-500 text-[10px] uppercase">ПОДХОДЫ</Text>
                                                <Text className="text-white font-bold text-lg">{ex.sets}</Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    </ScrollView>

                </View>
            </View>
        </Modal>
    );
};
