import { Vibration } from 'react-native';

// Simple metronome feedback
// In React Native without custom native modules, real-time audio synthesis (Web Audio API) is not available.
// We use haptic feedback (Vibration) which is effective for tempo, 
// and we can optionally play a static click sound if we add an asset.
// For now, we use Vibration as it's robust and built-in.

export const playMetronomeClick = (strong: boolean) => {
    try {
        if (strong) {
            // Long vibration/Strong
            Vibration.vibrate(100);
        } else {
            // Short vibration/Weak
            Vibration.vibrate(50);
        }

        // TODO: If sound is strictly required, use expo-av to play a 'click.mp3' asset here.
        // const sound = new Audio.Sound();
        // await sound.loadAsync(require('../../assets/click.mp3'));
        // await sound.playAsync();

    } catch (e) {
        console.error("Audio play failed", e);
    }
};
