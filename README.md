# Tariner Native - Android App

## Project Overview
This is a comprehensive React Native (Expo) port of the Tariner fitness application. It replicates the functionality of the original React web app but leverages native Android capabilities for a superior user experience.

## Key Features
- **Native Performance**: Uses `react-native` and `nativewind` for smooth UI.
- **AI Integration**: Full OpenAI integration for:
  - **Vision**: Weight detection from camera images using **GPT-4o-mini Vision** (using `expo-camera`).
  - **TTS**: Text-to-Speech generation for workout guidance using **OpenAI TTS-1** (onyx voice).
- **Data Persistence**: Uses Supabase with `AsyncStorage` and offline-first architecture logic.
- **Haptic Metronome**: Uses native device vibration for tempo keeping.

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```
   (Dependencies include: `expo`, `react-native`, `@google/genai`, `nativewind`, `tailwindcss`, `expo-camera`, etc.)

2. **Environment Configuration**:
   Create a `.env` file in the root (or rely on `app.json` config if preferred, but `.env` with `expo-router` / strict config is standard).
   However, this project uses `process.env.EXPO_PUBLIC_OPENAI_API_KEY`.
   
   Create a `.env` file:
   ```
   EXPO_PUBLIC_OPENAI_API_KEY=your_api_key_here
   ```

3. **Running the App**:
   ```bash
   npx expo start
   ```
   - Scan the QR code with the Expo Go app on your Android device.
   - Or press `a` to run on an Android Emulator (if set up).

## Project Structure
- `App.tsx`: Main entry point and state manager.
- `src/components`: UI Components (Lobby, Settings, Dashboard, CameraOverlay, Wizard).
- `src/utils`: Helper logic (AI, Audio, Progression).
- `src/lib`: Database client (Supabase).
- `src/constants.ts`: Static data (Exercises, Templates).

## Permission Notes
The app will request Camera permissions on first use of the "Check In" or "Add Weight" features.
