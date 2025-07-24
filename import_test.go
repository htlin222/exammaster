package main

import (
	"testing"
)

// TestImportQuestionsWithIndex tests importing questions with index field
func TestImportQuestionsWithIndex(t *testing.T) {
	db := setupTestDB(t)
	defer db.db.Close()
	
	app := &App{db: db}
	
	// Create test group
	group, err := app.CreateQuestionGroup("Test Group", "Test Description", "", "#1890ff", "folder")
	if err != nil {
		t.Fatalf("Failed to create test group: %v", err)
	}
	
	// Test data with index
	testData := []map[string]interface{}{
		{
			"question": "Question with index 5",
			"options": []map[string]interface{}{
				{"id": "a", "text": "Option A"},
				{"id": "b", "text": "Option B"},
			},
			"answer":      []string{"a"},
			"explanation": "Test explanation 1",
			"tags":        []string{"test"},
			"difficulty":  float64(2),
			"source":      "Test Source",
			"index":       float64(5),
		},
		{
			"question": "Question with index 1",
			"options": []map[string]interface{}{
				{"id": "a", "text": "Option A"},
				{"id": "b", "text": "Option B"},
			},
			"answer":      []string{"b"},
			"explanation": "Test explanation 2",
			"tags":        []string{"test"},
			"difficulty":  float64(3),
			"source":      "Test Source",
			"index":       float64(1),
		},
		{
			"question": "Question without index",
			"options": []map[string]interface{}{
				{"id": "a", "text": "Option A"},
				{"id": "b", "text": "Option B"},
			},
			"answer":      []string{"a"},
			"explanation": "Test explanation 3",
			"tags":        []string{"test"},
			"difficulty":  float64(1),
			"source":      "Test Source",
			// No index field
		},
	}
	
	// Import questions
	result := app.ImportQuestions(testData, group.ID)
	
	// Verify import result
	if !result.Success {
		t.Errorf("Import should succeed, but got success=false")
	}
	
	if result.Imported != 3 {
		t.Errorf("Expected 3 imported questions, got %d", result.Imported)
	}
	
	if len(result.Errors) > 0 {
		t.Errorf("Expected no errors, got: %v", result.Errors)
	}
	
	// Get questions from group and verify sorting
	questions, err := db.GetQuestionsByGroup(group.ID)
	if err != nil {
		t.Fatalf("Failed to get questions from group: %v", err)
	}
	
	if len(questions) != 3 {
		t.Fatalf("Expected 3 questions in group, got %d", len(questions))
	}
	
	// Verify sorting: index 1, index 5, then no index
	if questions[0].Index == nil || *questions[0].Index != 1 {
		t.Error("First question should have index 1")
	}
	if questions[0].Question != "Question with index 1" {
		t.Error("First question should be 'Question with index 1'")
	}
	
	if questions[1].Index == nil || *questions[1].Index != 5 {
		t.Error("Second question should have index 5")
	}
	if questions[1].Question != "Question with index 5" {
		t.Error("Second question should be 'Question with index 5'")
	}
	
	if questions[2].Index != nil {
		t.Error("Third question should have no index")
	}
	if questions[2].Question != "Question without index" {
		t.Error("Third question should be 'Question without index'")
	}
}

// TestImportQuestionsInvalidIndex tests importing questions with invalid index values
func TestImportQuestionsInvalidIndex(t *testing.T) {
	db := setupTestDB(t)
	defer db.db.Close()
	
	app := &App{db: db}
	
	// Create test group
	group, err := app.CreateQuestionGroup("Test Group", "Test Description", "", "#1890ff", "folder")
	if err != nil {
		t.Fatalf("Failed to create test group: %v", err)
	}
	
	// Test data with string index (should be ignored)
	testData := []map[string]interface{}{
		{
			"question": "Question with string index",
			"options": []map[string]interface{}{
				{"id": "a", "text": "Option A"},
			},
			"answer": []string{"a"},
			"index":  "not-a-number", // Invalid index type
		},
		{
			"question": "Question with valid index",
			"options": []map[string]interface{}{
				{"id": "a", "text": "Option A"},
			},
			"answer": []string{"a"},
			"index":  float64(2), // Valid index
		},
	}
	
	// Import questions
	result := app.ImportQuestions(testData, group.ID)
	
	// Should still succeed (invalid index is just ignored)
	if !result.Success {
		t.Errorf("Import should succeed even with invalid index")
	}
	
	if result.Imported != 2 {
		t.Errorf("Expected 2 imported questions, got %d", result.Imported)
	}
	
	// Get questions and verify
	questions, err := db.GetQuestionsByGroup(group.ID)
	if err != nil {
		t.Fatalf("Failed to get questions from group: %v", err)
	}
	
	// Question with valid index should come first
	if questions[0].Index == nil || *questions[0].Index != 2 {
		t.Error("First question should have index 2")
	}
	
	// Question with invalid index should have no index
	if questions[1].Index != nil {
		t.Error("Second question should have no index (invalid index ignored)")
	}
}

// TestImportUserDataWithIndex tests importing user data containing index field
func TestImportUserDataWithIndex(t *testing.T) {
	db := setupTestDB(t)
	defer db.db.Close()
	
	app := &App{db: db}
	
	// Test data with index
	userData := map[string]interface{}{
		"version": "1.0.0",
		"questions": []interface{}{
			map[string]interface{}{
				"id":          "imported-1",
				"question":    "Imported question with index",
				"options":     []interface{}{map[string]interface{}{"id": "a", "text": "Option A"}},
				"answer":      []interface{}{"a"},
				"explanation": "Imported explanation",
				"tags":        []interface{}{"imported"},
				"difficulty":  float64(3),
				"source":      "Import Test",
				"index":       float64(10),
				"createdAt":   "2025-07-24T00:00:00Z",
				"updatedAt":   "2025-07-24T00:00:00Z",
			},
			map[string]interface{}{
				"id":          "imported-2",
				"question":    "Imported question without index",
				"options":     []interface{}{map[string]interface{}{"id": "a", "text": "Option A"}},
				"answer":      []interface{}{"a"},
				"explanation": "Imported explanation 2",
				"tags":        []interface{}{"imported"},
				"difficulty":  float64(1),
				"source":      "Import Test",
				// No index field
				"createdAt": "2025-07-24T00:00:00Z",
				"updatedAt": "2025-07-24T00:00:00Z",
			},
		},
	}
	
	// Import user data
	result := app.ImportUserData(userData)
	
	// Verify import result
	if !result.Success {
		t.Errorf("Import should succeed, but got success=false")
	}
	
	if result.Imported != 2 {
		t.Errorf("Expected 2 imported items, got %d", result.Imported)
	}
	
	if len(result.Errors) > 0 {
		t.Errorf("Expected no errors, got: %v", result.Errors)
	}
	
	// Verify imported questions
	q1, err := db.GetQuestionByID("imported-1")
	if err != nil {
		t.Fatalf("Failed to get imported question 1: %v", err)
	}
	
	if q1.Index == nil || *q1.Index != 10 {
		t.Error("Imported question 1 should have index 10")
	}
	
	q2, err := db.GetQuestionByID("imported-2")
	if err != nil {
		t.Fatalf("Failed to get imported question 2: %v", err)
	}
	
	if q2.Index != nil {
		t.Error("Imported question 2 should have no index")
	}
}