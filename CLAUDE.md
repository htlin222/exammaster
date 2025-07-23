# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development

- `wails dev` - Start development server with hot reload (Go backend + Vite frontend)
- `wails build` - Build production executable
- `pnpm install` - Install frontend dependencies (in frontend/ directory)
- `pnpm run build` - Build frontend only (TypeScript compilation + Vite build)
- `pnpm run dev` - Start Vite dev server only (for frontend development)

### Go Backend Commands

- `go mod tidy` - Clean up Go module dependencies
- `go run .` - Run Go backend directly (development)

## Project Architecture

### Core Stack

- **Framework**: Wails v2 (Go backend + React frontend)
- **Backend**: Go 1.23 with SQLite database (github.com/mattn/go-sqlite3)
- **Frontend**: React 18 + TypeScript + Vite + Ant Design
- **State Management**: Zustand stores
- **Database**: SQLite with ~300 LOC database layer

### Backend Architecture

- **Entry Point**: `main.go` - Wails app initialization
- **Application Logic**: `app.go` - Main app struct with all exposed methods
- **Data Models**: `models.go` - Core structs (Question, QuestionGroup, PracticeSession, etc.)
- **Database Layer**: `database.go` - SQLite operations with migration system
- **Data Storage**: `~/.exammaster/exammaster.db` (SQLite database in user home)

### Frontend Architecture

- **Entry Point**: `frontend/src/main.tsx` - React app initialization
- **State Management**: Zustand stores in `frontend/src/stores/`
  - `practiceStore.ts` - Practice session state and navigation
  - `questionStore.ts` - Question and group management
  - `settingsStore.ts` - User preferences
- **Components**: Organized by feature in `frontend/src/components/`
  - `practice/` - Practice interface and results
  - `dashboard/` - Question import and management
  - `layout/` - App shell and navigation
- **Types**: Shared TypeScript interfaces in `frontend/src/types/index.ts`

### Key Data Flow

1. **Go Backend** exposes methods via Wails binding (see `app.go`)
2. **Frontend** calls Go methods through generated `wailsjs/go/main/App.js`
3. **Zustand stores** manage frontend state and coordinate with backend
4. **SQLite database** persists all data with foreign key relationships

### Database Schema

- **questions** - Core question data with JSON fields for options/answers
- **question_groups** - Hierarchical organization with parent/child relationships
- **question_group_relations** - Many-to-many between questions and groups
- **practice_sessions** - Session history with JSON details field
- **user_settings** - Key-value user preferences

### Wails Integration

- Backend methods in `app.go` are automatically exposed to frontend
- Frontend builds into `frontend/dist/` and gets embedded in Go binary
- Development uses separate processes with hot reload
- Production creates single executable with embedded frontend
