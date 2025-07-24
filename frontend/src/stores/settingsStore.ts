import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserSettings } from '../types';
import { GetUserSettings, UpdateUserSettings } from '../../wailsjs/go/main/App';

// Extended settings interface for advanced features
interface ExtendedSettings extends UserSettings {
  // Timer settings
  enableTimer?: boolean;
  timePerQuestion?: number;
  
  // Answer settings
  allowSkipQuestions?: boolean;
  allowMarkQuestions?: boolean;
  showImmediateAnswers?: boolean;
  
  // Result settings
  saveHistory?: boolean;
  showDetailedStats?: boolean;
  
  // UI settings
  showExplanations?: boolean;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  showProgress?: boolean;
  highlightCorrectAnswers?: boolean;
  
  // Study settings
  studyGoal?: number;
}

interface SettingsStore {
  settings: ExtendedSettings;
  pendingSettings: ExtendedSettings;
  hasChanges: boolean;
  loading: boolean;
  updatePendingSettings: (settings: Partial<ExtendedSettings>) => void;
  applySettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
  resetSettings: () => void;
  discardChanges: () => void;
}

const defaultSettings: ExtendedSettings = {
  theme: 'light',
  fontSize: 'medium',
  defaultPracticeMode: 'practice',
  dailyReminder: false,
  language: 'zh-TW',
  
  // Timer settings
  enableTimer: false,
  timePerQuestion: 60,
  
  // Answer settings
  allowSkipQuestions: true,
  allowMarkQuestions: true,
  showImmediateAnswers: false,
  
  // Result settings
  saveHistory: true,
  showDetailedStats: true,
  
  // UI settings
  showExplanations: true,
  randomizeQuestions: true,
  randomizeOptions: false,
  showProgress: true,
  highlightCorrectAnswers: true,
  
  // Study settings
  studyGoal: 20
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      pendingSettings: defaultSettings,
      hasChanges: false,
      loading: false,

      updatePendingSettings: (settingsUpdate) => {
        const currentPending = get().pendingSettings;
        const newPendingSettings = { ...currentPending, ...settingsUpdate };
        const hasChanges = JSON.stringify(newPendingSettings) !== JSON.stringify(get().settings);
        
        set({ 
          pendingSettings: newPendingSettings,
          hasChanges
        });
      },

      applySettings: async () => {
        const { pendingSettings } = get();
        set({ loading: true });
        
        try {
          await UpdateUserSettings(pendingSettings);
          set({ 
            settings: pendingSettings,
            hasChanges: false,
            loading: false
          });
        } catch (error) {
          console.error('Failed to apply settings:', error);
          set({ loading: false });
          throw error;
        }
      },

      loadSettings: async () => {
        set({ loading: true });
        try {
          const backendSettings = await GetUserSettings();
          const mergedSettings = { ...defaultSettings, ...backendSettings };
          set({ 
            settings: mergedSettings,
            pendingSettings: mergedSettings,
            hasChanges: false,
            loading: false
          });
        } catch (error) {
          console.error('Failed to load settings:', error);
          // Use default settings if backend fails
          set({ 
            settings: defaultSettings,
            pendingSettings: defaultSettings,
            hasChanges: false,
            loading: false
          });
        }
      },

      discardChanges: () => {
        const { settings } = get();
        set({
          pendingSettings: settings,
          hasChanges: false
        });
      },

      resetSettings: () => {
        set({ 
          settings: defaultSettings,
          pendingSettings: defaultSettings,
          hasChanges: false
        });
      }
    }),
    {
      name: 'exammaster-settings'
    }
  )
);