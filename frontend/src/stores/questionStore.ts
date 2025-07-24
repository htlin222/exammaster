import { create } from 'zustand';
import { Question, QuestionGroup, ImportResult } from '../types';

interface QuestionStore {
  // State
  questions: Question[];
  groups: QuestionGroup[];
  loading: boolean;
  error: string | null;

  // Actions
  setQuestions: (questions: Question[]) => void;
  addQuestion: (question: Question) => void;
  updateQuestion: (id: string, question: Partial<Question>) => void;
  deleteQuestion: (id: string) => void;
  
  setGroups: (groups: QuestionGroup[]) => void;
  addGroup: (group: QuestionGroup) => void;
  updateGroup: (id: string, group: Partial<QuestionGroup>) => void;
  deleteGroup: (id: string) => void;
  
  importQuestions: (data: any[], groupId?: string) => Promise<ImportResult>;
  getQuestionsByGroup: (groupId: string) => Question[];
  searchQuestions: (query: string) => Question[];
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useQuestionStore = create<QuestionStore>((set, get) => ({
  // Initial state
  questions: [],
  groups: [],
  loading: false,
  error: null,

  // Actions
  setQuestions: (questions) => set({ questions }),
  
  addQuestion: (question) => set((state) => ({
    questions: [...state.questions, question]
  })),
  
  updateQuestion: (id, questionUpdate) => set((state) => ({
    questions: state.questions.map(q => 
      q.id === id ? { ...q, ...questionUpdate, updatedAt: new Date().toISOString() } : q
    )
  })),
  
  deleteQuestion: (id) => set((state) => ({
    questions: state.questions.filter(q => q.id !== id)
  })),

  setGroups: (groups) => set({ groups }),
  
  addGroup: (group) => set((state) => ({
    groups: [...state.groups, group]
  })),
  
  updateGroup: (id, groupUpdate) => set((state) => ({
    groups: state.groups.map(g => 
      g.id === id ? { ...g, ...groupUpdate, updatedAt: new Date().toISOString() } : g
    )
  })),
  
  deleteGroup: (id) => set((state) => ({
    groups: state.groups.filter(g => g.id !== id)
  })),

  importQuestions: async (data, groupId) => {
    set({ loading: true, error: null });
    
    try {
      const result: ImportResult = {
        success: true,
        imported: 0,
        errors: [],
        duplicates: 0
      };

      const existingQuestions = get().questions;
      const newQuestions: Question[] = [];

      for (const item of data) {
        try {
          // Validate required fields
          if (!item.question || !item.options || !item.answer) {
            result.errors.push(`Row ${data.indexOf(item) + 1}: Missing required fields`);
            continue;
          }

          // Check for duplicates
          const isDuplicate = existingQuestions.some(q => 
            q.question === item.question && 
            JSON.stringify(q.options) === JSON.stringify(item.options)
          );

          if (isDuplicate) {
            result.duplicates++;
            continue;
          }

          // Create new question
          const question: Question = {
            id: item.id || `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            question: item.question,
            options: Array.isArray(item.options) ? item.options : [],
            answer: Array.isArray(item.answer) ? item.answer : [item.answer],
            explanation: item.explanation || '',
            tags: Array.isArray(item.tags) ? item.tags : [],
            imageUrl: item.imageUrl || '',
            difficulty: item.difficulty || undefined,
            source: item.source || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          newQuestions.push(question);
          result.imported++;

        } catch (error) {
          result.errors.push(`Row ${data.indexOf(item) + 1}: ${error}`);
        }
      }

      // Add questions to store
      set((state) => ({
        questions: [...state.questions, ...newQuestions]
      }));

      // Add questions to group if specified
      if (groupId && newQuestions.length > 0) {
        const questionIds = newQuestions.map(q => q.id);
        set((state) => ({
          groups: state.groups.map(g => 
            g.id === groupId 
              ? { ...g, questionIds: [...g.questionIds, ...questionIds] }
              : g
          )
        }));
      }

      set({ loading: false });
      return result;

    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : 'Import failed' });
      return {
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Import failed'],
        duplicates: 0
      };
    }
  },

  getQuestionsByGroup: (groupId) => {
    const state = get();
    const group = state.groups.find(g => g.id === groupId);
    if (!group) return [];
    
    return state.questions.filter(q => group.questionIds.includes(q.id));
  },

  searchQuestions: (query) => {
    const state = get();
    const lowercaseQuery = query.toLowerCase();
    
    return state.questions.filter(q => 
      q.question.toLowerCase().includes(lowercaseQuery) ||
      q.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
      q.source?.toLowerCase().includes(lowercaseQuery) ||
      q.options?.some(option => option.text.toLowerCase().includes(lowercaseQuery)) ||
      q.explanation?.toLowerCase().includes(lowercaseQuery)
    );
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));