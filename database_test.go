package main

import (
	"database/sql"
	"encoding/json"
	"testing"
	"path/filepath"
	
	_ "github.com/mattn/go-sqlite3"
)

// setupTestDB creates a temporary test database
func setupTestDB(t *testing.T) *Database {
	// Create temp directory for test database
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")
	
	// Create database directly without using environment variables
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}
	
	database := &Database{db: db}
	if err := database.migrate(); err != nil {
		t.Fatalf("Failed to migrate test database: %v", err)
	}
	
	return database
}

// TestQuestionWithIndex tests basic CRUD operations with index field
func TestQuestionWithIndex(t *testing.T) {
	db := setupTestDB(t)
	defer db.db.Close()
	
	// Test data
	options, _ := json.Marshal([]map[string]interface{}{
		{"id": "a", "text": "Option A"},
		{"id": "b", "text": "Option B"},
	})
	answer, _ := json.Marshal([]string{"a"})
	tags, _ := json.Marshal([]string{"test", "unit"})
	
	indexValue := 5
	question := &Question{
		ID:          "test-1",
		Question:    "Test question with index",
		Options:     options,
		Answer:      answer,
		Explanation: "Test explanation",
		Tags:        tags,
		ImageURL:    "",
		Difficulty:  nil,
		Source:      "Unit Test",
		Index:       &indexValue,
		CreatedAt:   "2025-07-24T00:00:00Z",
		UpdatedAt:   "2025-07-24T00:00:00Z",
	}
	
	// Test Create
	err := db.CreateQuestion(question)
	if err != nil {
		t.Fatalf("Failed to create question: %v", err)
	}
	
	// Test Read
	retrieved, err := db.GetQuestionByID("test-1")
	if err != nil {
		t.Fatalf("Failed to get question: %v", err)
	}
	
	if retrieved.Index == nil {
		t.Error("Index should not be nil")
	} else if *retrieved.Index != 5 {
		t.Errorf("Expected index 5, got %d", *retrieved.Index)
	}
	
	// Test Update
	newIndex := 10
	retrieved.Index = &newIndex
	retrieved.Question = "Updated question"
	
	err = db.UpdateQuestion(retrieved)
	if err != nil {
		t.Fatalf("Failed to update question: %v", err)
	}
	
	// Verify update
	updated, err := db.GetQuestionByID("test-1")
	if err != nil {
		t.Fatalf("Failed to get updated question: %v", err)
	}
	
	if updated.Index == nil {
		t.Error("Index should not be nil after update")
	} else if *updated.Index != 10 {
		t.Errorf("Expected updated index 10, got %d", *updated.Index)
	}
	
	if updated.Question != "Updated question" {
		t.Errorf("Expected updated question text, got %s", updated.Question)
	}
}

// TestQuestionWithoutIndex tests question without index field
func TestQuestionWithoutIndex(t *testing.T) {
	db := setupTestDB(t)
	defer db.db.Close()
	
	options, _ := json.Marshal([]map[string]interface{}{
		{"id": "a", "text": "Option A"},
	})
	answer, _ := json.Marshal([]string{"a"})
	
	question := &Question{
		ID:          "test-no-index",
		Question:    "Test question without index",
		Options:     options,
		Answer:      answer,
		Explanation: "",
		Tags:        json.RawMessage(`[]`),
		ImageURL:    "",
		Difficulty:  nil,
		Source:      "",
		Index:       nil, // No index
		CreatedAt:   "2025-07-24T00:00:00Z",
		UpdatedAt:   "2025-07-24T00:00:00Z",
	}
	
	// Test Create
	err := db.CreateQuestion(question)
	if err != nil {
		t.Fatalf("Failed to create question without index: %v", err)
	}
	
	// Test Read
	retrieved, err := db.GetQuestionByID("test-no-index")
	if err != nil {
		t.Fatalf("Failed to get question without index: %v", err)
	}
	
	if retrieved.Index != nil {
		t.Errorf("Expected index to be nil, got %v", retrieved.Index)
	}
}

// TestQuestionSorting tests the sorting functionality with index
func TestQuestionSorting(t *testing.T) {
	db := setupTestDB(t)
	defer db.db.Close()
	
	// Create a test group
	group := &QuestionGroup{
		ID:          "test-group",
		Name:        "Test Group",
		Description: "Test group for sorting",
		CreatedAt:   "2025-07-24T00:00:00Z",
		UpdatedAt:   "2025-07-24T00:00:00Z",
	}
	
	err := db.CreateQuestionGroup(group)
	if err != nil {
		t.Fatalf("Failed to create test group: %v", err)
	}
	
	// Create questions with different indices
	questions := []*Question{
		{
			ID:          "q1",
			Question:    "Question with index 3",
			Options:     json.RawMessage(`[{"id":"a","text":"A"}]`),
			Answer:      json.RawMessage(`["a"]`),
			Explanation: "",
			Tags:        json.RawMessage(`[]`),
			ImageURL:    "",
			Difficulty:  nil,
			Source:      "",
			Index:       &[]int{3}[0],
			CreatedAt:   "2025-07-24T00:00:00Z",
			UpdatedAt:   "2025-07-24T00:00:00Z",
		},
		{
			ID:          "q2",
			Question:    "Question with index 1",
			Options:     json.RawMessage(`[{"id":"a","text":"A"}]`),
			Answer:      json.RawMessage(`["a"]`),
			Explanation: "",
			Tags:        json.RawMessage(`[]`),
			ImageURL:    "",
			Difficulty:  nil,
			Source:      "",
			Index:       &[]int{1}[0],
			CreatedAt:   "2025-07-24T00:00:01Z",
			UpdatedAt:   "2025-07-24T00:00:01Z",
		},
		{
			ID:          "q3",
			Question:    "Question without index (newer)",
			Options:     json.RawMessage(`[{"id":"a","text":"A"}]`),
			Answer:      json.RawMessage(`["a"]`),
			Explanation: "",
			Tags:        json.RawMessage(`[]`),
			ImageURL:    "",
			Difficulty:  nil,
			Source:      "",
			Index:       nil,
			CreatedAt:   "2025-07-24T00:00:03Z",
			UpdatedAt:   "2025-07-24T00:00:03Z",
		},
		{
			ID:          "q4",
			Question:    "Question with index 2",
			Options:     json.RawMessage(`[{"id":"a","text":"A"}]`),
			Answer:      json.RawMessage(`["a"]`),
			Explanation: "",
			Tags:        json.RawMessage(`[]`),
			ImageURL:    "",
			Difficulty:  nil,
			Source:      "",
			Index:       &[]int{2}[0],
			CreatedAt:   "2025-07-24T00:00:02Z",
			UpdatedAt:   "2025-07-24T00:00:02Z",
		},
		{
			ID:          "q5",
			Question:    "Question without index (older)",
			Options:     json.RawMessage(`[{"id":"a","text":"A"}]`),
			Answer:      json.RawMessage(`["a"]`),
			Explanation: "",
			Tags:        json.RawMessage(`[]`),
			ImageURL:    "",
			Difficulty:  nil,
			Source:      "",
			Index:       nil,
			CreatedAt:   "2025-07-24T00:00:00Z",
			UpdatedAt:   "2025-07-24T00:00:00Z",
		},
	}
	
	// Create questions and add to group
	for _, q := range questions {
		err := db.CreateQuestion(q)
		if err != nil {
			t.Fatalf("Failed to create question %s: %v", q.ID, err)
		}
		
		err = db.AddQuestionToGroup("test-group", q.ID)
		if err != nil {
			t.Fatalf("Failed to add question %s to group: %v", q.ID, err)
		}
	}
	
	// Get questions by group (should be sorted)
	sortedQuestions, err := db.GetQuestionsByGroup("test-group")
	if err != nil {
		t.Fatalf("Failed to get questions by group: %v", err)
	}
	
	if len(sortedQuestions) != 5 {
		t.Fatalf("Expected 5 questions, got %d", len(sortedQuestions))
	}
	
	// Verify sorting order:
	// 1. Questions with index, sorted by index: q2(1), q4(2), q1(3)
	// 2. Questions without index, sorted by created_at DESC: q3(newer), q5(older)
	expectedOrder := []string{"q2", "q4", "q1", "q3", "q5"}
	
	for i, expected := range expectedOrder {
		if sortedQuestions[i].ID != expected {
			t.Errorf("Expected question %d to be %s, got %s", i, expected, sortedQuestions[i].ID)
		}
	}
	
	// Verify index values
	if sortedQuestions[0].Index == nil || *sortedQuestions[0].Index != 1 {
		t.Error("First question should have index 1")
	}
	if sortedQuestions[1].Index == nil || *sortedQuestions[1].Index != 2 {
		t.Error("Second question should have index 2")
	}
	if sortedQuestions[2].Index == nil || *sortedQuestions[2].Index != 3 {
		t.Error("Third question should have index 3")
	}
	if sortedQuestions[3].Index != nil {
		t.Error("Fourth question should have no index")
	}
	if sortedQuestions[4].Index != nil {
		t.Error("Fifth question should have no index")
	}
}