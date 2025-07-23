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
}

interface SettingsStore {
  settings: ExtendedSettings;
  updateSettings: (settings: Partial<ExtendedSettings>) => Promise<void>;
  loadSettings: () => Promise<void>;
  resetSettings: () => void;
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
  highlightCorrectAnswers: true
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,

      updateSettings: async (settingsUpdate) => {
        const newSettings = { ...get().settings, ...settingsUpdate };
        
        try {
          await UpdateUserSettings(newSettings);
          set({ settings: newSettings });
        } catch (error) {
          console.error('Failed to update settings:', error);
          throw error;
        }
      },

      loadSettings: async () => {
        try {
          const backendSettings = await GetUserSettings();
          const mergedSettings = { ...defaultSettings, ...backendSettings };
          set({ settings: mergedSettings });
        } catch (error) {
          console.error('Failed to load settings:', error);
          // Use default settings if backend fails
          set({ settings: defaultSettings });
        }
      },

      resetSettings: () => set({ settings: defaultSettings })
    }),
    {
      name: 'exammaster-settings'
    }
  )
);