import wave
import math
import struct
import os

def generate_beep(filename, frequency, duration_ms, volume=0.5):
    sample_rate = 44100
    num_samples = int(sample_rate * duration_ms / 1000)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        for i in range(num_samples):
            # Apply a simple envelope to avoid clicks
            env = 1.0
            if i < 500: env = i / 500.0
            if i > num_samples - 500: env = (num_samples - i) / 500.0
            
            value = int(volume * env * 32767.0 * math.sin(2.0 * math.pi * frequency * i / sample_rate))
            data = struct.pack('<h', value)
            wav_file.writeframes(data)

if __name__ == "__main__":
    print("Generating sounds...")
    try:
        generate_beep('assets/metronome_strong.wav', 1200, 50, 0.8) # High tick
        generate_beep('assets/metronome_weak.wav', 800, 50, 0.4)    # Low tick
        generate_beep('assets/countdown_beep.wav', 1500, 150, 0.6)  # Beep
        print("Success: Generated metronome_strong.wav, metronome_weak.wav, countdown_beep.wav")
    except Exception as e:
        print(f"Error: {e}")
