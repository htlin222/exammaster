import { create } from 'zustand';
import { WrongQuestion, WrongQuestionWithDetails, Question } from '../types';
import { 
  GetWrongQuestions, 
  GetWrongQuestionsWithDetails, 
  GetWrongQuestionsForPractice,
  AddWrongQuestion, 
  RemoveWrongQuestion, 
  ToggleWrongQuestion,
  UpdateWrongQuestionReview,
  IsQuestionMarkedWrong
} from '../../wailsjs/go/main/App';

interface WrongQuestionStore {
  // State
  wrongQuestions: WrongQuestion[];
  wrongQuestionsWithDetails: WrongQuestionWithDetails[];
  loading: boolean;

  // Actions
  loadWrongQuestions: () => Promise<void>;
  loadWrongQuestionsWithDetails: () => Promise<void>;
  addWrongQuestion: (questionId: string, notes?: string) => Promise<void>;
  removeWrongQuestion: (questionId: string) => Promise<void>;
  toggleWrongQuestion: (questionId: string, notes?: string) => Promise<boolean>;
  updateReview: (questionId: string, isCorrect: boolean, notes?: string) => Promise<void>;
  isQuestionMarkedWrong: (questionId: string) => Promise<boolean>;
  getWrongQuestionsForPractice: () => Promise<Question[]>;
  
  // Getters
  getWrongQuestionCount: () => number;
  getUnreviewedCount: () => number;
  getRecentlyAdded: (days?: number) => WrongQuestionWithDetails[];
}

export const useWrongQuestionStore = create<WrongQuestionStore>((set, get) => ({
  // Initial state
  wrongQuestions: [],
  wrongQuestionsWithDetails: [],
  loading: false,

  // Actions
  loadWrongQuestions: async () => {
    set({ loading: true });
    try {
      const wrongQuestions = await GetWrongQuestions();
      set({ wrongQuestions: wrongQuestions || [] });
    } catch (error) {
      console.error('Failed to load wrong questions:', error);
      set({ wrongQuestions: [] });
    } finally {
      set({ loading: false });
    }
  },

  loadWrongQuestionsWithDetails: async () => {
    set({ loading: true });
    try {
      const wrongQuestionsWithDetails = await GetWrongQuestionsWithDetails();
      set({ wrongQuestionsWithDetails: (wrongQuestionsWithDetails || []) as WrongQuestionWithDetails[] });
    } catch (error) {
      console.error('Failed to load wrong questions with details:', error);
      set({ wrongQuestionsWithDetails: [] });
    } finally {
      set({ loading: false });
    }
  },

  addWrongQuestion: async (questionId: string, notes: string = '') => {
    try {
      await AddWrongQuestion(questionId, notes);
      // Reload the data
      await get().loadWrongQuestions();
      await get().loadWrongQuestionsWithDetails();
    } catch (error) {
      console.error('Failed to add wrong question:', error);
      throw error;
    }
  },

  removeWrongQuestion: async (questionId: string) => {
    try {
      await RemoveWrongQuestion(questionId);
      // Reload the data
      await get().loadWrongQuestions();
      await get().loadWrongQuestionsWithDetails();
    } catch (error) {
      console.error('Failed to remove wrong question:', error);
      throw error;
    }
  },

  toggleWrongQuestion: async (questionId: string, notes: string = '') => {
    try {
      const isNowMarked = await ToggleWrongQuestion(questionId, notes);
      // Reload the data
      await get().loadWrongQuestions();
      await get().loadWrongQuestionsWithDetails();
      return isNowMarked;
    } catch (error) {
      console.error('Failed to toggle wrong question:', error);
      throw error;
    }
  },

  updateReview: async (questionId: string, isCorrect: boolean, notes: string = '') => {
    try {
      await UpdateWrongQuestionReview(questionId, isCorrect, notes);
      // Reload the data
      await get().loadWrongQuestions();
      await get().loadWrongQuestionsWithDetails();
    } catch (error) {
      console.error('Failed to update review:', error);
      throw error;
    }
  },

  isQuestionMarkedWrong: async (questionId: string): Promise<boolean> => {
    try {
      return await IsQuestionMarkedWrong(questionId);
    } catch (error) {
      console.error('Failed to check if question is marked wrong:', error);
      return false;
    }
  },

  getWrongQuestionsForPractice: async (): Promise<Question[]> => {
    try {
      const questions = await GetWrongQuestionsForPractice();
      return (questions || []) as unknown as Question[];
    } catch (error) {
      console.error('Failed to get wrong questions for practice:', error);
      throw error;
    }
  },

  // Getters
  getWrongQuestionCount: () => {
    return get().wrongQuestions.length;
  },

  getUnreviewedCount: () => {
    return get().wrongQuestions.filter(wq => !wq.reviewedAt).length;
  },

  getRecentlyAdded: (days: number = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return get().wrongQuestionsWithDetails.filter(wqd => 
      new Date(wqd.wrongQuestion.addedAt) > cutoffDate
    );
  }
}));