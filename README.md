# 🚀 AI Git Automation

[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Powered by Groq](https://img.shields.io/badge/Powered%20by-Groq%20Cloud-f55036?logo=fastapi&logoColor=white)](https://groq.com/)
[![Git](https://img.shields.io/badge/Git-Automation-F05032?logo=git&logoColor=white)](https://git-scm.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

> **Turn tedious manual commits into a single keypress.**  
> An intelligent, safety-first Git commit assistant that inspects your file diffs, auto-selects the fastest available LLM via Groq, crafts precise per-file conventional commit messages, prompts for confirmation, and pushes to remote.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [How It Works](#-how-it-works)
- [Key Features](#-key-features)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Usage Guide](#-usage-guide)
  - [1. Running via Command Line](#1-running-via-command-line)
  - [2. Terminal Alias Setup (PowerShell / Bash)](#2-terminal-alias-setup-powershell--bash)
- [VS Code Integration & Shortcut Keys](#-vs-code-integration--shortcut-keys)
  - [Method A: Global Shortcut (Recommended — Works in ANY Project)](#method-a-global-shortcut-recommended--works-in-any-project)
  - [Method B: Workspace Task (Single Repository)](#method-b-workspace-task-single-repository)
- [Configuration Reference](#-configuration-reference)
- [Safety & Guardrails](#-safety--guardrails)
- [Example Terminal Walkthrough](#-example-terminal-walkthrough)
- [Troubleshooting & FAQ](#-troubleshooting--faq)
- [License](#-license)

---

## 🌟 Overview

Writing clean, descriptive commit messages for multiple changed files is essential for maintainable projects, but doing it manually across dozens of files is time-consuming.

**AI Git Automation** inspects your changes file-by-file, extracts meaningful diffs, queries state-of-the-art open-source LLMs through the ultra-fast **Groq Cloud API**, and drafts concise imperative commit messages. With human-in-the-loop review, you stay in full control before anything is staged or pushed.

---

## 🔄 How It Works

```
 ┌─────────────────┐     ┌───────────────────────┐     ┌────────────────────────┐
 │   Source Code   │ ──> │   Diff Extraction &   │ ──> │   Model Auto-Discovery │
 │  Modifications  │     │   Safety Filtering    │     │      (Groq Cloud)      │
 └─────────────────┘     └───────────────────────┘     └────────────────────────┘
                                                                    │
 ┌─────────────────┐     ┌───────────────────────┐                  ▼
 │  Git Push to    │ <── │   User Confirmation   │ <── ┌────────────────────────┐
 │  Remote Origin  │     │        [Y / N]        │     │  Per-File AI Messages  │
 └─────────────────┘     └───────────────────────┘     │    (Imperative Mood)   │
                                                       └────────────────────────┘
```

1. **Safety Inspection:** Verifies no secrets or sensitive files (`.env`, `*.pem`, `*.key`) are being exposed, and checks for unstaged file conflicts.
2. **Context Summarization:** Gathers granular diffs for each modified or newly created file.
3. **Model Selection:** Automatically queries Groq for the best active high-performance model (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, `llama-3.3-70b-versatile`, etc.).
4. **Message Generation:** Generates individual, conventional commit messages per file (max 72 characters, imperative mood).
5. **Interactive Review:** Displays the proposed commit messages in the console and waits for your confirmation (`Y` to proceed, any other key to abort).
6. **Execution:** Stages each file individually, creates atomic commits, and pushes to your remote Git repository.

---

## ✨ Key Features

- **🎯 Atomic, Per-File Commits:** Instead of one vague generic commit (`"update files"`), each file receives its own tailored, descriptive commit message.
- **⚡ Blazing Fast Generation:** Powered by Groq LPU inference for sub-second responses.
- **🛡️ Built-in Secret Protection:** Automatically halts execution if `.env`, private keys (`.pem`, `.key`), or sensitive config files are detected.
- **🧭 Smart Repository Discovery:** Automatically climbs parent directories to find the nearest `.git` directory or processes repositories inside subdirectories.
- **✋ Interactive Confirmation:** Nothing touches your Git history until you review and confirm with `Y`.
- **⌨️ Seamless VS Code Shortcut:** Trigger the entire commit and push workflow from inside VS Code with a single hotkey (e.g. `Ctrl + Alt + C`).

---

## 📋 Prerequisites

Before using this tool, make sure you have:

- [Node.js](https://nodejs.org/) **v18.0.0 or higher** (includes native `fetch`).
- [Git](https://git-scm.com/) installed and available in your system `PATH`.
- A free **Groq API Key**:
  1. Sign up at [Groq Console](https://console.groq.com/).
  2. Navigate to **API Keys** and click **Create API Key**.
  3. Copy your key (starts with `gsk_...`).

---

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/AI-Git-Automation.git
cd AI-Git-Automation
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Your API Key

Create a `.env` file in the root directory (you can copy `.env.example`):

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Mac / Linux
cp .env.example .env
```

Open `.env` and add your Groq API key:

```env
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
```

*(Note: `OPENAI_API_KEY` is also supported if you prefer using an OpenAI-compatible endpoint).*

---

## 💻 Usage Guide

### 1. Running via Command Line

Pass the target repository directory as an argument:

```bash
# Commit changes in the current directory
node ai-commit.cjs .

# Or commit changes in a specific project folder
node ai-commit.cjs "C:/path/to/your/project"
```

If you are running from inside the `AI-Git-Automation` project directory:

```bash
npm start
```

---

### 2. Terminal Alias Setup (PowerShell / Bash)

To run this tool from **any** terminal window without typing the full path to `ai-commit.cjs`:

#### Windows (PowerShell)

1. Open your PowerShell profile:
   ```powershell
   notepad $PROFILE
   ```
2. Add a function alias (replace `D:\AI-Git-Automation` with your actual installation path):
   ```powershell
   function ai-commit {
       node "D:\AI-Git-Automation\ai-commit.cjs" $PWD
   }
   ```
3. Save and restart PowerShell. Now simply type:
   ```powershell
   ai-commit
   ```

#### macOS / Linux (Bash or Zsh)

1. Open `~/.bashrc` or `~/.zshrc`:
   ```bash
   nano ~/.zshrc
   ```
2. Add an alias (replace with your installation path):
   ```bash
   alias ai-commit='node /path/to/AI-Git-Automation/ai-commit.cjs "$PWD"'
   ```
3. Reload your shell: `source ~/.zshrc` and run:
   ```bash
   ai-commit
   ```

---

## ⌨️ VS Code Integration & Shortcut Keys

You can bind this automation to a single keyboard shortcut (e.g., `Ctrl + Alt + C` on Windows/Linux or `Cmd + Option + C` on macOS) to review, commit, and push directly inside VS Code!

### Method A: Global Shortcut (Recommended — Works in ANY Project)

Setting this up as a **User Task** allows you to use the shortcut in **any** project you open in VS Code.

#### Step 1: Open Global User Tasks
1. In VS Code, press `Ctrl + Shift + P` (or `Cmd + Shift + P` on Mac) to open the Command Palette.
2. Type: `Tasks: Open User Tasks` and press **Enter**.
3. Select `Create tasks.json file from template` -> `Others` (or open the existing file).

#### Step 2: Add the AI Commit Task
Paste the following task configuration into your `tasks.json` (make sure to replace `D:/AI-Git-Automation/ai-commit.cjs` with the exact path where you cloned this repository):

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "AI Git Commit",
      "type": "shell",
      "command": "node",
      "args": [
        "D:/AI-Git-Automation/ai-commit.cjs",
        "${workspaceFolder}"
      ],
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": true,
        "panel": "dedicated",
        "clear": true
      },
      "problemMatcher": []
    }
  ]
}
```

> **Note for Windows paths:** Use forward slashes (`/`) or escaped backslashes (`\\\\`) in the file path (e.g., `D:/AI-Git-Automation/ai-commit.cjs`).

#### Step 3: Bind the Shortcut Key
1. Open the Command Palette (`Ctrl + Shift + P` or `Cmd + Shift + P`).
2. Type and select: `Preferences: Open Keyboard Shortcuts (JSON)`.
3. Add the keybinding to the array:

**On Windows / Linux:**
```json
[
  {
    "key": "ctrl+alt+c",
    "command": "workbench.action.tasks.runTask",
    "args": "AI Git Commit"
  }
]
```

**On macOS:**
```json
[
  {
    "key": "cmd+alt+c",
    "command": "workbench.action.tasks.runTask",
    "args": "AI Git Commit"
  }
]
```

#### Step 4: Test Your Hotkey!
1. Open any project workspace with Git changes in VS Code.
2. Press `Ctrl + Alt + C` (or `Cmd + Alt + C`).
3. An integrated terminal pops up, scans your changes, proposes commit messages, and asks:  
   `[your-repo] Continue? [Y/N]: `
4. Press `y` to commit and push, or any other key to cancel!

---

### Method B: Workspace Task (Single Repository)

If you only want this shortcut for this specific repository:

1. A `.vscode/tasks.json` file is already included in this project.
2. To run it, press `Ctrl + Shift + P` -> `Tasks: Run Task` -> `AI Git Commit`.
3. You can still bind a hotkey using Step 3 above.

---

## ⚙️ Configuration Reference

| Variable | Description | Default / Fallback |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | Your secret API key from Groq Cloud. | Reads `OPENAI_API_KEY` if missing. |
| `OPENAI_API_KEY` | Alternative key if using an OpenAI-compatible proxy. | `undefined` |
| `AI_COMMIT_ENV` | Custom path to the `.env` file if stored outside the script folder. | `<project_root>/.env` |

### Model Priority Order

The tool automatically tests for and prioritizes the best active model available on Groq:
1. `openai/gpt-oss-120b`
2. `qwen/qwen3.8-27b`
3. `openai/gpt-oss-20b`
4. `llama-3.3-70b-versatile`
5. `llama-3.1-8b-instant`

---

## 🛡️ Safety & Guardrails

To prevent accidental data loss or leaked credentials, the tool enforces strict safety checks:

- **🚨 Sensitive File Shield:**  
  If any changed file matches secret patterns (`.env`, `.env.*`, `*.pem`, `*.key`), the script aborts immediately with an error and will NOT proceed.
- **🚫 Pre-Staged File Blocker:**  
  If files are already staged in Git before running, the script stops to avoid mixing staged states. It asks you to unstage files first (`git restore --staged <file>`).
- **🙈 Gitignore Protection:**  
  Changes to `.gitignore` itself are automatically filtered out from being pushed blindly.
- **✋ Human Confirmation Gate:**  
  No `git commit` or `git push` command is executed until you explicitly review the proposed messages and press `Y`.

---

## 🖥️ Example Terminal Walkthrough

```text
====================================
      AI GIT COMMIT ASSISTANT
====================================

📍 Current directory: D:\Projects\MyWebApp

🔎 Found 1 Git repo(s):
   • MyWebApp (D:\Projects\MyWebApp)

🎯 Selected model: llama-3.3-70b-versatile

====================================
  📦 REPO: MyWebApp
  📍 Path: D:\Projects\MyWebApp
====================================

🔍 Changed files:

1. [ M] src/auth/login.ts
2. [??] src/components/Navbar.tsx

📚 Preparing changes for 2 file(s)...

🤖 Generating 2 commit messages...

📄 src/auth/login.ts
   → Add token expiration validation to login handler

📄 src/components/Navbar.tsx
   → Create responsive navigation bar component

Type Y to commit and push.
Any other key will skip.

[MyWebApp] Continue? [Y/N]: y

💾 Creating commits for MyWebApp...

📦 Staging: src/auth/login.ts
💾 Committing: Add token expiration validation to login handler
   ✅ Done

📦 Staging: src/components/Navbar.tsx
💾 Committing: Create responsive navigation bar component
   ✅ Done

🚀 Pushing MyWebApp...
✅ MyWebApp pushed successfully.

====================================
       ALL DONE! ✅
====================================
```

---

## ❓ Troubleshooting & FAQ

### 1. `❌ API key was not found.`
- **Cause:** No `.env` file was found or `GROQ_API_KEY` is not set.
- **Solution:** Verify that `.env` exists in your `AI-Git-Automation` folder and contains `GROQ_API_KEY=gsk_...`. If you moved the script, you can specify the path using the environment variable `AI_COMMIT_ENV="C:/path/to/.env"`.

### 2. `❌ SAFETY BLOCK: Sensitive files detected.`
- **Cause:** You modified a file such as `.env`, `.env.production`, or an SSL certificate (`.pem`, `.key`).
- **Solution:** Add those files to `.gitignore` so they are not tracked by Git, or remove them from the staging area.

### 3. `❌ SAFETY BLOCK: Some files are already staged.`
- **Cause:** You previously ran `git add` manually on some files.
- **Solution:** Unstage your files before running this tool:
  ```bash
  git restore --staged .
  ```

### 4. `❌ No Git repository found.`
- **Cause:** The target directory is not a Git repository, and none of its parent directories contain a `.git` folder.
- **Solution:** Make sure you are inside an initialized Git project (`git init`).

### 5. `❌ Push failed`
- **Cause:** The remote branch might have incoming commits or you may not be authenticated with your Git remote (GitHub/GitLab).
- **Solution:** Run `git pull --rebase` to integrate remote changes, check your Git credentials, and try again.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).

