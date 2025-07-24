package main

import (
	"fmt"
	"testing"
)

func TestQuestionIndexSorting(t *testing.T) {
	// This test verifies that the SQL sorting logic works as expected
	// Questions with smaller index values should come first
	// Questions without index (NULL) should come last
	
	// Initialize database
	db, err := NewDatabase()
	if err != nil {
		t.Fatalf("Failed to create database: %v", err)
	}
	defer db.Close()
	
	// Clean up any existing test data
	db.db.Exec("DELETE FROM questions WHERE source = 'sorting_test'")
	
	// Create test questions with different index values
	testQuestions := []struct {
		question string
		index    *int
	}{
		{"Question without index", nil},
		{"Question with index 3", intPtr(3)},
		{"Question with index 1", intPtr(1)},
		{"Question with index 2", intPtr(2)},
		{"Another question without index", nil},
	}
	
	// Insert test questions
	for i, tq := range testQuestions {
		q := &Question{
			ID:       fmt.Sprintf("test_%d", i),
			Question: tq.question,
			Options:  []byte(`[{"id":"a","text":"Option A"}]`),
			Answer:   []byte(`["a"]`),
			Source:   "sorting_test",
			Index:    tq.index,
		}
		err := db.CreateQuestion(q)
		if err != nil {
			t.Fatalf("Failed to create test question: %v", err)
		}
	}
	
	// Retrieve questions and verify sorting
	questions, err := db.GetQuestions()
	if err != nil {
		t.Fatalf("Failed to get questions: %v", err)
	}
	
	// Filter to only our test questions
	var testResults []Question
	for _, q := range questions {
		if q.Source == "sorting_test" {
			testResults = append(testResults, q)
		}
	}
	
	// Verify sorting order
	expectedOrder := []string{
		"Question with index 1",
		"Question with index 2", 
		"Question with index 3",
		"Question without index",
		"Another question without index",
	}
	
	if len(testResults) != len(expectedOrder) {
		t.Fatalf("Expected %d questions, got %d", len(expectedOrder), len(testResults))
	}
	
	for i, expected := range expectedOrder {
		if testResults[i].Question != expected {
			t.Errorf("Question %d: expected '%s', got '%s'", i, expected, testResults[i].Question)
		}
	}
	
	// Clean up test data
	db.db.Exec("DELETE FROM questions WHERE source = 'sorting_test'")
}

func intPtr(i int) *int {
	return &i
}