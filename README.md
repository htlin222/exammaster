# ExamMaster

ExamMaster is a desktop application designed to help users prepare for exams. It allows importing questions, practicing under exam-like conditions, and reviewing performance.

## Features

*   **Question Management:** Easily import and manage your own sets of questions.
*   **Practice Mode:** Simulate an exam environment to test your knowledge.
*   **Performance Analytics:** Track your progress and identify areas for improvement.
*   **Review Mistakes:** A dedicated section to review questions you answered incorrectly.
*   **Cross-Platform:** Built with Wails, it runs on Windows, macOS, and Linux.

## Tech Stack

*   **Backend:** Go
*   **Frontend:** React, TypeScript, Vite
*   **Framework:** Wails v2

## Development

To run the application in live development mode with hot-reloading:

```bash
wails dev
```

This will start the application and automatically reload it when you make changes to the Go or TypeScript code.

## Building

To build a production-ready, redistributable package for your platform:

```bash
wails build
```

The final application will be located in the `build/bin` directory.