import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Vibration, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { identifyWeightFromImage } from '../utils/gemini';

interface CameraOverlayProps {
    onWeightDetected: (weight: number) => void;
    onClose: () => void;
    initialWeight?: number;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({ onWeightDetected, onClose, initialWeight }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);

    const [analyzing, setAnalyzing] = useState(false);
    const [detectedWeight, setDetectedWeight] = useState<number | null>(null);
    const [manualMode, setManualMode] = useState(false);
    const [manualValue, setManualValue] = useState<string>('20');

    // Request permission on mount if not granted
    React.useEffect(() => {
        if (permission && !permission.granted && permission.canAskAgain) {
            requestPermission();
        }
        // If init weight is provided, set manual value just in case
        if (initialWeight) setManualValue(initialWeight.toString());
    }, [permission, initialWeight]);

    const captureAndAnalyze = async () => {
        if (!cameraRef.current) return;

        setAnalyzing(true);
        try {
            const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });

            if (photo?.base64) {
                const weight = await identifyWeightFromImage(photo.base64);
                if (weight > 0) {
                    setDetectedWeight(weight);
                    setManualValue(weight.toString());
                    Vibration.vibrate(50); // Haptic feedback on success
                } else {
                    setDetectedWeight(0);
                    setManualMode(true);
                }
            }
        } catch (e) {
            console.error("Capture Failed", e);
            setManualMode(true);
        }
        setAnalyzing(false);
    };

    const handleConfirm = () => {
        const finalWeight = detectedWeight || parseFloat(manualValue) || 20;
        onWeightDetected(finalWeight);
    };

    const handleManualSubmit = () => {
        onWeightDetected(parseFloat(manualValue) || 0);
    };

    if (!permission || !permission.granted) {
        // Fallback UI if no permission
        // We can just show manual mode immediately
        if (!manualMode) setManualMode(true);
    }

    return (
        <Modal visible={true} animationType="slide" onRequestClose={onClose}>
            <View className="flex-1 bg-black">
                {!manualMode ? (
                    <View className="flex-1 relative">
                        <CameraView
                            ref={cameraRef}
                            style={{ flex: 1 }}
                            facing="back"
                        />

                        {/* Cyberpunk Overlay Layers */}
                        {/* Reticle */}
                        {!detectedWeight && (
                            <View className="absolute top-1/2 left-1/2 w-64 h-64 border-2 border-flow-green/50 rounded-lg -ml-32 -mt-32">
                                {/* Corners */}
                                <View className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-flow-green" />
                                <View className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-flow-green" />
                                <View className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-flow-green" />
                                <View className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-flow-green" />

                                {analyzing && (
                                    <ActivityIndicator size="large" color="#39FF14" className="mt-24" />
                                )}
                            </View>
                        )}

                        {/* Result Overlay */}
                        {detectedWeight !== null && (
                            <View className="absolute inset-0 items-center justify-center bg-black/60 z-20">
                                <Text className="text-flow-green font-mono text-sm mb-2">AI IDENTIFIED</Text>
                                <View className="flex-row items-baseline mb-6">
                                    <Text className="text-8xl font-sans font-bold text-white">{detectedWeight}</Text>
                                    <Text className="text-2xl text-gray-400 ml-2">KG</Text>
                                </View>

                                <View className="flex-row gap-4">
                                    <TouchableOpacity onPress={() => { setDetectedWeight(null); captureAndAnalyze(); }} className="px-6 py-3 border border-gray-600 rounded">
                                        <Text className="text-white font-mono uppercase">Retry</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleConfirm} className="px-8 py-3 bg-flow-green rounded shadow shadow-green-400">
                                        <Text className="text-black font-bold font-sans uppercase">Confirm</Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity onPress={() => setManualMode(true)} className="mt-8">
                                    <Text className="text-sm text-gray-400 underline">Manual Edit</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Bottom Controls */}
                        {!detectedWeight && (
                            <View className="absolute bottom-0 w-full p-8 items-center bg-black/50">
                                <Text className="text-white font-sans text-center mb-6 uppercase tracking-wider shadow-black shadow-md">
                                    Наведите на цифры
                                </Text>

                                <View className="flex-row items-center gap-8">
                                    <TouchableOpacity onPress={() => setManualMode(true)} className="w-12 h-12 rounded-full border border-gray-600 items-center justify-center">
                                        <Text className="text-gray-400 text-2xl">⌨</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={captureAndAnalyze}
                                        disabled={analyzing}
                                        className={`w-20 h-20 rounded-full border-4 border-white items-center justify-center ${analyzing ? 'opacity-50' : ''}`}
                                    >
                                        <View className="w-16 h-16 bg-white rounded-full" />
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={onClose} className="w-12 h-12 rounded-full border border-gray-600 items-center justify-center">
                                        <Text className="text-gray-400 text-lg">✕</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                    </View>
                ) : (
                    /* Manual Mode */
                    <View className="flex-1 bg-black items-center justify-center p-6">
                        <Text className="text-2xl font-sans font-bold text-white mb-6 uppercase">Ввод веса вручную</Text>

                        <View className="flex-row items-end gap-2 mb-8">
                            <TextInput
                                value={manualValue}
                                onChangeText={setManualValue}
                                keyboardType="numeric"
                                className="bg-gray-900 border-b-2 border-flow-green text-center text-6xl text-white font-mono w-48 p-2"
                                autoFocus
                            />
                            <Text className="text-gray-500 font-sans text-xl mb-4">KG</Text>
                        </View>

                        <TouchableOpacity onPress={handleManualSubmit} className="w-full bg-flow-green py-4 rounded items-center">
                            <Text className="text-black font-bold uppercase tracking-widest text-xl">Сохранить</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setManualMode(false)} className="mt-6">
                            <Text className="text-gray-500 uppercase text-xs">Вернуться к камере</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Modal>
    );
};
