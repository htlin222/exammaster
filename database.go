package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

type Database struct {
	db *sql.DB
}

// NewDatabase creates a new database connection
func NewDatabase() (*Database, error) {
	// Get appropriate data directory based on OS
	var dataDir string
	
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get home directory: %v", err)
	}

	// Use platform-appropriate data directory
	dataDir = filepath.Join(homeDir, ".exammaster")
	
	// Create data directory if it doesn't exist
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create data directory: %v", err)
	}

	dbPath := filepath.Join(dataDir, "exammaster.db")
	fmt.Printf("Database location: %s\n", dbPath) // For debugging
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %v", err)
	}

	database := &Database{db: db}
	if err := database.migrate(); err != nil {
		return nil, fmt.Errorf("failed to migrate database: %v", err)
	}

	return database, nil
}

// Close closes the database connection
func (d *Database) Close() error {
	return d.db.Close()
}

// migrate creates the database tables
func (d *Database) migrate() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS questions (
			id TEXT PRIMARY KEY,
			question TEXT NOT NULL,
			options JSON NOT NULL,
			answer JSON NOT NULL,
			explanation TEXT,
			tags JSON,
			image_url TEXT,
			difficulty INTEGER,
			source TEXT,
			[index] INTEGER,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS question_groups (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT,
			parent_id TEXT,
			color TEXT,
			icon TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (parent_id) REFERENCES question_groups(id)
		)`,
		`CREATE TABLE IF NOT EXISTS question_group_relations (
			group_id TEXT,
			question_id TEXT,
			PRIMARY KEY (group_id, question_id),
			FOREIGN KEY (group_id) REFERENCES question_groups(id) ON DELETE CASCADE,
			FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS practice_sessions (
			id TEXT PRIMARY KEY,
			group_id TEXT,
			mode TEXT NOT NULL,
			start_time DATETIME NOT NULL,
			end_time DATETIME,
			duration INTEGER DEFAULT 0,
			total_questions INTEGER NOT NULL,
			correct_count INTEGER DEFAULT 0,
			details JSON,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (group_id) REFERENCES question_groups(id)
		)`,
		`CREATE TABLE IF NOT EXISTS user_settings (
			key TEXT PRIMARY KEY,
			value JSON NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS wrong_questions (
			id TEXT PRIMARY KEY,
			question_id TEXT NOT NULL,
			added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			reviewed_at DATETIME,
			times_reviewed INTEGER DEFAULT 0,
			last_result BOOLEAN DEFAULT FALSE,
			notes TEXT,
			FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
			UNIQUE(question_id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_practice_sessions_group_id ON practice_sessions(group_id)`,
		`CREATE INDEX IF NOT EXISTS idx_practice_sessions_created_at ON practice_sessions(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_wrong_questions_added_at ON wrong_questions(added_at)`,
		`CREATE INDEX IF NOT EXISTS idx_wrong_questions_reviewed_at ON wrong_questions(reviewed_at)`,
	}

	for _, query := range queries {
		if _, err := d.db.Exec(query); err != nil {
			return fmt.Errorf("failed to execute query: %s, error: %v", query, err)
		}
	}

	// Add index column migration safely
	if err := d.addIndexColumnIfNotExists(); err != nil {
		return fmt.Errorf("failed to add index column: %v", err)
	}

	return nil
}

// addIndexColumnIfNotExists safely adds the index column if it doesn't exist
func (d *Database) addIndexColumnIfNotExists() error {
	// Check if index column exists by attempting to query it
	_, err := d.db.Exec("SELECT [index] FROM questions LIMIT 1")
	if err != nil {
		// Column doesn't exist, add it
		_, err = d.db.Exec("ALTER TABLE questions ADD COLUMN [index] INTEGER DEFAULT NULL")
		if err != nil {
			return fmt.Errorf("failed to add index column: %v", err)
		}
	}
	return nil
}

// handleNullJSON safely handles NULL JSON fields by providing default values
func handleNullJSON(nullStr sql.NullString, defaultValue string) json.RawMessage {
	if nullStr.Valid && nullStr.String != "" {
		return json.RawMessage(nullStr.String)
	}
	return json.RawMessage(defaultValue)
}

// Questions methods
func (d *Database) CreateQuestion(question *Question) error {
	query := `INSERT INTO questions (id, question, options, answer, explanation, tags, image_url, difficulty, source, [index], created_at, updated_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	
	_, err := d.db.Exec(query,
		question.ID,
		question.Question,
		question.Options,
		question.Answer,
		question.Explanation,
		question.Tags,
		question.ImageURL,
		question.Difficulty,
		question.Source,
		question.Index,
		question.CreatedAt,
		question.UpdatedAt,
	)
	return err
}

func (d *Database) GetQuestions() ([]Question, error) {
	query := `SELECT id, question, options, answer, explanation, tags, image_url, difficulty, source, [index], created_at, updated_at FROM questions ORDER BY COALESCE([index], 999999), created_at DESC`
	
	rows, err := d.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var questions []Question
	for rows.Next() {
		var q Question
		var options, answer, tags sql.NullString
		err := rows.Scan(
			&q.ID,
			&q.Question,
			&options,
			&answer,
			&q.Explanation,
			&tags,
			&q.ImageURL,
			&q.Difficulty,
			&q.Source,
			&q.Index,
			&q.CreatedAt,
			&q.UpdatedAt,
		)
		
		// Handle NULL JSON fields
		q.Options = handleNullJSON(options, `[]`)
		q.Answer = handleNullJSON(answer, `[]`)
		q.Tags = handleNullJSON(tags, `[]`)
		if err != nil {
			return nil, err
		}
		questions = append(questions, q)
	}
	return questions, nil
}

func (d *Database) GetQuestionsByGroup(groupID string) ([]Question, error) {
	query := `SELECT q.id, q.question, q.options, q.answer, q.explanation, q.tags, q.image_url, q.difficulty, q.source, q.[index], q.created_at, q.updated_at
			  FROM questions q
			  JOIN question_group_relations qgr ON q.id = qgr.question_id
			  WHERE qgr.group_id = ?
			  ORDER BY COALESCE(q.[index], 999999), q.created_at DESC`
	
	rows, err := d.db.Query(query, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var questions []Question
	for rows.Next() {
		var q Question
		var options, answer, tags sql.NullString
		err := rows.Scan(
			&q.ID,
			&q.Question,
			&options,
			&answer,
			&q.Explanation,
			&tags,
			&q.ImageURL,
			&q.Difficulty,
			&q.Source,
			&q.Index,
			&q.CreatedAt,
			&q.UpdatedAt,
		)
		
		// Handle NULL JSON fields
		q.Options = handleNullJSON(options, `[]`)
		q.Answer = handleNullJSON(answer, `[]`)
		q.Tags = handleNullJSON(tags, `[]`)
		if err != nil {
			return nil, err
		}
		questions = append(questions, q)
	}
	return questions, nil
}

// GetQuestionByID returns a single question by ID
func (d *Database) GetQuestionByID(questionID string) (*Question, error) {
	query := `SELECT id, question, options, answer, explanation, tags, image_url, difficulty, source, [index], created_at, updated_at
			  FROM questions WHERE id = ?`
	
	row := d.db.QueryRow(query, questionID)
	
	var q Question
	var options, answer, tags sql.NullString
	err := row.Scan(
		&q.ID,
		&q.Question,
		&options,
		&answer,
		&q.Explanation,
		&tags,
		&q.ImageURL,
		&q.Difficulty,
		&q.Source,
		&q.Index,
		&q.CreatedAt,
		&q.UpdatedAt,
	)
	
	// Handle NULL JSON fields
	q.Options = handleNullJSON(options, `[]`)
	q.Answer = handleNullJSON(answer, `[]`)
	q.Tags = handleNullJSON(tags, `[]`)
	if err != nil {
		return nil, err
	}
	
	return &q, nil
}

// UpdateQuestion updates a question's information
func (d *Database) UpdateQuestion(question *Question) error {
	query := `UPDATE questions SET question = ?, options = ?, answer = ?, explanation = ?, 
			  tags = ?, image_url = ?, difficulty = ?, source = ?, [index] = ?, updated_at = ? WHERE id = ?`
	
	_, err := d.db.Exec(query,
		question.Question,
		question.Options,
		question.Answer,
		question.Explanation,
		question.Tags,
		question.ImageURL,
		question.Difficulty,
		question.Source,
		question.Index,
		question.UpdatedAt,
		question.ID,
	)
	return err
}

// UpdateQuestionDifficulty updates the difficulty of a specific question
func (d *Database) UpdateQuestionDifficulty(questionID string, difficulty *int) error {
	query := `UPDATE questions SET difficulty = ?, updated_at = ? WHERE id = ?`
	
	_, err := d.db.Exec(query, difficulty, time.Now().Format(time.RFC3339), questionID)
	return err
}

// Question Groups methods
func (d *Database) CreateQuestionGroup(group *QuestionGroup) error {
	query := `INSERT INTO question_groups (id, name, description, parent_id, color, icon, created_at, updated_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	
	_, err := d.db.Exec(query,
		group.ID,
		group.Name,
		group.Description,
		group.ParentID,
		group.Color,
		group.Icon,
		group.CreatedAt,
		group.UpdatedAt,
	)
	return err
}

func (d *Database) GetQuestionGroups() ([]QuestionGroup, error) {
	query := `SELECT id, name, description, parent_id, color, icon, created_at, updated_at FROM question_groups ORDER BY created_at DESC`
	
	rows, err := d.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []QuestionGroup
	for rows.Next() {
		var g QuestionGroup
		err := rows.Scan(
			&g.ID,
			&g.Name,
			&g.Description,
			&g.ParentID,
			&g.Color,
			&g.Icon,
			&g.CreatedAt,
			&g.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		
		// Get question IDs for this group
		questionQuery := `SELECT question_id FROM question_group_relations WHERE group_id = ?`
		questionRows, err := d.db.Query(questionQuery, g.ID)
		if err != nil {
			return nil, err
		}
		
		var questionIds []string
		for questionRows.Next() {
			var questionId string
			if err := questionRows.Scan(&questionId); err != nil {
				questionRows.Close()
				return nil, err
			}
			questionIds = append(questionIds, questionId)
		}
		questionRows.Close()
		
		g.QuestionIds = questionIds
		groups = append(groups, g)
	}
	return groups, nil
}

func (d *Database) AddQuestionToGroup(groupID, questionID string) error {
	query := `INSERT OR IGNORE INTO question_group_relations (group_id, question_id) VALUES (?, ?)`
	_, err := d.db.Exec(query, groupID, questionID)
	return err
}

// UpdateQuestionGroup updates a question group's information
func (d *Database) UpdateQuestionGroup(group *QuestionGroup) error {
	query := `UPDATE question_groups SET name = ?, description = ?, parent_id = ?, color = ?, icon = ?, updated_at = ? WHERE id = ?`
	
	_, err := d.db.Exec(query,
		group.Name,
		group.Description,
		group.ParentID,
		group.Color,
		group.Icon,
		group.UpdatedAt,
		group.ID,
	)
	return err
}

// Practice Sessions methods
func (d *Database) CreatePracticeSession(session *PracticeSession) error {
	query := `INSERT INTO practice_sessions (id, group_id, mode, start_time, end_time, duration, total_questions, correct_count, details, created_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	
	_, err := d.db.Exec(query,
		session.ID,
		session.GroupID,
		session.Mode,
		session.StartTime,
		session.EndTime,
		session.Duration,
		session.TotalQuestions,
		session.CorrectCount,
		session.Details,
		session.CreatedAt,
	)
	return err
}

func (d *Database) GetPracticeSessions() ([]PracticeSession, error) {
	query := `SELECT id, group_id, mode, start_time, end_time, duration, total_questions, correct_count, details, created_at FROM practice_sessions ORDER BY created_at DESC`
	
	rows, err := d.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []PracticeSession
	for rows.Next() {
		var s PracticeSession
		err := rows.Scan(
			&s.ID,
			&s.GroupID,
			&s.Mode,
			&s.StartTime,
			&s.EndTime,
			&s.Duration,
			&s.TotalQuestions,
			&s.CorrectCount,
			&s.Details,
			&s.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}

// Settings methods
func (d *Database) SetSetting(key string, value interface{}) error {
	valueJSON, err := json.Marshal(value)
	if err != nil {
		return err
	}

	query := `INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`
	_, err = d.db.Exec(query, key, valueJSON)
	return err
}

func (d *Database) GetSetting(key string) (json.RawMessage, error) {
	query := `SELECT value FROM user_settings WHERE key = ?`
	var value json.RawMessage
	err := d.db.QueryRow(query, key).Scan(&value)
	if err != nil {
		return nil, err
	}
	return value, nil
}

// Delete methods for demo data cleanup
func (d *Database) DeleteQuestion(questionID string) error {
	tx, err := d.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Delete from question_group_relations first (foreign key constraint)
	_, err = tx.Exec(`DELETE FROM question_group_relations WHERE question_id = ?`, questionID)
	if err != nil {
		return err
	}

	// Delete the question
	_, err = tx.Exec(`DELETE FROM questions WHERE id = ?`, questionID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (d *Database) DeleteQuestionGroup(groupID string) error {
	tx, err := d.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Delete from question_group_relations first (foreign key constraint)
	_, err = tx.Exec(`DELETE FROM question_group_relations WHERE group_id = ?`, groupID)
	if err != nil {
		return err
	}

	// Delete the group
	_, err = tx.Exec(`DELETE FROM question_groups WHERE id = ?`, groupID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// Wrong Questions methods
func (d *Database) AddWrongQuestion(wrongQuestion *WrongQuestion) error {
	query := `INSERT OR REPLACE INTO wrong_questions (id, question_id, added_at, reviewed_at, times_reviewed, last_result, notes)
			  VALUES (?, ?, ?, ?, ?, ?, ?)`
	
	_, err := d.db.Exec(query,
		wrongQuestion.ID,
		wrongQuestion.QuestionID,
		wrongQuestion.AddedAt,
		wrongQuestion.ReviewedAt,
		wrongQuestion.TimesReviewed,
		wrongQuestion.LastResult,
		wrongQuestion.Notes,
	)
	return err
}

func (d *Database) GetWrongQuestions() ([]WrongQuestion, error) {
	query := `SELECT id, question_id, added_at, reviewed_at, times_reviewed, last_result, notes 
			  FROM wrong_questions ORDER BY added_at DESC`
	
	rows, err := d.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var wrongQuestions []WrongQuestion
	for rows.Next() {
		var wq WrongQuestion
		err := rows.Scan(
			&wq.ID,
			&wq.QuestionID,
			&wq.AddedAt,
			&wq.ReviewedAt,
			&wq.TimesReviewed,
			&wq.LastResult,
			&wq.Notes,
		)
		if err != nil {
			return nil, err
		}
		wrongQuestions = append(wrongQuestions, wq)
	}
	return wrongQuestions, nil
}

func (d *Database) GetWrongQuestionsWithDetails() ([]map[string]interface{}, error) {
	query := `SELECT wq.id, wq.question_id, wq.added_at, wq.reviewed_at, wq.times_reviewed, wq.last_result, wq.notes,
				q.question, q.options, q.answer, q.explanation, q.tags, q.image_url, q.difficulty, q.source
			  FROM wrong_questions wq
			  JOIN questions q ON wq.question_id = q.id
			  ORDER BY wq.added_at DESC`
	
	rows, err := d.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		var wq WrongQuestion
		var q Question
		var options, answer, tags sql.NullString
		err := rows.Scan(
			&wq.ID,
			&wq.QuestionID,
			&wq.AddedAt,
			&wq.ReviewedAt,
			&wq.TimesReviewed,
			&wq.LastResult,
			&wq.Notes,
			&q.Question,
			&options,
			&answer,
			&q.Explanation,
			&tags,
			&q.ImageURL,
			&q.Difficulty,
			&q.Source,
		)
		
		// Handle NULL JSON fields
		q.Options = handleNullJSON(options, `[]`)
		q.Answer = handleNullJSON(answer, `[]`)
		q.Tags = handleNullJSON(tags, `[]`)
		if err != nil {
			return nil, err
		}
		
		result := map[string]interface{}{
			"wrongQuestion": wq,
			"question": Question{
				ID: wq.QuestionID,
				Question: q.Question,
				Options: q.Options,
				Answer: q.Answer,
				Explanation: q.Explanation,
				Tags: q.Tags,
				ImageURL: q.ImageURL,
				Difficulty: q.Difficulty,
				Source: q.Source,
			},
		}
		results = append(results, result)
	}
	return results, nil
}

func (d *Database) UpdateWrongQuestionReview(questionID string, isCorrect bool, notes string) error {
	query := `UPDATE wrong_questions 
			  SET reviewed_at = ?, times_reviewed = times_reviewed + 1, last_result = ?, notes = ?
			  WHERE question_id = ?`
	
	_, err := d.db.Exec(query, time.Now().Format(time.RFC3339), isCorrect, notes, questionID)
	return err
}

func (d *Database) RemoveWrongQuestion(questionID string) error {
	query := `DELETE FROM wrong_questions WHERE question_id = ?`
	_, err := d.db.Exec(query, questionID)
	return err
}

func (d *Database) IsQuestionMarkedWrong(questionID string) (bool, error) {
	query := `SELECT COUNT(*) FROM wrong_questions WHERE question_id = ?`
	var count int
	err := d.db.QueryRow(query, questionID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}