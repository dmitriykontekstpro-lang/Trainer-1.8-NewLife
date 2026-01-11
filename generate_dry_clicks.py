import wave
import math
import struct
import os

def generate_click(filename, frequency, duration_ms, volume=0.5):
    sample_rate = 44100
    num_samples = int(sample_rate * duration_ms / 1000)
    
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        for i in range(num_samples):
            t = i / float(sample_rate)
            # Exponential decay for "dryness" - makes it percussive
            # Higher number in exp = faster decay = drier sound
            env = math.exp(-t * 150) 
            
            # Sine wave
            sample = math.sin(2 * math.pi * frequency * t) * env * volume
                
            value = int(max(-1.0, min(1.0, sample)) * 32767.0)
            data = struct.pack('<h', value)
            wav_file.writeframes(data)

if __name__ == "__main__":
    # Strong: High pitch "Tick", very short (40ms effective due to decay)
    generate_click('assets/metronome_strong.wav', 1800, 50, 0.9) 
    # Weak: Lower pitch "Tock"
    generate_click('assets/metronome_weak.wav', 1200, 50, 0.6)
    print("Generated dry metronome clicks.")
