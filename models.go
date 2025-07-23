package main

import (
	"encoding/json"
	"time"
)

// Question represents a question in the database
type Question struct {
	ID          string          `json:"id" db:"id"`
	Question    string          `json:"question" db:"question"`
	Options     json.RawMessage `json:"options" db:"options"`
	Answer      json.RawMessage `json:"answer" db:"answer"`
	Explanation string          `json:"explanation" db:"explanation"`
	Tags        json.RawMessage `json:"tags" db:"tags"`
	ImageURL    string          `json:"imageUrl" db:"image_url"`
	Difficulty  *int            `json:"difficulty" db:"difficulty"`
	Source      string          `json:"source" db:"source"`
	CreatedAt   time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time       `json:"updatedAt" db:"updated_at"`
}

// QuestionGroup represents a group of questions
type QuestionGroup struct {
	ID          string          `json:"id" db:"id"`
	Name        string          `json:"name" db:"name"`
	Description string          `json:"description" db:"description"`
	ParentID    *string         `json:"parentId" db:"parent_id"`
	Color       string          `json:"color" db:"color"`
	Icon        string          `json:"icon" db:"icon"`
	QuestionIds []string        `json:"questionIds"`
	CreatedAt   time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time       `json:"updatedAt" db:"updated_at"`
}

// QuestionGroupRelation represents the many-to-many relationship between questions and groups
type QuestionGroupRelation struct {
	GroupID    string `json:"groupId" db:"group_id"`
	QuestionID string `json:"questionId" db:"question_id"`
}

// PracticeSession represents a practice session
type PracticeSession struct {
	ID             string          `json:"id" db:"id"`
	GroupID        string          `json:"groupId" db:"group_id"`
	Mode           string          `json:"mode" db:"mode"`
	StartTime      time.Time       `json:"startTime" db:"start_time"`
	EndTime        *time.Time      `json:"endTime" db:"end_time"`
	Duration       int             `json:"duration" db:"duration"`
	TotalQuestions int             `json:"totalQuestions" db:"total_questions"`
	CorrectCount   int             `json:"correctCount" db:"correct_count"`
	Details        json.RawMessage `json:"details" db:"details"`
	CreatedAt      time.Time       `json:"createdAt" db:"created_at"`
}

// UserSetting represents user configuration
type UserSetting struct {
	Key   string          `json:"key" db:"key"`
	Value json.RawMessage `json:"value" db:"value"`
}

// WrongQuestion represents a question marked for review
type WrongQuestion struct {
	ID         string    `json:"id" db:"id"`
	QuestionID string    `json:"questionId" db:"question_id"`
	AddedAt    time.Time `json:"addedAt" db:"added_at"`
	ReviewedAt *time.Time `json:"reviewedAt" db:"reviewed_at"`
	TimesReviewed int    `json:"timesReviewed" db:"times_reviewed"`
	LastResult bool      `json:"lastResult" db:"last_result"`
	Notes      string    `json:"notes" db:"notes"`
}

// ImportResult represents the result of importing questions
type ImportResult struct {
	Success    bool     `json:"success"`
	Imported   int      `json:"imported"`
	Errors     []string `json:"errors"`
	Duplicates int      `json:"duplicates"`
}

// QuestionOption represents an option for a question
type QuestionOption struct {
	ID       string `json:"id"`
	Text     string `json:"text"`
	ImageURL string `json:"imageUrl,omitempty"`
}

// QuestionRecord represents a question record in a practice session
type QuestionRecord struct {
	QuestionID string   `json:"questionId"`
	UserAnswer []string `json:"userAnswer"`
	IsCorrect  bool     `json:"isCorrect"`
	TimeSpent  int      `json:"timeSpent"`
	Marked     bool     `json:"marked"`
}