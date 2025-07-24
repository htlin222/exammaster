package main

import (
	"database/sql"
	"path/filepath"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

// TestAddIndexColumnMigration tests the safe migration of adding index column
func TestAddIndexColumnMigration(t *testing.T) {
	// Create temp directory for test database
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "migration_test.db")
	
	// First, create a database without the index column (simulate old version)
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		t.Fatalf("Failed to open database: %v", err)
	}
	
	// Create old schema without index column
	oldSchema := `
	CREATE TABLE questions (
		id TEXT PRIMARY KEY,
		question TEXT NOT NULL,
		options JSON NOT NULL,
		answer JSON NOT NULL,
		explanation TEXT,
		tags JSON,
		image_url TEXT,
		difficulty INTEGER,
		source TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`
	
	_, err = db.Exec(oldSchema)
	if err != nil {
		t.Fatalf("Failed to create old schema: %v", err)
	}
	
	// Insert test data
	_, err = db.Exec(`
		INSERT INTO questions (id, question, options, answer, created_at, updated_at)
		VALUES ('old-q1', 'Old question', '[]', '[]', '2025-07-24T00:00:00Z', '2025-07-24T00:00:00Z')
	`)
	if err != nil {
		t.Fatalf("Failed to insert test data: %v", err)
	}
	
	db.Close()
	
	// Now test the migration by opening with our Database struct
	database := &Database{}
	database.db, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		t.Fatalf("Failed to reopen database: %v", err)
	}
	defer database.db.Close()
	
	// Test the migration function
	err = database.addIndexColumnIfNotExists()
	if err != nil {
		t.Fatalf("Migration failed: %v", err)
	}
	
	// Verify the index column was added
	row := database.db.QueryRow("SELECT [index] FROM questions WHERE id = 'old-q1'")
	var index *int
	err = row.Scan(&index)
	if err != nil {
		t.Fatalf("Failed to query index column after migration: %v", err)
	}
	
	// Should be NULL for existing data
	if index != nil {
		t.Errorf("Expected index to be NULL for existing data, got %v", index)
	}
	
	// Test inserting new data with index
	newIndex := 5
	question := &Question{
		ID:          "new-q1",
		Question:    "New question with index",
		Options:     []byte(`[{"id":"a","text":"Option A"}]`),
		Answer:      []byte(`["a"]`),
		Explanation: "",
		Tags:        []byte(`[]`),
		ImageURL:    "",
		Difficulty:  nil,
		Source:      "",
		Index:       &newIndex,
		CreatedAt:   "2025-07-24T00:00:00Z",
		UpdatedAt:   "2025-07-24T00:00:00Z",
	}
	
	err = database.CreateQuestion(question)
	if err != nil {
		t.Fatalf("Failed to create question with index after migration: %v", err)
	}
	
	// Verify the new question has the correct index
	retrieved, err := database.GetQuestionByID("new-q1")
	if err != nil {
		t.Fatalf("Failed to retrieve question after migration: %v", err)
	}
	
	if retrieved.Index == nil || *retrieved.Index != 5 {
		t.Errorf("Expected index 5 for new question, got %v", retrieved.Index)
	}
}

// TestMigrationIdempotent tests that running migration multiple times is safe
func TestMigrationIdempotent(t *testing.T) {
	db := setupTestDB(t)
	defer db.db.Close()
	
	// Run migration multiple times
	for i := 0; i < 3; i++ {
		err := db.addIndexColumnIfNotExists()
		if err != nil {
			t.Fatalf("Migration run %d failed: %v", i+1, err)
		}
	}
	
	// Should still work normally
	indexValue := 42
	question := &Question{
		ID:          "idempotent-test",
		Question:    "Test question",
		Options:     []byte(`[{"id":"a","text":"Option A"}]`),
		Answer:      []byte(`["a"]`),
		Explanation: "",
		Tags:        []byte(`[]`),
		ImageURL:    "",
		Difficulty:  nil,
		Source:      "",
		Index:       &indexValue,
		CreatedAt:   "2025-07-24T00:00:00Z",
		UpdatedAt:   "2025-07-24T00:00:00Z",
	}
	
	err := db.CreateQuestion(question)
	if err != nil {
		t.Fatalf("Failed to create question after multiple migrations: %v", err)
	}
	
	retrieved, err := db.GetQuestionByID("idempotent-test")
	if err != nil {
		t.Fatalf("Failed to retrieve question: %v", err)
	}
	
	if retrieved.Index == nil || *retrieved.Index != 42 {
		t.Errorf("Expected index 42, got %v", retrieved.Index)
	}
}