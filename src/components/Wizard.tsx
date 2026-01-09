import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { MuscleGroup, WorkoutTemplate, WorkoutType, CustomExerciseSettings } from '../types';
import { COLORS, EXERCISE_DB } from '../data';

interface WizardProps {
    onClose: () => void;
    onSave: (template: WorkoutTemplate) => void;
    slotId: string;
    initialTemplate?: WorkoutTemplate;
}

export const Wizard: React.FC<WizardProps> = ({ onClose, onSave, slotId, initialTemplate }) => {
    // 0=Type, 1=Primary, 2=Secondary, 3=Select, 4=CustomConfig
    const [step, setStep] = useState(0);

    const [workoutType, setWorkoutType] = useState<WorkoutType>('PROGRESSIVE');
    const [primary, setPrimary] = useState<MuscleGroup | null>(null);
    const [secondary, setSecondary] = useState<MuscleGroup | null>(null);
    const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);

    // Custom Logic
    const [customName, setCustomName] = useState('');
    const [customConfig, setCustomConfig] = useState<Record<string, CustomExerciseSettings>>({});

    // New Custom Settings
    const [customRestSets, setCustomRestSets] = useState(30);
    const [customRestEx, setCustomRestEx] = useState(120);
    const [customPrep, setCustomPrep] = useState(30);

    // Load initial state if editing
    useEffect(() => {
        if (initialTemplate) {
            setWorkoutType(initialTemplate.type || 'PROGRESSIVE');
            setPrimary(initialTemplate.primaryGroup);
            setSecondary(initialTemplate.secondaryGroup);
            setSelectedExerciseIds(initialTemplate.exercises.map(e => e.id));
            if (initialTemplate.type === 'CUSTOM') {
                setCustomName(initialTemplate.name);
                setCustomConfig(initialTemplate.customConfig || {});
                setCustomRestSets(initialTemplate.customRestBetweenSets || 30);
                setCustomRestEx(initialTemplate.customRestBetweenExercises || 120);
                setCustomPrep(initialTemplate.customPrepDuration || 30);
                setStep(4);
            } else {
                setStep(3);
            }
        } else {
            setStep(0);
        }
    }, [initialTemplate]);

    const handleTypeSelect = (type: WorkoutType) => {
        setWorkoutType(type);
        setStep(1);
    };

    const handlePrimarySelect = (group: MuscleGroup) => {
        setPrimary(group);
        setStep(2);
    };

    const handleSecondarySelect = (group: MuscleGroup) => {
        setSecondary(group);
        setStep(3);
    };

    const toggleExercise = (id: string, group: MuscleGroup) => {
        setSelectedExerciseIds(prev => {
            const isSelected = prev.includes(id);

            if (isSelected) {
                const newConfig = { ...customConfig };
                delete newConfig[id];
                setCustomConfig(newConfig);
                return prev.filter(x => x !== id);
            } else {
                const limit = workoutType === 'CUSTOM' ? 8 : 10;
                if (prev.length >= limit) return prev;

                if (workoutType === 'CUSTOM') {
                    setCustomConfig(prevConf => ({
                        ...prevConf,
                        [id]: { sets: 3, reps: 10, weight: 20 }
                    }));
                }
                return [...prev, id];
            }
        });
    };

    const updateExerciseConfig = (id: string, field: keyof CustomExerciseSettings, value: number) => {
        setCustomConfig(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    };

    const handleSave = () => {
        if (!primary || !secondary) return;

        const primaryPool = EXERCISE_DB[primary] || [];
        const secondaryPool = secondary !== MuscleGroup.NONE ? (EXERCISE_DB[secondary] || []) : [];
        const allPool = [...primaryPool, ...secondaryPool];
        const finalExercises = allPool.filter(ex => selectedExerciseIds.includes(ex.id));

        const name = workoutType === 'CUSTOM'
            ? (customName.trim() || 'Custom Workout').substring(0, 20)
            : `${primary} + ${secondary === MuscleGroup.NONE ? '' : secondary}`;

        const newTemplate: WorkoutTemplate = {
            id: slotId,
            name: name,
            primaryGroup: primary,
            secondaryGroup: secondary,
            exercises: finalExercises,
            type: workoutType,
            customConfig: workoutType === 'CUSTOM' ? customConfig : undefined,
            customRestBetweenSets: workoutType === 'CUSTOM' ? customRestSets : undefined,
            customRestBetweenExercises: workoutType === 'CUSTOM' ? customRestEx : undefined,
            customPrepDuration: workoutType === 'CUSTOM' ? customPrep : undefined,
        };

        onSave(newTemplate);
        onClose();
    };

    const renderExerciseList = (group: MuscleGroup, labelColor: string) => {
        const exercises = EXERCISE_DB[group] || [];

        return (
            <View className="mb-6" key={group}>
                <Text className="font-bold uppercase tracking-widest text-base mb-2" style={{ color: labelColor }}>{group}</Text>
                <View className="space-y-2">
                    {exercises.map(ex => {
                        const isSelected = selectedExerciseIds.includes(ex.id);
                        return (
                            <TouchableOpacity
                                key={ex.id}
                                onPress={() => toggleExercise(ex.id, group)}
                                className={`w-full p-3 rounded border flex-row justify-between items-center 
                                ${isSelected ? 'bg-gray-800 border-flow-green' : 'border-gray-800'}
                              `}
                            >
                                <Text className={`font-sans text-sm ${isSelected ? 'text-white' : 'text-gray-400'}`}>{ex.name}</Text>
                                {isSelected && <Text className="text-flow-green font-bold text-xs">✓</Text>}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderConfigStep = () => {
        const primaryPool = EXERCISE_DB[primary!] || [];
        const secondaryPool = secondary !== MuscleGroup.NONE ? (EXERCISE_DB[secondary!] || []) : [];
        const allExercises = [...primaryPool, ...secondaryPool].filter(e => selectedExerciseIds.includes(e.id));

        return (
            <ScrollView className="flex-1 p-6">
                <View className="mb-6">
                    <Text className="text-gray-500 text-xs mb-2 uppercase">Название тренировки (макс 20)</Text>
                    <TextInput
                        value={customName}
                        onChangeText={setCustomName}
                        maxLength={20}
                        placeholder="Моя тренировка"
                        placeholderTextColor="#444"
                        className="bg-gray-900 border border-gray-700 p-4 rounded text-white font-sans text-lg"
                    />
                </View>

                {/* Global Settings */}
                <View className="mb-6 bg-gray-900 p-4 rounded-xl border border-gray-800">
                    <Text className="text-flow-blue font-bold uppercase mb-4 text-xs tracking-widest">Общие настройки</Text>

                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-gray-400 text-xs">ПОДГОТОВКА (СЕК)</Text>
                        <View className="w-20">
                            <TextInput
                                value={String(customPrep)}
                                onChangeText={v => setCustomPrep(parseInt(v) || 0)}
                                keyboardType="numeric"
                                className="bg-black text-center p-2 rounded text-white font-mono border border-gray-700"
                            />
                        </View>
                    </View>

                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-gray-400 text-xs">ОТДЫХ МЕЖДУ СЕТАМИ (СЕК)</Text>
                        <View className="w-20">
                            <TextInput
                                value={String(customRestSets)}
                                onChangeText={v => setCustomRestSets(parseInt(v) || 0)}
                                keyboardType="numeric"
                                className="bg-black text-center p-2 rounded text-white font-mono border border-gray-700"
                            />
                        </View>
                    </View>

                    <View className="flex-row justify-between items-center">
                        <Text className="text-gray-400 text-xs">ОТДЫХ МЕЖДУ УПР. (СЕК)</Text>
                        <View className="w-20">
                            <TextInput
                                value={String(customRestEx)}
                                onChangeText={v => setCustomRestEx(parseInt(v) || 0)}
                                keyboardType="numeric"
                                className="bg-black text-center p-2 rounded text-white font-mono border border-gray-700"
                            />
                        </View>
                    </View>
                </View>

                {/* Exercises */}
                <Text className="text-flow-blue font-bold uppercase mb-4 text-xs tracking-widest pl-1">Упражнения</Text>
                {allExercises.map(ex => {
                    const conf = customConfig[ex.id] || { sets: 3, reps: 10, weight: 20 };
                    return (
                        <View key={ex.id} className="mb-4 bg-gray-900 p-4 rounded-xl border border-gray-800">
                            <Text className="text-white font-bold mb-3">{ex.name}</Text>
                            <View className="flex-row justify-between gap-2">
                                <View className="items-center flex-1">
                                    <Text className="text-gray-500 text-[10px] mb-1">СЕТЫ</Text>
                                    <TextInput
                                        value={String(conf.sets)}
                                        onChangeText={v => updateExerciseConfig(ex.id, 'sets', parseInt(v) || 0)}
                                        keyboardType="numeric"
                                        className="bg-black w-full text-center p-2 rounded text-white font-mono border border-gray-700"
                                    />
                                </View>
                                <View className="items-center flex-1">
                                    <Text className="text-gray-500 text-[10px] mb-1">ПОВТ</Text>
                                    <TextInput
                                        value={String(conf.reps)}
                                        onChangeText={v => updateExerciseConfig(ex.id, 'reps', parseInt(v) || 0)}
                                        keyboardType="numeric"
                                        className="bg-black w-full text-center p-2 rounded text-white font-mono border border-gray-700"
                                    />
                                </View>
                                <View className="items-center flex-1">
                                    <Text className="text-gray-500 text-[10px] mb-1">ВЕС (КГ)</Text>
                                    <TextInput
                                        value={String(conf.weight)}
                                        onChangeText={v => updateExerciseConfig(ex.id, 'weight', parseInt(v) || 0)}
                                        keyboardType="numeric"
                                        className="bg-black w-full text-center p-2 rounded text-flow-green font-mono border border-gray-700"
                                    />
                                </View>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        );
    };

    return (
        <Modal animationType="slide" transparent={true} visible={true} onRequestClose={onClose}>
            <View className="flex-1 justify-end bg-black/90">
                <View className="h-[90%] bg-[#111827] rounded-t-3xl flex-col overflow-hidden border-t border-gray-800">

                    {/* Header */}
                    <View className="p-6 border-b border-gray-800 flex-row justify-between items-center bg-[#111827]">
                        <Text className="text-xl font-sans font-bold text-white uppercase tracking-wider">
                            {step === 0 ? 'ТИП ТРЕНИРОВКИ' :
                                step === 4 ? 'НАСТРОЙКА' :
                                    'КОНСТРУКТОР'}
                        </Text>
                        <TouchableOpacity onPress={onClose}><Text className="text-gray-400 text-2xl">×</Text></TouchableOpacity>
                    </View>

                    {/* Step 0: Type Select */}
                    {step === 0 && (
                        <View className="flex-1 p-6 justify-center gap-6">
                            <TouchableOpacity
                                onPress={() => handleTypeSelect('PROGRESSIVE')}
                                className="bg-gray-900 p-8 rounded-xl border border-flow-green items-center"
                            >
                                <Text className="text-flow-green text-2xl font-bold uppercase mb-2">ПРОГРЕССИВНАЯ</Text>
                                <Text className="text-gray-400 text-center">Автоматическое увеличение весов и повторений. История сохраняется.</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleTypeSelect('CUSTOM')}
                                className="bg-gray-900 p-8 rounded-xl border border-flow-blue items-center"
                            >
                                <Text className="text-flow-blue text-2xl font-bold uppercase mb-2">КАСТОМНАЯ</Text>
                                <Text className="text-gray-400 text-center">Полный контроль настроек. До 8 упражнений. Без истории.</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Step 1 & 2: Muscle Groups */}
                    {(step === 1 || step === 2) && (
                        <ScrollView className="flex-1 p-6">
                            <Text className="text-gray-400 mb-4 uppercase">{step === 1 ? 'ОСНОВНАЯ МЫШЕЧНАЯ ГРУППА' : 'ДОПОЛНИТЕЛЬНАЯ ГРУППА'}</Text>
                            <View className="flex-row flex-wrap justify-between">
                                {(step === 1
                                    ? [MuscleGroup.CHEST, MuscleGroup.BACK, MuscleGroup.LEGS, MuscleGroup.SHOULDERS]
                                    : [MuscleGroup.BICEPS, MuscleGroup.TRICEPS, MuscleGroup.ABS, MuscleGroup.NONE]
                                ).map((g) => (
                                    <TouchableOpacity
                                        key={g}
                                        onPress={() => step === 1 ? handlePrimarySelect(g) : handleSecondarySelect(g)}
                                        className="w-[48%] aspect-square mb-4 bg-gray-900 border border-gray-700 rounded-lg items-center justify-center active:bg-gray-800"
                                    >
                                        <Text className="font-sans font-bold text-base tracking-widest text-center px-1 text-white">{g}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    )}

                    {/* Step 3: Exercise Selection */}
                    {step === 3 && primary && secondary && (
                        <ScrollView className="flex-1 p-6">
                            {renderExerciseList(primary, COLORS.GREEN)}
                            {secondary !== MuscleGroup.NONE && renderExerciseList(secondary, COLORS.BLUE)}
                            <Text className="text-center text-gray-500 text-xs font-mono mt-4">ВЫБРАНО: {selectedExerciseIds.length}</Text>
                        </ScrollView>
                    )}

                    {/* Step 4: Config (Custom Only) */}
                    {step === 4 && renderConfigStep()}

                    {/* Footer Actions */}
                    {step >= 3 && (
                        <View className="p-6 bg-black border-t border-gray-800">
                            {step === 3 && workoutType === 'CUSTOM' ? (
                                <TouchableOpacity
                                    onPress={() => setStep(4)}
                                    disabled={selectedExerciseIds.length === 0}
                                    className={`w-full bg-flow-blue py-4 rounded items-center ${selectedExerciseIds.length === 0 ? 'opacity-50' : ''}`}
                                >
                                    <Text className="text-black font-sans font-bold text-xl uppercase tracking-widest">ДАЛЕЕ</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={handleSave}
                                    disabled={selectedExerciseIds.length === 0}
                                    className={`w-full ${workoutType === 'CUSTOM' ? 'bg-flow-blue' : 'bg-flow-green'} py-4 rounded items-center ${selectedExerciseIds.length === 0 ? 'opacity-50' : ''}`}
                                >
                                    <Text className="text-black font-sans font-bold text-xl uppercase tracking-widest">СОХРАНИТЬ</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                </View>
            </View>
        </Modal>
    );
};
