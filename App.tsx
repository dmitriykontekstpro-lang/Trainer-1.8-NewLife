import './global.css';
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { INITIAL_SCHEDULE, INITIAL_TEMPLATES, DAYS_OF_WEEK } from './src/data';
import { TimelineBlock, WeeklySchedule, WorkoutTemplate, WorkoutSettings, UserProfile, NutritionPlan, DailyNutritionSummary, BlockType } from './src/types';
import { prepareWorkoutTimeline } from './src/utils/progression';
import { preGenerateTimelineAudio } from './src/utils/generator';
import { initUserId } from './src/lib/supabaseClient';
import { Lobby } from './src/components/Lobby';
import { Settings } from './src/components/Settings';
import { Dashboard } from './src/components/Dashboard';
import { PrepScreen } from './src/components/PrepScreen';
import { OnboardingScreen } from './src/components/Onboarding/OnboardingScreen';
import { TrainerModal } from './src/components/TrainerModal';
import { FoodDiaryScreen } from './src/components/FoodDiary/FoodDiaryScreen';
import { loadLocalHistory, HistoryState } from './src/utils/historyStore';
import { useFonts } from 'expo-font';
import { getLocalDateKey } from './src/utils/dateHelpers';
import { getDailySummary, fetchAllFoodData } from './src/utils/foodDiaryStore';
import { WorkoutDiaryScreen } from './src/components/WorkoutDiary/WorkoutDiaryScreen';
import { saveWorkoutLog } from './src/utils/workoutDiaryStore';

const DEFAULT_WORKOUT_SETTINGS: WorkoutSettings = {
  setsPerExercise: 3,
  setDuration: 60,
  restBetweenSets: 30,
  restBetweenExercises: 120,
  repsPerSet: 8
};

export default function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [appReady, setAppReady] = useState(false);
  const [view, setView] = useState<'LOBBY' | 'PREP' | 'WORKOUT' | 'SETTINGS'>('LOBBY');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showTrainerModal, setShowTrainerModal] = useState(false);
  const [showFoodDiary, setShowFoodDiary] = useState(false);
  const [showWorkoutDiary, setShowWorkoutDiary] = useState(false);
  const [dailySummary, setDailySummary] = useState<DailyNutritionSummary | null>(null);

  // Settings Navigation
  type SettingsTab = 'ARSENAL' | 'SCHEDULE' | 'PARAMS' | 'HISTORY' | 'PROFILE';
  const [initialSettingsTab, setInitialSettingsTab] = useState<SettingsTab>('ARSENAL');

  const openSettings = (tab: SettingsTab = 'ARSENAL') => {
    setInitialSettingsTab(tab);
    setView('SETTINGS');
  };

  // App State
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(INITIAL_TEMPLATES);
  const [schedule, setSchedule] = useState<WeeklySchedule>(INITIAL_SCHEDULE);
  const [workoutSettings, setWorkoutSettings] = useState<WorkoutSettings>(DEFAULT_WORKOUT_SETTINGS);

  // Local History State
  const [history, setHistory] = useState<HistoryState>({});

  // Workout State
  const [activeTimeline, setActiveTimeline] = useState<TimelineBlock[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Init
  useEffect(() => {
    const init = async () => {
      await initUserId();
      try {
        // Fetch full food history for shared timeline
        fetchAllFoodData().then(() => {
          loadFoodData();
        });

        // Check Onboarding
        const savedProfile = await AsyncStorage.getItem('user_profile');
        if (savedProfile) {
          setUserProfile(JSON.parse(savedProfile));
        }
        // else { setShowOnboarding(true); } // Disabled per request

        // Load workout settings & history
        const saved = await AsyncStorage.getItem('workout_settings');
        if (saved) setWorkoutSettings(JSON.parse(saved));

        const savedTemplates = await AsyncStorage.getItem('saved_templates');
        if (savedTemplates) {
          const parsed = JSON.parse(savedTemplates);
          if (Array.isArray(parsed)) {
            setTemplates(parsed);
          }
        }

        const savedSchedule = await AsyncStorage.getItem('saved_schedule');
        if (savedSchedule) setSchedule(JSON.parse(savedSchedule));

        const h = await loadLocalHistory();
        setHistory(h);

      } catch (e) {
        console.error('Failed to load settings', e);
      }
      setAppReady(true);
    };
    init();
  }, []);

  // Get Today's Logic
  const todayDate = new Date();
  const todayIndex = todayDate.getDay();
  const todayTemplateId = schedule[todayIndex];
  const todayTemplate = templates.find(t => t.id === todayTemplateId);

  // Load Food Data
  const loadFoodData = async () => {
    try {
      const dateKey = getLocalDateKey(new Date());
      const summary = await getDailySummary(dateKey);
      setDailySummary(summary);
    } catch (e) {
      console.error('Failed to load food summary', e);
    }
  };

  // Reload food on mount and when modal closes
  useEffect(() => {
    if (appReady) {
      loadFoodData();
    }
  }, [appReady, showFoodDiary]);

  // NEW: Background Sync Logic with Local History
  useEffect(() => {
    if (!appReady) return;

    if (!todayTemplate) {
      setActiveTimeline([]);
      return;
    }

    const sync = async () => {
      setIsSyncing(true); // Don't block UI too much, local is fast
      try {
        console.log("Preparing workout timeline from LOCAL history...");
        const timeline = await prepareWorkoutTimeline(todayTemplate, workoutSettings, history);
        setActiveTimeline(timeline);
        console.log("Timeline ready.");
      } catch (e) {
        console.error("Timeline prep failed", e);
      } finally {
        setIsSyncing(false);
      }
    };

    sync();

  }, [todayTemplate, workoutSettings, appReady, history]);

  const handleUpdateTemplate = (newTpl: WorkoutTemplate) => {
    setTemplates(prev => {
      const idx = prev.findIndex(t => t.id === newTpl.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newTpl;
        AsyncStorage.setItem('saved_templates', JSON.stringify(copy));
        return copy;
      }
      const newArr = [...prev, newTpl];
      AsyncStorage.setItem('saved_templates', JSON.stringify(newArr));
      return newArr;
    });
  };

  const handleUpdateSchedule = (dayIndex: number, tplId: string) => {
    setSchedule(prev => {
      const copy = { ...prev };
      copy[dayIndex] = tplId;
      AsyncStorage.setItem('saved_schedule', JSON.stringify(copy));
      return copy;
    });
  };

  const handleUpdateWorkoutSettings = async (newSettings: WorkoutSettings) => {
    setWorkoutSettings(newSettings);
    try {
      await AsyncStorage.setItem('workout_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  };

  const refreshHistory = async () => {
    const h = await loadLocalHistory();
    setHistory(h);
  };

  const startPrep = () => {
    if (!todayTemplate) return;
    if (activeTimeline.length === 0 && isSyncing) {
      alert("Подождите, данные загружаются...");
      return;
    }
    setView('PREP');
  };

  const handleOnboardingComplete = (
    profile: UserProfile,
    nutrition: NutritionPlan,
    newSchedule?: WeeklySchedule,
    newTemplates?: WorkoutTemplate[]
  ) => {
    setUserProfile(profile);

    if (newSchedule) {
      setSchedule(newSchedule);
      AsyncStorage.setItem('saved_schedule', JSON.stringify(newSchedule));
    }
    if (newTemplates) {
      setTemplates(newTemplates);
      AsyncStorage.setItem('saved_templates', JSON.stringify(newTemplates));
    }

    setShowOnboarding(false);
  };

  const handleUpdateProfile = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    AsyncStorage.setItem('user_profile', JSON.stringify(newProfile));
  };

  if (!appReady) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#39FF14" />
      </View>
    );
  }

  // Show Onboarding if needed and not ready (or force it if we want to test)
  // For now: if showOnboarding is true, render it.
  if (showOnboarding) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
        <StatusBar style="light" />
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'black', paddingTop: 40 }}>
      <StatusBar style="light" />

      {view === 'LOBBY' && (
        <Lobby
          todayTemplate={todayTemplate}
          todayName={DAYS_OF_WEEK[todayIndex]}
          onStart={startPrep}
          onOpenSettings={() => openSettings('ARSENAL')}
          onOpenProfile={() => openSettings('PROFILE')}
          onAskTrainer={() => setShowTrainerModal(true)}
          onOpenFoodDiary={() => setShowFoodDiary(true)}
          onOpenWorkoutDiary={() => setShowWorkoutDiary(true)}
          isSyncing={isSyncing}
          totalDuration={activeTimeline.length > 0
            ? Math.round(activeTimeline.reduce((acc, b) => acc + (b.duration || 0), 0) / 60)
            : undefined}
          dailySummary={dailySummary}
          userProfile={userProfile}
        />
      )}

      {view === 'PREP' && (
        <PrepScreen
          onReady={() => setView('WORKOUT')}
          onCancel={() => setView('LOBBY')}
          firstExerciseName={activeTimeline.find(b => b.type === BlockType.WORK)?.exerciseName}
        />
      )}

      {view === 'WORKOUT' && (
        <Dashboard
          initialTimeline={activeTimeline}
          disableHistoryUpdate={todayTemplate?.type === 'CUSTOM'}
          onFinish={async (completedTimeline: any) => {
            // Updated to handle passed timeline if available, mainly so we don't crash
            // Saving logic moved/duplicated here but requires Dashboard update to be effective
            try {
              if (completedTimeline && Array.isArray(completedTimeline)) {
                console.log("Saving workout log...");
                const finishedExercises = completedTimeline
                  .filter((b: TimelineBlock) => b.type === BlockType.WORK && b.exerciseName)
                  .map((b: TimelineBlock) => ({
                    id: b.exerciseId || 'unknown',
                    name: b.exerciseName || 'Unknown',
                    weight: b.weight || 0,
                    sets: b.setNumber === b.totalSets ? b.totalSets : (b.setNumber || 0),
                    skipped: false,
                  }));

                const grouped: Record<string, any> = {};
                finishedExercises.forEach((ex: any) => {
                  if (!grouped[ex.name]) {
                    grouped[ex.name] = { ...ex, sets: 0 };
                  }
                  grouped[ex.name].sets += 1;
                  grouped[ex.name].weight = ex.weight;
                });

                await saveWorkoutLog(
                  getLocalDateKey(new Date()),
                  Object.values(grouped)
                );
              }
            } catch (e) {
              console.error("Failed to save to diary", e);
            }
            await refreshHistory();
            setView('LOBBY');
          }}
        />
      )}

      {view === 'SETTINGS' && (
        <Settings
          templates={templates}
          schedule={schedule}
          workoutSettings={workoutSettings}
          userProfile={userProfile}
          initialTab={initialSettingsTab}
          onUpdateTemplate={handleUpdateTemplate}
          onUpdateSchedule={handleUpdateSchedule}
          onUpdateWorkoutSettings={handleUpdateWorkoutSettings}
          onUpdateProfile={handleUpdateProfile}
          onHistoryChange={refreshHistory}
          onClose={() => setView('LOBBY')}
        />
      )}

      {showTrainerModal && (
        <TrainerModal
          visible={showTrainerModal}
          onClose={() => setShowTrainerModal(false)}
          userProfile={userProfile}
        />
      )}

      {/* Food Diary Modal */}
      <Modal
        visible={showFoodDiary}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <FoodDiaryScreen
          userProfile={userProfile}
          onClose={() => setShowFoodDiary(false)}
        />
      </Modal>

      {/* Workout Diary Modal */}
      <Modal
        visible={showWorkoutDiary}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <WorkoutDiaryScreen onClose={() => setShowWorkoutDiary(false)} />
      </Modal>

    </View>
  );
}
