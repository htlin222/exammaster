package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// Helper function to get map keys for debugging
func getKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

// App struct
type App struct {
	ctx context.Context
	db  *Database
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	
	// Initialize database
	db, err := NewDatabase()
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	a.db = db
}

// shutdown is called when the app is closing
func (a *App) shutdown(ctx context.Context) {
	if a.db != nil {
		a.db.Close()
	}
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// Question management methods

// ImportQuestions imports questions from JSON data
func (a *App) ImportQuestions(data []map[string]interface{}, groupID string) ImportResult {
	result := ImportResult{
		Success:    true,
		Imported:   0,
		Errors:     []string{},
		Duplicates: 0,
	}

	// Get existing questions to check for duplicates
	existingQuestions, err := a.db.GetQuestions()
	if err != nil {
		result.Success = false
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to get existing questions: %v", err))
		return result
	}

	// Create a map for quick duplicate checking
	existingMap := make(map[string]bool)
	for _, q := range existingQuestions {
		key := fmt.Sprintf("%s-%s", q.Question, string(q.Options))
		existingMap[key] = true
	}

	for i, item := range data {
		log.Printf("ImportQuestions: Processing item %d", i+1)
		log.Printf("ImportQuestions: Item keys: %v", getKeys(item))
		
		// Validate required fields
		question, hasQuestion := item["question"].(string)
		if !hasQuestion || question == "" {
			log.Printf("ImportQuestions: Missing question field for item %d", i+1)
			result.Errors = append(result.Errors, fmt.Sprintf("Row %d: Missing question field", i+1))
			continue
		}

		log.Printf("ImportQuestions: Question text: %s", question)

		// Check for duplicates
		optionsJSON, err := json.Marshal(item["options"])
		if err != nil {
			log.Printf("ImportQuestions: Failed to marshal options for item %d: %v", i+1, err)
			result.Errors = append(result.Errors, fmt.Sprintf("Row %d: Failed to marshal options", i+1))
			continue
		}
		
		key := fmt.Sprintf("%s-%s", question, string(optionsJSON))
		log.Printf("ImportQuestions: Duplicate check key: %s", key)
		
		if existingMap[key] {
			log.Printf("ImportQuestions: Duplicate found for item %d", i+1)
			result.Duplicates++
			continue
		}

		// Create question
		q := &Question{
			ID:          fmt.Sprintf("q_%d_%d_%d", time.Now().UnixNano(), rand.Int63(), i),
			Question:    question,
			CreatedAt:   time.Now().Format(time.RFC3339),
			UpdatedAt:   time.Now().Format(time.RFC3339),
		}

		// Set options
		if options, err := json.Marshal(item["options"]); err == nil {
			q.Options = options
		} else {
			result.Errors = append(result.Errors, fmt.Sprintf("Row %d: Invalid options format", i+1))
			continue
		}

		// Set answer
		if answer, err := json.Marshal(item["answer"]); err == nil {
			q.Answer = answer
		} else {
			result.Errors = append(result.Errors, fmt.Sprintf("Row %d: Invalid answer format", i+1))
			continue
		}

		// Set optional fields
		if explanation, ok := item["explanation"].(string); ok {
			q.Explanation = explanation
		}

		if tags, err := json.Marshal(item["tags"]); err == nil {
			q.Tags = tags
		}

		if imageURL, ok := item["imageUrl"].(string); ok {
			q.ImageURL = imageURL
		}

		if difficulty, ok := item["difficulty"].(float64); ok {
			difficultyInt := int(difficulty)
			q.Difficulty = &difficultyInt
		}

		if source, ok := item["source"].(string); ok {
			q.Source = source
		}

		if index, ok := item["index"].(float64); ok {
			indexInt := int(index)
			q.Index = &indexInt
		}

		// Save to database
		if err := a.db.CreateQuestion(q); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Row %d: Failed to save question: %v", i+1, err))
			continue
		}

		// Handle group assignment
		var targetGroupID string
		
		// Check if question has individual group field
		if groupName, ok := item["group"].(string); ok && groupName != "" {
			// Find or create group by name
			existingGroups, err := a.db.GetQuestionGroups()
			if err == nil {
				found := false
				for _, group := range existingGroups {
					if group.Name == groupName {
						targetGroupID = group.ID
						found = true
						break
					}
				}
				
				// Create new group if not found
				if !found {
					newGroup := &QuestionGroup{
						ID:          fmt.Sprintf("group_%d_%d", time.Now().UnixNano(), rand.Int63()),
						Name:        groupName,
						Description: fmt.Sprintf("Auto-created group: %s", groupName),
						Color:       "#1890ff",
						Icon:        "folder",
						CreatedAt:   time.Now().Format(time.RFC3339),
						UpdatedAt:   time.Now().Format(time.RFC3339),
					}
					if err := a.db.CreateQuestionGroup(newGroup); err == nil {
						targetGroupID = newGroup.ID
					}
				}
			}
		} else if groupID != "" {
			// Use the pre-selected group from UI
			targetGroupID = groupID
		}

		// Add to group if we have a target group
		if targetGroupID != "" {
			if err := a.db.AddQuestionToGroup(targetGroupID, q.ID); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("Row %d: Failed to add to group: %v", i+1, err))
			}
		}

		result.Imported++
		existingMap[key] = true
	}

	return result
}

// GetQuestions returns all questions
func (a *App) GetQuestions() ([]Question, error) {
	return a.db.GetQuestions()
}

// GetQuestionsByGroup returns questions for a specific group
func (a *App) GetQuestionsByGroup(groupID string) ([]Question, error) {
	return a.db.GetQuestionsByGroup(groupID)
}

// Question Group management methods

// CreateQuestionGroup creates a new question group
func (a *App) CreateQuestionGroup(name, description, parentID, color, icon string) (*QuestionGroup, error) {
	group := &QuestionGroup{
		ID:          fmt.Sprintf("group_%d_%d", time.Now().UnixNano(), rand.Int63()),
		Name:        name,
		Description: description,
		Color:       color,
		Icon:        icon,
		CreatedAt:   time.Now().Format(time.RFC3339),
		UpdatedAt:   time.Now().Format(time.RFC3339),
	}

	if parentID != "" {
		group.ParentID = &parentID
	}

	if err := a.db.CreateQuestionGroup(group); err != nil {
		return nil, err
	}

	return group, nil
}

// GetQuestionGroups returns all question groups
func (a *App) GetQuestionGroups() ([]QuestionGroup, error) {
	return a.db.GetQuestionGroups()
}

// CreateQuestion creates a new question
func (a *App) CreateQuestion(question Question) (*Question, error) {
	// Generate ID if not provided
	if question.ID == "" {
		question.ID = fmt.Sprintf("q_%d_%d", time.Now().UnixNano(), rand.Int63())
	}
	
	// Set timestamps
	now := time.Now().Format(time.RFC3339)
	question.CreatedAt = now
	question.UpdatedAt = now
	
	// Save to database
	if err := a.db.CreateQuestion(&question); err != nil {
		return nil, fmt.Errorf("failed to create question: %v", err)
	}
	
	return &question, nil
}
// UpdateQuestion updates an existing question
func (a *App) UpdateQuestion(question Question) error {
	// Set updated timestamp
	question.UpdatedAt = time.Now().Format(time.RFC3339)
	
	// Update in database
	if err := a.db.UpdateQuestion(&question); err != nil {
		return fmt.Errorf("failed to update question: %v", err)
	}
	
	return nil
}
// DeleteQuestion deletes a question by ID
func (a *App) DeleteQuestion(questionID string) error {
	if err := a.db.DeleteQuestion(questionID); err != nil {
		return fmt.Errorf("failed to delete question: %v", err)
	}
	return nil
}
// GetQuestionByID gets a question by ID
func (a *App) GetQuestionByID(questionID string) (*Question, error) {
	return a.db.GetQuestionByID(questionID)
}

// Practice Session management methods

// CreatePracticeSession creates a new practice session
func (a *App) CreatePracticeSession(groupID, mode string, totalQuestions int) (*PracticeSession, error) {
	session := &PracticeSession{
		ID:             fmt.Sprintf("session_%d", time.Now().Unix()),
		GroupID:        groupID,
		Mode:           mode,
		StartTime:      time.Now().Format(time.RFC3339),
		TotalQuestions: totalQuestions,
		CreatedAt:      time.Now().Format(time.RFC3339),
	}

	if err := a.db.CreatePracticeSession(session); err != nil {
		return nil, err
	}

	return session, nil
}

// SavePracticeSession saves a completed practice session
func (a *App) SavePracticeSession(sessionData map[string]interface{}) error {
	// Convert sessionData to PracticeSession struct
	session := &PracticeSession{
		ID:             sessionData["id"].(string),
		GroupID:        sessionData["groupId"].(string),
		Mode:           sessionData["mode"].(string),
		TotalQuestions: int(sessionData["totalQuestions"].(float64)),
		CorrectCount:   int(sessionData["correctCount"].(float64)),
		Duration:       int(sessionData["duration"].(float64)),
		CreatedAt:      time.Now().Format(time.RFC3339),
	}

	// Parse start time
	if startTimeStr, ok := sessionData["startTime"].(string); ok {
		startTime, err := time.Parse(time.RFC3339, startTimeStr)
		if err != nil {
			return fmt.Errorf("failed to parse start time: %v", err)
		}
		session.StartTime = startTime.Format(time.RFC3339)
	}

	// Parse end time
	if endTimeStr, ok := sessionData["endTime"].(string); ok && endTimeStr != "" {
		endTime, err := time.Parse(time.RFC3339, endTimeStr)
		if err != nil {
			return fmt.Errorf("failed to parse end time: %v", err)
		}
		endTimeStr := endTime.Format(time.RFC3339)
		session.EndTime = &endTimeStr
	}

	// Convert questions array to JSON details
	if questions, ok := sessionData["questions"]; ok {
		detailsJSON, err := json.Marshal(questions)
		if err != nil {
			return fmt.Errorf("failed to marshal session details: %v", err)
		}
		session.Details = detailsJSON
	}

	// Update question difficulties based on session results
	if err := a.updateQuestionDifficulties(*session); err != nil {
		log.Printf("Warning: Failed to update question difficulties: %v", err)
	}

	// Auto-add wrong questions (but check user preferences first)
	if err := a.AddWrongQuestionsFromSession(sessionData); err != nil {
		log.Printf("Warning: Failed to add wrong questions from session: %v", err)
	}

	return a.db.CreatePracticeSession(session)
}

// updateQuestionDifficulties adjusts question difficulties based on accuracy rates
func (a *App) updateQuestionDifficulties(session PracticeSession) error {
	if session.TotalQuestions == 0 {
		return nil
	}

	// Parse session details to get question-level results
	var questions []map[string]interface{}
	if err := json.Unmarshal(session.Details, &questions); err != nil {
		return fmt.Errorf("failed to parse session details: %v", err)
	}

	// Calculate accuracy rate
	accuracyRate := float64(session.CorrectCount) / float64(session.TotalQuestions) * 100

	// Determine difficulty adjustment based on accuracy
	var difficultyAdjustment int
	switch {
	case accuracyRate > 80:
		difficultyAdjustment = 1 // Make harder
	case accuracyRate >= 60:
		difficultyAdjustment = 0 // Keep same
	case accuracyRate >= 40:
		difficultyAdjustment = -1 // Make slightly easier
	case accuracyRate >= 20:
		difficultyAdjustment = -2 // Make moderately easier
	default:
		difficultyAdjustment = -3 // Make much easier
	}

	log.Printf("Session accuracy: %.1f%%, difficulty adjustment: %d", accuracyRate, difficultyAdjustment)

	// Update each question's difficulty based on individual performance
	for _, q := range questions {
		questionID, ok := q["questionId"].(string)
		if !ok {
			continue
		}

		isCorrect, ok := q["isCorrect"].(bool)
		if !ok {
			continue
		}

		// Get current question
		currentQuestion, err := a.db.GetQuestionByID(questionID)
		if err != nil {
			log.Printf("Warning: Failed to get question %s: %v", questionID, err)
			continue
		}

		// Calculate individual adjustment
		individualAdjustment := difficultyAdjustment
		if isCorrect && accuracyRate <= 60 {
			// Question was answered correctly but overall performance was poor
			// Don't make this specific question harder
			individualAdjustment = 0
		} else if !isCorrect && accuracyRate >= 80 {
			// Question was answered incorrectly but overall performance was good
			// Make this specific question slightly easier
			individualAdjustment = -1
		}

		// Apply adjustment
		newDifficulty := currentQuestion.Difficulty
		if newDifficulty != nil {
			adjustedDifficulty := *newDifficulty + individualAdjustment
			// Clamp between 1 and 5
			if adjustedDifficulty < 1 {
				adjustedDifficulty = 1
			} else if adjustedDifficulty > 5 {
				adjustedDifficulty = 5
			}
			newDifficulty = &adjustedDifficulty
		} else {
			// If no difficulty set, start with 3 (medium) and apply adjustment
			baseDifficulty := 3 + individualAdjustment
			if baseDifficulty < 1 {
				baseDifficulty = 1
			} else if baseDifficulty > 5 {
				baseDifficulty = 5
			}
			newDifficulty = &baseDifficulty
		}

		// Update in database
		if err := a.db.UpdateQuestionDifficulty(questionID, newDifficulty); err != nil {
			log.Printf("Warning: Failed to update difficulty for question %s: %v", questionID, err)
		} else {
			oldDiff := "nil"
			if currentQuestion.Difficulty != nil {
				oldDiff = fmt.Sprintf("%d", *currentQuestion.Difficulty)
			}
			log.Printf("Updated question %s difficulty: %s → %d", questionID, oldDiff, *newDifficulty)
		}
	}

	return nil
}

// GetPracticeSessions returns all practice sessions
func (a *App) GetPracticeSessions() ([]PracticeSession, error) {
	return a.db.GetPracticeSessions()
}

// InitializeDemoData creates demo question groups and questions for new users
func (a *App) InitializeDemoData() ImportResult {
	result := ImportResult{
		Success:    true,
		Imported:   0,
		Errors:     []string{},
		Duplicates: 0,
	}

	// Check if demo data already exists by looking for the "Demo Bundle" source
	existingQuestions, err := a.db.GetQuestions()
	if err != nil {
		result.Success = false
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to check existing questions: %v", err))
		return result
	}

	// Check if demo data already exists
	for _, q := range existingQuestions {
		if q.Source == "Demo Bundle" {
			result.Errors = append(result.Errors, "Demo data already exists")
			return result
		}
	}

	// Create demo groups
	demoGroups := []struct {
		name        string
		description string
		color       string
		icon        string
	}{
		{"Mathematics", "Basic mathematics and algebra questions", "#1890ff", "calculator"},
		{"Science", "General science and physics questions", "#52c41a", "experiment"},
		{"Programming", "Computer programming and algorithms", "#722ed1", "code"},
		{"History", "World history and historical events", "#fa8c16", "book"},
		{"Geography", "World geography and locations", "#13c2c2", "global"},
	}

	groupIDs := make(map[string]string)
	log.Printf("Creating %d demo groups", len(demoGroups))
	for _, demoGroup := range demoGroups {
		log.Printf("Creating group: %s", demoGroup.name)
		group, err := a.CreateQuestionGroup(demoGroup.name, demoGroup.description, "", demoGroup.color, demoGroup.icon)
		if err != nil {
			log.Printf("ERROR: Failed to create group %s: %v", demoGroup.name, err)
			result.Errors = append(result.Errors, fmt.Sprintf("Failed to create group %s: %v", demoGroup.name, err))
			continue
		}
		groupIDs[demoGroup.name] = group.ID
		log.Printf("Created group %s with ID: %s", demoGroup.name, group.ID)
	}
	log.Printf("Group creation completed. Created %d groups", len(groupIDs))

	// Create demo questions
	demoQuestions := []struct {
		question    string
		options     []QuestionOption
		answer      []string
		explanation string
		tags        []string
		difficulty  int
		source      string
		groupName   string
	}{
		// Mathematics questions
		{
			question: "What is the value of x in the equation 2x + 5 = 15?",
			options: []QuestionOption{
				{ID: "a", Text: "x = 5"},
				{ID: "b", Text: "x = 10"},
				{ID: "c", Text: "x = 7.5"},
				{ID: "d", Text: "x = 2.5"},
			},
			answer:      []string{"a"},
			explanation: "Solving: 2x + 5 = 15 → 2x = 10 → x = 5",
			tags:        []string{"algebra", "equations", "basic"},
			difficulty:  2,
			source:      "Demo Bundle",
			groupName:   "Mathematics",
		},
		{
			question: "What is the area of a circle with radius 4 units?",
			options: []QuestionOption{
				{ID: "a", Text: "8π square units"},
				{ID: "b", Text: "16π square units"},
				{ID: "c", Text: "4π square units"},
				{ID: "d", Text: "12π square units"},
			},
			answer:      []string{"b"},
			explanation: "Area of circle = πr² = π(4)² = 16π square units",
			tags:        []string{"geometry", "circle", "area"},
			difficulty:  3,
			source:      "Demo Bundle",
			groupName:   "Mathematics",
		},
		// Science questions
		{
			question: "What is the chemical symbol for gold?",
			options: []QuestionOption{
				{ID: "a", Text: "Go"},
				{ID: "b", Text: "Gd"},
				{ID: "c", Text: "Au"},
				{ID: "d", Text: "Ag"},
			},
			answer:      []string{"c"},
			explanation: "Gold's chemical symbol is Au, from the Latin word 'aurum'",
			tags:        []string{"chemistry", "elements", "symbols"},
			difficulty:  2,
			source:      "Demo Bundle",
			groupName:   "Science",
		},
		{
			question: "What is Newton's first law of motion?",
			options: []QuestionOption{
				{ID: "a", Text: "Force equals mass times acceleration"},
				{ID: "b", Text: "An object at rest stays at rest unless acted upon by a force"},
				{ID: "c", Text: "For every action there is an equal and opposite reaction"},
				{ID: "d", Text: "Energy cannot be created or destroyed"},
			},
			answer:      []string{"b"},
			explanation: "Newton's first law states that an object at rest stays at rest and an object in motion stays in motion unless acted upon by an external force",
			tags:        []string{"physics", "motion", "newton"},
			difficulty:  3,
			source:      "Demo Bundle",
			groupName:   "Science",
		},
		// Programming questions
		{
			question: "Which of the following is NOT a primitive data type in most programming languages?",
			options: []QuestionOption{
				{ID: "a", Text: "int"},
				{ID: "b", Text: "string"},
				{ID: "c", Text: "array"},
				{ID: "d", Text: "boolean"},
			},
			answer:      []string{"c"},
			explanation: "Array is a composite/collection data type, not a primitive type. Primitive types are basic data types like int, string, boolean, float, etc.",
			tags:        []string{"programming", "data-types", "fundamentals"},
			difficulty:  2,
			source:      "Demo Bundle",
			groupName:   "Programming",
		},
		{
			question: "What is the time complexity of binary search?",
			options: []QuestionOption{
				{ID: "a", Text: "O(n)"},
				{ID: "b", Text: "O(log n)"},
				{ID: "c", Text: "O(n²)"},
				{ID: "d", Text: "O(1)"},
			},
			answer:      []string{"b"},
			explanation: "Binary search has O(log n) time complexity because it eliminates half of the remaining elements in each step",
			tags:        []string{"algorithms", "search", "complexity"},
			difficulty:  4,
			source:      "Demo Bundle",
			groupName:   "Programming",
		},
		// History questions
		{
			question: "In which year did World War II end?",
			options: []QuestionOption{
				{ID: "a", Text: "1944"},
				{ID: "b", Text: "1945"},
				{ID: "c", Text: "1946"},
				{ID: "d", Text: "1947"},
			},
			answer:      []string{"b"},
			explanation: "World War II ended in 1945 with the surrender of Japan in September",
			tags:        []string{"world-war", "20th-century", "dates"},
			difficulty:  2,
			source:      "Demo Bundle",
			groupName:   "History",
		},
		{
			question: "Who was the first President of the United States?",
			options: []QuestionOption{
				{ID: "a", Text: "Thomas Jefferson"},
				{ID: "b", Text: "John Adams"},
				{ID: "c", Text: "George Washington"},
				{ID: "d", Text: "Benjamin Franklin"},
			},
			answer:      []string{"c"},
			explanation: "George Washington served as the first President of the United States from 1789 to 1797",
			tags:        []string{"us-history", "presidents", "founding-fathers"},
			difficulty:  1,
			source:      "Demo Bundle",
			groupName:   "History",
		},
		// Geography questions
		{
			question: "What is the capital of Australia?",
			options: []QuestionOption{
				{ID: "a", Text: "Sydney"},
				{ID: "b", Text: "Melbourne"},
				{ID: "c", Text: "Canberra"},
				{ID: "d", Text: "Perth"},
			},
			answer:      []string{"c"},
			explanation: "Canberra is the capital city of Australia, not Sydney or Melbourne which are larger cities",
			tags:        []string{"capitals", "australia", "cities"},
			difficulty:  3,
			source:      "Demo Bundle",
			groupName:   "Geography",
		},
		{
			question: "Which river is the longest in the world?",
			options: []QuestionOption{
				{ID: "a", Text: "Amazon River"},
				{ID: "b", Text: "Nile River"},
				{ID: "c", Text: "Mississippi River"},
				{ID: "d", Text: "Yangtze River"},
			},
			answer:      []string{"b"},
			explanation: "The Nile River is generally considered the longest river in the world at approximately 6,650 km (4,130 miles)",
			tags:        []string{"rivers", "africa", "geography"},
			difficulty:  2,
			source:      "Demo Bundle",
			groupName:   "Geography",
		},
	}

	// Import demo questions
	log.Printf("Starting to import %d demo questions", len(demoQuestions))
	for i, demoQ := range demoQuestions {
		groupID := groupIDs[demoQ.groupName]
		if groupID == "" {
			log.Printf("ERROR: Group not found for %s", demoQ.groupName)
			result.Errors = append(result.Errors, fmt.Sprintf("Group not found: %s", demoQ.groupName))
			continue
		}

		log.Printf("Importing question %d for group %s (ID: %s)", i+1, demoQ.groupName, groupID)
		log.Printf("Question: %s", demoQ.question)

		// Convert to the format expected by ImportQuestions
		questionData := map[string]interface{}{
			"question":    demoQ.question,
			"options":     demoQ.options,
			"answer":      demoQ.answer,
			"explanation": demoQ.explanation,
			"tags":        demoQ.tags,
			"difficulty":  demoQ.difficulty,
			"source":      demoQ.source,
		}

		// Debug: Print the question data
		optionsJSON, _ := json.Marshal(demoQ.options)
		answerJSON, _ := json.Marshal(demoQ.answer)
		tagsJSON, _ := json.Marshal(demoQ.tags)
		log.Printf("Question data - Options: %s, Answer: %s, Tags: %s", string(optionsJSON), string(answerJSON), string(tagsJSON))

		// Import single question
		importResult := a.ImportQuestions([]map[string]interface{}{questionData}, groupID)
		log.Printf("Import result - Success: %v, Imported: %d, Errors: %v, Duplicates: %d", 
			importResult.Success, importResult.Imported, importResult.Errors, importResult.Duplicates)

		if importResult.Success && importResult.Imported > 0 {
			result.Imported += importResult.Imported
			log.Printf("Successfully imported question %d", i+1)
		} else if len(importResult.Errors) > 0 {
			log.Printf("Error importing question %d: %s", i+1, importResult.Errors[0])
			result.Errors = append(result.Errors, fmt.Sprintf("Question %d: %s", i+1, importResult.Errors[0]))
		} else if importResult.Duplicates > 0 {
			log.Printf("Question %d was a duplicate", i+1)
			result.Duplicates += importResult.Duplicates
		} else {
			log.Printf("Unknown result for question %d", i+1)
			result.Errors = append(result.Errors, fmt.Sprintf("Question %d: Unknown import result", i+1))
		}
	}

	log.Printf("Demo data import completed - Total imported: %d, Errors: %d, Duplicates: %d", 
		result.Imported, len(result.Errors), result.Duplicates)

	return result
}

// ClearDemoData removes all demo data for testing purposes
func (a *App) ClearDemoData() ImportResult {
	result := ImportResult{
		Success:    true,
		Imported:   0,
		Errors:     []string{},
		Duplicates: 0,
	}

	// Get all questions
	questions, err := a.db.GetQuestions()
	if err != nil {
		result.Success = false
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to get questions: %v", err))
		return result
	}

	// Delete demo questions
	for _, q := range questions {
		if q.Source == "Demo Bundle" {
			if err := a.db.DeleteQuestion(q.ID); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("Failed to delete question %s: %v", q.ID, err))
			} else {
				result.Imported++ // Using Imported to count deleted items
			}
		}
	}

	// Get all groups
	groups, err := a.db.GetQuestionGroups()
	if err != nil {
		result.Success = false
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to get groups: %v", err))
		return result
	}

	// Delete demo groups (the ones we created)
	demoGroupNames := []string{"Mathematics", "Science", "Programming", "History", "Geography"}
	for _, group := range groups {
		for _, demoName := range demoGroupNames {
			if group.Name == demoName {
				if err := a.db.DeleteQuestionGroup(group.ID); err != nil {
					result.Errors = append(result.Errors, fmt.Sprintf("Failed to delete group %s: %v", group.Name, err))
				}
				break
			}
		}
	}

	return result
}

// SaveFileToDownloads saves content to a file in the user's Downloads folder
func (a *App) SaveFileToDownloads(filename string, content string) (string, error) {
	// Get user's home directory
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get home directory: %v", err)
	}

	// Create Downloads path
	downloadsDir := filepath.Join(homeDir, "Downloads")
	
	// Ensure Downloads directory exists
	if err := os.MkdirAll(downloadsDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create downloads directory: %v", err)
	}

	// Create full file path
	filePath := filepath.Join(downloadsDir, filename)
	
	// Write file
	if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
		return "", fmt.Errorf("failed to write file: %v", err)
	}

	return filePath, nil
}

// User Settings methods

// GetUserSettings returns all user settings
func (a *App) GetUserSettings() (map[string]interface{}, error) {
	// Define default settings keys
	settingsKeys := []string{
		"username", "language", "theme", "fontSize", "defaultPracticeMode", 
		"dailyReminder", "defaultQuestionCount", "enableTimer", "timePerQuestion",
		"autoSave", "showExplanations", "randomizeQuestions", "randomizeOptions",
		"enableNotifications", "reminderTime", "studyGoal", "questionSpacing",
		"showProgress", "highlightCorrectAnswers", "saveHistory", "shareAnonymousStats",
	}

	settings := make(map[string]interface{})
	
	for _, key := range settingsKeys {
		value, err := a.db.GetSetting(key)
		if err != nil {
			// If setting doesn't exist, skip it (will use frontend defaults)
			continue
		}
		
		// Unmarshal the JSON value
		var settingValue interface{}
		if err := json.Unmarshal(value, &settingValue); err != nil {
			continue
		}
		
		settings[key] = settingValue
	}

	return settings, nil
}

// UpdateUserSettings updates user settings
func (a *App) UpdateUserSettings(settings map[string]interface{}) error {
	for key, value := range settings {
		if err := a.db.SetSetting(key, value); err != nil {
			return fmt.Errorf("failed to update setting %s: %v", key, err)
		}
	}
	return nil
}

// GetUserSetting gets a single user setting
func (a *App) GetUserSetting(key string) (interface{}, error) {
	value, err := a.db.GetSetting(key)
	if err != nil {
		return nil, err
	}
	
	var settingValue interface{}
	if err := json.Unmarshal(value, &settingValue); err != nil {
		return nil, err
	}
	
	return settingValue, nil
}

// SetUserSetting sets a single user setting
func (a *App) SetUserSetting(key string, value interface{}) error {
	return a.db.SetSetting(key, value)
}

// ResetAllData resets all user data including settings
func (a *App) ResetAllData() error {
	// Delete all questions
	questions, err := a.db.GetQuestions()
	if err != nil {
		return fmt.Errorf("failed to get questions: %v", err)
	}
	
	for _, q := range questions {
		if err := a.db.DeleteQuestion(q.ID); err != nil {
			return fmt.Errorf("failed to delete question %s: %v", q.ID, err)
		}
	}
	
	// Delete all groups
	groups, err := a.db.GetQuestionGroups()
	if err != nil {
		return fmt.Errorf("failed to get groups: %v", err)
	}
	
	for _, g := range groups {
		if err := a.db.DeleteQuestionGroup(g.ID); err != nil {
			return fmt.Errorf("failed to delete group %s: %v", g.ID, err)
		}
	}
	
	// Delete all practice sessions
	if _, err := a.db.db.Exec("DELETE FROM practice_sessions"); err != nil {
		return fmt.Errorf("failed to delete practice sessions: %v", err)
	}
	
	// Delete all settings
	if _, err := a.db.db.Exec("DELETE FROM user_settings"); err != nil {
		return fmt.Errorf("failed to delete user settings: %v", err)
	}
	
	return nil
}

// ExportUserData exports all user data
func (a *App) ExportUserData() (map[string]interface{}, error) {
	data := make(map[string]interface{})
	
	// Export questions
	questions, err := a.db.GetQuestions()
	if err != nil {
		return nil, fmt.Errorf("failed to get questions: %v", err)
	}
	data["questions"] = questions
	
	// Export groups
	groups, err := a.db.GetQuestionGroups()
	if err != nil {
		return nil, fmt.Errorf("failed to get groups: %v", err)
	}
	data["groups"] = groups
	
	// Export practice sessions
	sessions, err := a.db.GetPracticeSessions()
	if err != nil {
		return nil, fmt.Errorf("failed to get practice sessions: %v", err)
	}
	data["sessions"] = sessions
	
	// Export settings
	settings, err := a.GetUserSettings()
	if err != nil {
		return nil, fmt.Errorf("failed to get settings: %v", err)
	}
	data["settings"] = settings
	
	// Add metadata
	data["exportedAt"] = time.Now().Format(time.RFC3339)
	data["version"] = "1.0.0"
	
	return data, nil
}


// ExportSelectiveData exports data based on specified options
func (a *App) ExportSelectiveData(options ExportOptions) (map[string]interface{}, error) {
	data := make(map[string]interface{})
	
	// Export questions with filtering
	if options.IncludeQuestions {
		var questions []Question
		var err error
		
		if len(options.GroupIDs) > 0 {
			// Export questions from specific groups only
			allQuestions := make([]Question, 0)
			for _, groupID := range options.GroupIDs {
				groupQuestions, err := a.db.GetQuestionsByGroup(groupID)
				if err != nil {
					return nil, fmt.Errorf("failed to get questions for group %s: %v", groupID, err)
				}
				allQuestions = append(allQuestions, groupQuestions...)
			}
			questions = allQuestions
		} else {
			// Export all questions
			questions, err = a.db.GetQuestions()
			if err != nil {
				return nil, fmt.Errorf("failed to get questions: %v", err)
			}
		}
		
		// Apply date filtering if specified
		if options.DateRange != nil && options.DateRange.StartDate != "" && options.DateRange.EndDate != "" {
			startDate, err := time.Parse("2006-01-02", options.DateRange.StartDate)
			if err != nil {
				return nil, fmt.Errorf("invalid start date format: %v", err)
			}
			endDate, err := time.Parse("2006-01-02", options.DateRange.EndDate)
			if err != nil {
				return nil, fmt.Errorf("invalid end date format: %v", err)
			}
			endDate = endDate.Add(24 * time.Hour) // Include the end date
			
			var filteredQuestions []Question
			for _, q := range questions {
				questionDate, err := time.Parse(time.RFC3339, q.CreatedAt)
				if err == nil && questionDate.After(startDate) && questionDate.Before(endDate) {
					filteredQuestions = append(filteredQuestions, q)
				}
			}
			questions = filteredQuestions
		}
		
		data["questions"] = questions
	}
	
	// Export groups
	if options.IncludeGroups {
		if len(options.GroupIDs) > 0 {
			// Export specific groups only
			groups := make([]QuestionGroup, 0)
			allGroups, err := a.db.GetQuestionGroups()
			if err != nil {
				return nil, fmt.Errorf("failed to get groups: %v", err)
			}
			
			groupIDSet := make(map[string]bool)
			for _, id := range options.GroupIDs {
				groupIDSet[id] = true
			}
			
			for _, group := range allGroups {
				if groupIDSet[group.ID] {
					groups = append(groups, group)
				}
			}
			data["groups"] = groups
		} else {
			// Export all groups
			groups, err := a.db.GetQuestionGroups()
			if err != nil {
				return nil, fmt.Errorf("failed to get groups: %v", err)
			}
			data["groups"] = groups
		}
	}
	
	// Export practice sessions with filtering
	if options.IncludeSessions {
		sessions, err := a.db.GetPracticeSessions()
		if err != nil {
			return nil, fmt.Errorf("failed to get practice sessions: %v", err)
		}
		
		// Apply date filtering if specified
		if options.DateRange != nil && options.DateRange.StartDate != "" && options.DateRange.EndDate != "" {
			startDate, err := time.Parse("2006-01-02", options.DateRange.StartDate)
			if err != nil {
				return nil, fmt.Errorf("invalid start date format: %v", err)
			}
			endDate, err := time.Parse("2006-01-02", options.DateRange.EndDate)
			if err != nil {
				return nil, fmt.Errorf("invalid end date format: %v", err)
			}
			endDate = endDate.Add(24 * time.Hour) // Include the end date
			
			var filteredSessions []PracticeSession
			for _, s := range sessions {
				sessionDate, err := time.Parse(time.RFC3339, s.CreatedAt)
				if err == nil && sessionDate.After(startDate) && sessionDate.Before(endDate) {
					filteredSessions = append(filteredSessions, s)
				}
			}
			sessions = filteredSessions
		}
		
		data["sessions"] = sessions
	}
	
	// Export wrong questions
	if options.IncludeWrongQuestions {
		wrongQuestions, err := a.db.GetWrongQuestionsWithDetails()
		if err != nil {
			return nil, fmt.Errorf("failed to get wrong questions: %v", err)
		}
		data["wrongQuestions"] = wrongQuestions
	}
	
	// Export settings
	if options.IncludeSettings {
		settings, err := a.GetUserSettings()
		if err != nil {
			return nil, fmt.Errorf("failed to get settings: %v", err)
		}
		data["settings"] = settings
	}
	
	return data, nil
}

// ExportGroupAsCSV exports questions from a specific group in CSV format
func (a *App) ExportGroupAsCSV(groupID string) (string, error) {
	questions, err := a.db.GetQuestionsByGroup(groupID)
	if err != nil {
		return "", fmt.Errorf("failed to get questions for group: %v", err)
	}
	
	if len(questions) == 0 {
		return "", fmt.Errorf("no questions found in the specified group")
	}
	
	// Build CSV content
	var csvBuilder strings.Builder
	
	// Write header
	csvBuilder.WriteString("question,options,answer,explanation,tags,difficulty,source\n")
	
	// Write data rows
	for _, q := range questions {
		// Escape and format each field
		question := escapeCsvField(q.Question)
		options := escapeCsvField(string(q.Options))
		answer := escapeCsvField(string(q.Answer))
		explanation := escapeCsvField(q.Explanation)
		tags := escapeCsvField(string(q.Tags))
		difficulty := ""
		if q.Difficulty != nil {
			difficulty = fmt.Sprintf("%d", *q.Difficulty)
		}
		source := escapeCsvField(q.Source)
		
		csvBuilder.WriteString(fmt.Sprintf("%s,%s,%s,%s,%s,%s,%s\n",
			question, options, answer, explanation, tags, difficulty, source))
	}
	
	return csvBuilder.String(), nil
}

// escapeCsvField properly escapes a field for CSV format
func escapeCsvField(field string) string {
	// If field contains comma, newline, or quote, wrap in quotes and escape quotes
	if strings.Contains(field, ",") || strings.Contains(field, "\n") || strings.Contains(field, "\"") {
		// Escape existing quotes by doubling them
		escaped := strings.ReplaceAll(field, "\"", "\"\"")
		return fmt.Sprintf("\"%s\"", escaped)
	}
	return field
}

// ImportQuestionsFromCSV imports questions from CSV content
func (a *App) ImportQuestionsFromCSV(csvContent string, groupID string) ImportResult {
	result := ImportResult{
		Success:    true,
		Imported:   0,
		Errors:     []string{},
		Duplicates: 0,
	}

	// Split into lines and handle different line endings
	lines := strings.Split(strings.ReplaceAll(csvContent, "\r\n", "\n"), "\n")
	if len(lines) < 2 {
		result.Success = false
		result.Errors = append(result.Errors, "CSV file must have at least a header row and one data row")
		return result
	}

	// Parse header row
	headers := parseCSVLine(lines[0])
	if len(headers) == 0 {
		result.Success = false
		result.Errors = append(result.Errors, "Invalid CSV header row")
		return result
	}

	// Validate required columns
	requiredColumns := []string{"question", "options", "answer"}
	columnIndices := make(map[string]int)
	for i, header := range headers {
		columnIndices[strings.TrimSpace(strings.ToLower(header))] = i
	}

	for _, required := range requiredColumns {
		if _, exists := columnIndices[required]; !exists {
			result.Success = false
			result.Errors = append(result.Errors, fmt.Sprintf("Required column '%s' not found in CSV header", required))
			return result
		}
	}

	// Parse data rows
	var questions []map[string]interface{}
	for i, line := range lines[1:] {
		line = strings.TrimSpace(line)
		if line == "" {
			continue // Skip empty lines
		}

		values := parseCSVLine(line)
		if len(values) != len(headers) {
			result.Errors = append(result.Errors, fmt.Sprintf("Row %d: column count mismatch (expected %d, got %d)", i+2, len(headers), len(values)))
			continue
		}

		// Build question map
		questionData := make(map[string]interface{})
		for j, value := range values {
			if j < len(headers) {
				key := strings.TrimSpace(strings.ToLower(headers[j]))
				
				// Handle JSON fields
				if key == "options" || key == "answer" || key == "tags" {
					if strings.TrimSpace(value) != "" {
						var jsonValue interface{}
						if err := json.Unmarshal([]byte(value), &jsonValue); err != nil {
							result.Errors = append(result.Errors, fmt.Sprintf("Row %d: invalid JSON in column '%s': %v", i+2, key, err))
							continue
						}
						questionData[key] = jsonValue
					}
				} else if key == "difficulty" {
					if strings.TrimSpace(value) != "" {
						difficulty, err := strconv.Atoi(strings.TrimSpace(value))
						if err != nil || difficulty < 1 || difficulty > 5 {
							result.Errors = append(result.Errors, fmt.Sprintf("Row %d: invalid difficulty value '%s' (must be 1-5)", i+2, value))
							continue
						}
						questionData[key] = difficulty
					}
				} else {
					questionData[key] = strings.TrimSpace(value)
				}
			}
		}

		// Validate required fields are present
		validQuestion := true
		for _, required := range requiredColumns {
			if _, exists := questionData[required]; !exists || questionData[required] == "" {
				result.Errors = append(result.Errors, fmt.Sprintf("Row %d: missing required field '%s'", i+2, required))
				validQuestion = false
			}
		}

		if validQuestion {
			questions = append(questions, questionData)
		}
	}

	if len(questions) == 0 {
		result.Success = false
		result.Errors = append(result.Errors, "No valid questions found in CSV file")
		return result
	}

	// Import the questions using existing ImportQuestions method
	importResult := a.ImportQuestions(questions, groupID)
	result.Success = importResult.Success
	result.Imported = importResult.Imported
	result.Duplicates = importResult.Duplicates
	result.Errors = append(result.Errors, importResult.Errors...)

	return result
}

// parseCSVLine parses a single CSV line handling quotes and commas
func parseCSVLine(line string) []string {
	var fields []string
	var current strings.Builder
	inQuotes := false
	
	for i, char := range line {
		switch char {
		case '"':
			if inQuotes && i+1 < len(line) && line[i+1] == '"' {
				// Double quote - escaped quote character
				current.WriteByte('"')
				i++ // Skip next quote
			} else {
				// Toggle quote state
				inQuotes = !inQuotes
			}
		case ',':
			if inQuotes {
				current.WriteRune(char)
			} else {
				// End of field
				fields = append(fields, current.String())
				current.Reset()
			}
		default:
			current.WriteRune(char)
		}
	}
	
	// Add the last field
	fields = append(fields, current.String())
	
	return fields
}

// ImportUserData imports all user data from exported JSON
func (a *App) ImportUserData(data map[string]interface{}) ImportResult {
	result := ImportResult{
		Success:    true,
		Imported:   0,
		Errors:     []string{},
		Duplicates: 0,
	}

	// Validate data structure
	if data["version"] == nil {
		result.Success = false
		result.Errors = append(result.Errors, "Invalid data format: missing version")
		return result
	}

	// Import questions if present
	if questionsData, ok := data["questions"].([]interface{}); ok {
		log.Printf("Importing %d questions", len(questionsData))
		for _, q := range questionsData {
			if questionMap, ok := q.(map[string]interface{}); ok {
				question := Question{
					ID:          questionMap["id"].(string),
					Question:    questionMap["question"].(string),
					Explanation: questionMap["explanation"].(string),
					Source:      questionMap["source"].(string),
					CreatedAt:   questionMap["createdAt"].(string),
					UpdatedAt:   questionMap["updatedAt"].(string),
				}

				// Handle JSON fields
				if options, err := json.Marshal(questionMap["options"]); err == nil {
					question.Options = options
				}
				if answer, err := json.Marshal(questionMap["answer"]); err == nil {
					question.Answer = answer
				}
				if tags, err := json.Marshal(questionMap["tags"]); err == nil {
					question.Tags = tags
				}
				if difficulty, ok := questionMap["difficulty"].(float64); ok {
					diffInt := int(difficulty)
					question.Difficulty = &diffInt
				}
				if imageURL, ok := questionMap["imageUrl"].(string); ok {
					question.ImageURL = imageURL
				}
				if index, ok := questionMap["index"].(float64); ok {
					indexInt := int(index)
					question.Index = &indexInt
				}

				// Create question
				if err := a.db.CreateQuestion(&question); err != nil {
					result.Errors = append(result.Errors, fmt.Sprintf("Failed to import question %s: %v", question.ID, err))
				} else {
					result.Imported++
				}
			}
		}
	}

	// Import groups if present
	if groupsData, ok := data["groups"].([]interface{}); ok {
		log.Printf("Importing %d groups", len(groupsData))
		for _, g := range groupsData {
			if groupMap, ok := g.(map[string]interface{}); ok {
				group := QuestionGroup{
					ID:          groupMap["id"].(string),
					Name:        groupMap["name"].(string),
					Description: groupMap["description"].(string),
					Color:       groupMap["color"].(string),
					Icon:        groupMap["icon"].(string),
					CreatedAt:   groupMap["createdAt"].(string),
					UpdatedAt:   groupMap["updatedAt"].(string),
				}

				if parentID, ok := groupMap["parentId"].(string); ok && parentID != "" {
					group.ParentID = &parentID
				}

				// Create group
				if err := a.db.CreateQuestionGroup(&group); err != nil {
					result.Errors = append(result.Errors, fmt.Sprintf("Failed to import group %s: %v", group.ID, err))
				} else {
					result.Imported++

					// Import question-group relations
					if questionIds, ok := groupMap["questionIds"].([]interface{}); ok {
						for _, qid := range questionIds {
							if questionID, ok := qid.(string); ok {
								a.db.AddQuestionToGroup(group.ID, questionID)
							}
						}
					}
				}
			}
		}
	}

	// Import settings if present
	if settingsData, ok := data["settings"].(map[string]interface{}); ok {
		log.Printf("Importing %d settings", len(settingsData))
		for key, value := range settingsData {
			if err := a.db.SetSetting(key, value); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("Failed to import setting %s: %v", key, err))
			} else {
				result.Imported++
			}
		}
	}

	return result
}

// GetWeakestTopics analyzes user performance to identify weak topics
func (a *App) GetWeakestTopics() ([]map[string]interface{}, error) {
	// Get all practice sessions
	sessions, err := a.db.GetPracticeSessions()
	if err != nil {
		return nil, fmt.Errorf("failed to get practice sessions: %v", err)
	}

	// Topic performance tracking
	topicStats := make(map[string]struct {
		total    int
		correct  int
		category string
	})

	// Analyze sessions
	for _, session := range sessions {
		if session.Details == nil {
			continue
		}

		var questions []map[string]interface{}
		if err := json.Unmarshal(session.Details, &questions); err != nil {
			continue
		}

		for _, q := range questions {
			questionID, ok := q["questionId"].(string)
			if !ok {
				continue
			}

			isCorrect, ok := q["isCorrect"].(bool)
			if !ok {
				continue
			}

			// Get question details to extract tags
			question, err := a.db.GetQuestionByID(questionID)
			if err != nil {
				continue
			}

			// Parse tags
			var tags []string
			if question.Tags != nil {
				json.Unmarshal(question.Tags, &tags)
			}

			// If no tags, use source as topic
			if len(tags) == 0 {
				if question.Source != "" {
					tags = []string{question.Source}
				} else {
					tags = []string{"General"}
				}
			}

			// Update stats for each tag/topic
			for _, tag := range tags {
				if stats, exists := topicStats[tag]; exists {
					stats.total++
					if isCorrect {
						stats.correct++
					}
					topicStats[tag] = stats
				} else {
					correct := 0
					if isCorrect {
						correct = 1
					}
					topicStats[tag] = struct {
						total    int
						correct  int
						category string
					}{
						total:    1,
						correct:  correct,
						category: "topic",
					}
				}
			}
		}
	}

	// Convert to result format and calculate accuracy
	var weakestTopics []map[string]interface{}
	for topic, stats := range topicStats {
		if stats.total < 2 { // Skip topics with less than 2 questions
			continue
		}

		accuracy := float64(stats.correct) / float64(stats.total) * 100
		
		result := map[string]interface{}{
			"topic":        topic,
			"totalAttempts": stats.total,
			"correctCount":  stats.correct,
			"accuracy":     accuracy,
			"category":     stats.category,
		}
		
		weakestTopics = append(weakestTopics, result)
	}

	// Sort by accuracy (ascending) to get weakest topics first
	for i := 0; i < len(weakestTopics)-1; i++ {
		for j := i + 1; j < len(weakestTopics); j++ {
			if weakestTopics[i]["accuracy"].(float64) > weakestTopics[j]["accuracy"].(float64) {
				weakestTopics[i], weakestTopics[j] = weakestTopics[j], weakestTopics[i]
			}
		}
	}

	// Return top 10 weakest topics
	if len(weakestTopics) > 10 {
		weakestTopics = weakestTopics[:10]
	}

	return weakestTopics, nil
}

// Wrong Questions management methods

// AddWrongQuestion adds a question to the wrong questions list
func (a *App) AddWrongQuestion(questionID string, notes string) error {
	wrongQuestion := &WrongQuestion{
		ID:         fmt.Sprintf("wrong_%d_%d", time.Now().UnixNano(), rand.Int63()),
		QuestionID: questionID,
		AddedAt:    time.Now().Format(time.RFC3339),
		Notes:      notes,
	}

	return a.db.AddWrongQuestion(wrongQuestion)
}

// AddWrongQuestionsFromSession automatically adds wrong questions from a practice session
func (a *App) AddWrongQuestionsFromSession(sessionData map[string]interface{}) error {
	if questions, ok := sessionData["questions"]; ok {
		questionList := questions.([]interface{})
		for _, q := range questionList {
			qMap := q.(map[string]interface{})
			if isCorrect, ok := qMap["isCorrect"].(bool); ok && !isCorrect {
				if questionID, ok := qMap["questionId"].(string); ok {
					// Check if already exists
					exists, err := a.db.IsQuestionMarkedWrong(questionID)
					if err != nil {
						continue
					}
					if !exists {
						// Add to wrong questions
						wrongQuestion := &WrongQuestion{
							ID:         fmt.Sprintf("wrong_%d_%d", time.Now().UnixNano(), rand.Int63()),
							QuestionID: questionID,
							AddedAt:    time.Now().Format(time.RFC3339),
							Notes:      "Added from practice session",
						}
						a.db.AddWrongQuestion(wrongQuestion)
					}
				}
			}
		}
	}
	return nil
}

// GetWrongQuestions returns all wrong questions
func (a *App) GetWrongQuestions() ([]WrongQuestion, error) {
	return a.db.GetWrongQuestions()
}

// GetWrongQuestionsWithDetails returns wrong questions with full question details
func (a *App) GetWrongQuestionsWithDetails() ([]map[string]interface{}, error) {
	return a.db.GetWrongQuestionsWithDetails()
}

// GetWrongQuestionsForPractice returns questions formatted for practice interface
func (a *App) GetWrongQuestionsForPractice() ([]Question, error) {
	wrongQuestionsWithDetails, err := a.db.GetWrongQuestionsWithDetails()
	if err != nil {
		return nil, err
	}

	var questions []Question
	for _, item := range wrongQuestionsWithDetails {
		if q, ok := item["question"].(Question); ok {
			questions = append(questions, q)
		}
	}

	return questions, nil
}

// UpdateWrongQuestionReview updates a wrong question after review
func (a *App) UpdateWrongQuestionReview(questionID string, isCorrect bool, notes string) error {
	return a.db.UpdateWrongQuestionReview(questionID, isCorrect, notes)
}

// RemoveWrongQuestion removes a question from the wrong questions list
func (a *App) RemoveWrongQuestion(questionID string) error {
	return a.db.RemoveWrongQuestion(questionID)
}

// IsQuestionMarkedWrong checks if a question is marked as wrong
func (a *App) IsQuestionMarkedWrong(questionID string) (bool, error) {
	return a.db.IsQuestionMarkedWrong(questionID)
}

// ToggleWrongQuestion toggles a question's wrong status
func (a *App) ToggleWrongQuestion(questionID string, notes string) (bool, error) {
	isMarked, err := a.db.IsQuestionMarkedWrong(questionID)
	if err != nil {
		return false, err
	}

	if isMarked {
		err = a.db.RemoveWrongQuestion(questionID)
		return false, err
	} else {
		wrongQuestion := &WrongQuestion{
			ID:         fmt.Sprintf("wrong_%d_%d", time.Now().UnixNano(), rand.Int63()),
			QuestionID: questionID,
			AddedAt:    time.Now().Format(time.RFC3339),
			Notes:      notes,
		}
		err = a.db.AddWrongQuestion(wrongQuestion)
		return true, err
	}
}

// UpdateQuestionGroup updates an existing question group
func (a *App) UpdateQuestionGroup(group QuestionGroup) error {
	// Set updated timestamp
	group.UpdatedAt = time.Now().Format(time.RFC3339)
	
	// Update in database
	if err := a.db.UpdateQuestionGroup(&group); err != nil {
		return fmt.Errorf("failed to update question group: %v", err)
	}
	
	return nil
}
// DeleteQuestionGroup deletes a question group by ID
func (a *App) DeleteQuestionGroup(groupID string) error {
	if err := a.db.DeleteQuestionGroup(groupID); err != nil {
		return fmt.Errorf("failed to delete question group: %v", err)
	}
	return nil
}
