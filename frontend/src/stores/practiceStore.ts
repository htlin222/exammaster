import { create } from 'zustand';
import { PracticeSession, PracticeMode, PracticeState, Question } from '../types';
import { SavePracticeSession, GetPracticeSessions } from '../../wailsjs/go/main/App';

interface PracticeStore {
  // State
  currentSession: PracticeSession | null;
  practiceState: PracticeState;
  sessions: PracticeSession[];
  loading: boolean;
  currentQuestions: Question[]; // Store current questions for result calculation

  // Actions
  startPractice: (questions: Question[], groupId: string, mode: PracticeMode) => void;
  endPractice: () => PracticeSession | null;
  
  // Navigation
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  
  // Answering
  selectAnswer: (questionId: string, answers: string[]) => void;
  toggleMarkQuestion: (questionId: string) => void;
  
  // Timer
  startTimer: () => void;
  stopTimer: () => void;
  updateTimeSpent: (questionId: string, timeSpent: number) => void;
  
  // Session management
  saveSession: (session: PracticeSession) => void;
  getSessions: () => PracticeSession[];
  getSessionsByGroup: (groupId: string) => PracticeSession[];
  loadSessions: () => Promise<void>;
  
  // Reset
  resetPractice: () => void;
}

const initialPracticeState: PracticeState = {
  currentQuestionIndex: 0,
  userAnswers: {},
  markedQuestions: new Set(),
  timeSpent: {},
  isTimerRunning: false,
  sessionStartTime: undefined,
};

export const usePracticeStore = create<PracticeStore>((set, get) => ({
  // Initial state
  currentSession: null,
  practiceState: initialPracticeState,
  sessions: [],
  loading: false,
  currentQuestions: [],

  // Actions
  startPractice: (questions, groupId, mode) => {
    const session: PracticeSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      groupId,
      mode,
      startTime: new Date().toISOString(),
      duration: 0,
      totalQuestions: questions.length,
      correctCount: 0,
      accuracy: 0,
      questions: questions.map(q => ({
        questionId: q.id,
        userAnswer: [],
        isCorrect: false,
        timeSpent: 0,
        marked: false
      })),
      createdAt: new Date().toISOString()
    };

    set({
      currentSession: session,
      currentQuestions: questions,
      practiceState: {
        ...initialPracticeState,
        sessionStartTime: new Date(),
        isTimerRunning: mode === 'test' // Auto-start timer for test mode
      }
    });
  },

  endPractice: () => {
    const state = get();
    if (!state.currentSession) return null;

    const endTime = new Date();
    const duration = state.practiceState.sessionStartTime 
      ? Math.floor((endTime.getTime() - state.practiceState.sessionStartTime.getTime()) / 1000)
      : 0;

    // Calculate results
    let correctCount = 0;
    const updatedQuestions = state.currentSession.questions.map(q => {
      const userAnswer = state.practiceState.userAnswers[q.questionId] || [];
      const originalQuestion = state.currentQuestions.find(oq => oq.id === q.questionId);
      const isCorrect = originalQuestion 
        ? JSON.stringify(userAnswer.sort()) === JSON.stringify(originalQuestion.answer.sort())
        : false;
      if (isCorrect) correctCount++;
      
      return {
        ...q,
        userAnswer,
        isCorrect,
        timeSpent: state.practiceState.timeSpent[q.questionId] || 0,
        marked: state.practiceState.markedQuestions.has(q.questionId)
      };
    });

    const completedSession: PracticeSession = {
      ...state.currentSession,
      endTime: endTime.toISOString(),
      duration,
      correctCount,
      accuracy: state.currentSession.totalQuestions > 0 
        ? (correctCount / state.currentSession.totalQuestions) * 100 
        : 0,
      questions: updatedQuestions
    };

    // Save session to backend
    SavePracticeSession(completedSession).then(() => {
      console.log('Session saved to backend successfully');
      // Load updated sessions from backend
      get().loadSessions();
    }).catch((error) => {
      console.error('Failed to save session to backend:', error);
    });

    // Update local state
    set((prevState) => ({
      sessions: [...prevState.sessions, completedSession],
      currentSession: null,
      currentQuestions: [],
      practiceState: initialPracticeState
    }));

    return completedSession;
  },

  goToQuestion: (index) => {
    set((state) => ({
      practiceState: {
        ...state.practiceState,
        currentQuestionIndex: index
      }
    }));
  },

  nextQuestion: () => {
    const state = get();
    const maxIndex = state.currentSession?.totalQuestions ?? 0;
    const nextIndex = Math.min(state.practiceState.currentQuestionIndex + 1, maxIndex - 1);
    
    set((prevState) => ({
      practiceState: {
        ...prevState.practiceState,
        currentQuestionIndex: nextIndex
      }
    }));
  },

  previousQuestion: () => {
    const state = get();
    const prevIndex = Math.max(state.practiceState.currentQuestionIndex - 1, 0);
    
    set((prevState) => ({
      practiceState: {
        ...prevState.practiceState,
        currentQuestionIndex: prevIndex
      }
    }));
  },

  selectAnswer: (questionId, answers) => {
    set((state) => ({
      practiceState: {
        ...state.practiceState,
        userAnswers: {
          ...state.practiceState.userAnswers,
          [questionId]: answers
        }
      }
    }));
  },

  toggleMarkQuestion: (questionId) => {
    set((state) => {
      const newMarkedQuestions = new Set(state.practiceState.markedQuestions);
      if (newMarkedQuestions.has(questionId)) {
        newMarkedQuestions.delete(questionId);
      } else {
        newMarkedQuestions.add(questionId);
      }
      
      return {
        practiceState: {
          ...state.practiceState,
          markedQuestions: newMarkedQuestions
        }
      };
    });
  },

  startTimer: () => {
    set((state) => ({
      practiceState: {
        ...state.practiceState,
        isTimerRunning: true,
        sessionStartTime: state.practiceState.sessionStartTime || new Date()
      }
    }));
  },

  stopTimer: () => {
    set((state) => ({
      practiceState: {
        ...state.practiceState,
        isTimerRunning: false
      }
    }));
  },

  updateTimeSpent: (questionId, timeSpent) => {
    set((state) => ({
      practiceState: {
        ...state.practiceState,
        timeSpent: {
          ...state.practiceState.timeSpent,
          [questionId]: timeSpent
        }
      }
    }));
  },

  saveSession: (session) => {
    set((state) => ({
      sessions: [...state.sessions, session]
    }));
  },

  getSessions: () => {
    return get().sessions;
  },

  getSessionsByGroup: (groupId) => {
    const state = get();
    return state.sessions.filter(session => session.groupId === groupId);
  },

  loadSessions: async () => {
    try {
      const backendSessions = await GetPracticeSessions();
      const convertedSessions = (backendSessions || []).map((s: any) => ({
        ...s,
        startTime: s.startTime,
        endTime: s.endTime,
        questions: s.details ? JSON.parse(s.details) : [],
        accuracy: s.totalQuestions > 0 ? (s.correctCount / s.totalQuestions) * 100 : 0,
        createdAt: s.createdAt
      }));
      
      set({ sessions: convertedSessions });
    } catch (error) {
      console.error('Failed to load sessions from backend:', error);
    }
  },

  resetPractice: () => {
    set({
      currentSession: null,
      currentQuestions: [],
      practiceState: initialPracticeState
    });
  }
}));