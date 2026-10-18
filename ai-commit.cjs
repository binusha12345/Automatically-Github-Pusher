const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const dotenv = require("dotenv");

// ============================================================
// CONFIGURATION
// ============================================================

const ENV_FILE = path.join("D:", "AI-Git-Automation", ".env");

dotenv.config({ path: ENV_FILE });

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

if (!GROQ_API_KEY) {
    console.error("\n❌ API key was not found.");
    console.error(`Expected .env file: ${ENV_FILE}\n`);
    process.exit(1);
}

// ============================================================
// AUTO-DETECT BEST MODEL
// ============================================================

async function getBestActiveGroqModel() {
    try {
        const res = await fetch("https://api.groq.com/openai/v1/models", {
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}` }
        });
        if (!res.ok) throw new Error("Failed to list models");

        const data = await res.json();
        const availableModels = (data.data || []).map(m => m.id);

        const preferences = [
            "openai/gpt-oss-120b",
            "qwen/qwen3.8-27b",
            "openai/gpt-oss-20b",
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant"
        ];

        for (const pref of preferences) {
            if (availableModels.includes(pref)) {
                console.log(`🎯 Selected model: ${pref}\n`);
                return pref;
            }
        }

        if (availableModels.length > 0) {
            console.log(`🎯 Selected model: ${availableModels[0]}\n`);
            return availableModels[0];
        }
    } catch (e) {
        console.warn(`⚠️ Model discovery warning: ${e.message}`);
    }
    return "openai/gpt-oss-120b";
}

// ============================================================
// GIT HELPERS
// ============================================================

function runGit(cwd, args) {
    try {
        return execFileSync("git", args, {
            cwd, encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"]
        }).replace(/\r?\n$/, "");
    } catch (error) {
        const stderr = error.stderr ? error.stderr.toString().trim() : "";
        throw new Error(`git ${args.join(" ")} failed: ${stderr}`);
    }
}

function normalizeGitPath(filePath) {
    return filePath.replace(/\\/g, "/");
}

function isSecretFile(file) {
    const name = path.basename(normalizeGitPath(file));
    return (
        name === ".env" ||
        name.startsWith(".env.") ||
        name.endsWith(".pem") ||
        name.endsWith(".key")
    );
}

function parseGitStatus(status) {
    return status.split(/\r?\n/).filter(Boolean).map(line => ({
        status: line[0] + line[1],
        file: line.slice(3)
    }));
}

function summarizeDiff(rawDiff) {
    if (!rawDiff || rawDiff.trim() === "") return "[File modified/created]";
    const changeLines = rawDiff
        .split(/\r?\n/)
        .filter(line =>
            (line.startsWith("+") || line.startsWith("-")) &&
            !line.startsWith("+++") && !line.startsWith("---")
        )
        .slice(0, 15)
        .join("\n");
    return changeLines.slice(0, 350);
}

// ============================================================
// FIND GIT REPO (Walks UP from your current directory)
// ============================================================

function findGitRepos(startDir) {
    // Walk UP the directory tree to find the nearest .git folder
    let current = path.resolve(startDir);
    const root = path.parse(current).root;

    while (current !== root) {
        if (fs.existsSync(path.join(current, ".git"))) {
            return [current];
        }
        current = path.dirname(current);
    }

    // If no .git found walking up, scan subdirectories
    const repos = [];
    try {
        const entries = fs.readdirSync(startDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith(".")) {
                const subDir = path.join(startDir, entry.name);
                if (fs.existsSync(path.join(subDir, ".git"))) {
                    repos.push(subDir);
                }
            }
        }
    } catch {}

    return repos;
}

// ============================================================
// AI COMMIT MESSAGE GENERATION
// ============================================================

async function generateCommitMessages(commitData, activeModel) {
    const filesInput = commitData
        .map((item, index) => {
            const clean = summarizeDiff(item.diff);
            return `FILE ${index + 1}: ${item.file}\nCHANGES:\n${clean}`;
        })
        .join("\n\n---\n\n");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: activeModel,
            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert Git commit generator.\n" +
                        "Generate one concise commit message per file.\n" +
                        "Respond ONLY with a valid JSON array without markdown or backticks.\n" +
                        'Format: [{"file":"exact file path","message":"commit message"}]\n' +
                        "Use imperative mood. No quotes or periods in messages. Max 72 chars."
                },
                { role: "user", content: filesInput }
            ],
            temperature: 0.1
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    let raw = data.choices[0].message.content.trim();

    if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\r?\n?/, "").replace(/\r?\n?```$/, "").trim();
    }

    const messages = JSON.parse(raw);
    if (!Array.isArray(messages)) throw new Error("AI response was not an array.");
    return messages;
}

// ============================================================
// PROCESS ONE REPO
// ============================================================

async function processRepo(repoPath, activeModel) {
    const repoName = path.basename(repoPath);

    console.log("====================================");
    console.log(`  📦 REPO: ${repoName}`);
    console.log(`  📍 Path: ${repoPath}`);
    console.log("====================================\n");

    const statusOutput = runGit(repoPath, ["status", "--porcelain"]);
    if (!statusOutput) {
        console.log("✅ No changes detected.\n");
        return;
    }

    let changes = parseGitStatus(statusOutput);
    changes = changes.filter(c => {
        const f = normalizeGitPath(c.file);
        return f !== ".gitignore" && !f.endsWith("/.gitignore");
    });

    if (changes.length === 0) {
        console.log("✅ No files to commit.\n");
        return;
    }

    const cachedOutput = runGit(repoPath, ["diff", "--cached", "--name-only"]);
    const stagedFiles = cachedOutput.split(/\r?\n/).filter(Boolean).map(normalizeGitPath);
    if (stagedFiles.length > 0) {
        console.log("❌ SAFETY BLOCK: Some files are already staged. Unstage first.");
        stagedFiles.forEach(f => console.log(`  ${f}`));
        console.log("");
        return;
    }

    const secretFiles = changes.filter(c => isSecretFile(c.file));
    if (secretFiles.length > 0) {
        console.error("❌ SAFETY BLOCK: Sensitive files detected.");
        secretFiles.forEach(c => console.error(`  ${c.file}`));
        console.log("");
        return;
    }

    console.log("🔍 Changed files:\n");
    changes.forEach((change, i) => {
        console.log(`${i + 1}. [${change.status}] ${change.file}`);
    });
    console.log("");

    console.log(`📚 Preparing changes for ${changes.length} file(s)...\n`);

    const commitData = [];
    for (const change of changes) {
        const gitFile = normalizeGitPath(change.file);
        let diff = "";

        try {
            diff = runGit(repoPath, ["diff", "HEAD", "--", gitFile]);
        } catch { diff = ""; }

        if (change.status === "??" && !diff) {
            const fullPath = path.resolve(repoPath, change.file);
            if (fs.existsSync(fullPath)) {
                try { diff = fs.readFileSync(fullPath, "utf8"); }
                catch { diff = "[Unable to read file]"; }
            }
        }

        commitData.push({ file: change.file, gitFile, diff });
    }

    console.log(`🤖 Generating ${commitData.length} commit messages...\n`);

    const generatedMessages = await generateCommitMessages(commitData, activeModel);

    for (const item of commitData) {
        const generated = generatedMessages.find(
            m => normalizeGitPath(m.file) === item.gitFile
        );
        if (!generated || !generated.message) {
            throw new Error(`AI did not return a message for ${item.file}`);
        }
        item.message = generated.message.trim();
        console.log(`📄 ${item.file}`);
        console.log(`   → ${item.message}\n`);
    }

    console.log("Type Y to commit and push.");
    console.log("Any other key will skip.\n");

    process.stdout.write(`[${repoName}] Continue? [Y/N]: `);

    const answer = await new Promise(resolve => {
        process.stdin.setEncoding("utf8");
        process.stdin.once("data", data => resolve(data.trim().toLowerCase()));
    });

    if (answer !== "y") {
        console.log(`\n⏭️  Skipped ${repoName}.\n`);
        return;
    }

    console.log(`\n💾 Creating commits for ${repoName}...\n`);

    for (const item of commitData) {
        console.log(`📦 Staging: ${item.file}`);
        runGit(repoPath, ["add", "--", item.gitFile]);

        const stagedCheck = runGit(repoPath, ["diff", "--cached", "--name-only"]);
        const stagedList = stagedCheck.split(/\r?\n/).filter(Boolean).map(normalizeGitPath);

        if (!stagedList.includes(item.gitFile)) {
            console.log(`   ⚠️  Skipped: nothing to commit\n`);
            continue;
        }

        console.log(`💾 Committing: ${item.message}`);
        try {
            runGit(repoPath, ["commit", "-m", item.message]);
            console.log(`   ✅ Done\n`);
        } catch (e) {
            console.error(`   ❌ Failed: ${e.message}\n`);
        }
    }

    console.log(`🚀 Pushing ${repoName}...`);
    try {
        runGit(repoPath, ["push"]);
        console.log(`✅ ${repoName} pushed successfully.\n`);
    } catch (e) {
        console.error(`❌ Push failed: ${e.message}\n`);
    }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
    console.log("");
    console.log("====================================");
    console.log("      AI GIT COMMIT ASSISTANT");
    console.log("====================================\n");

    const targetDir = process.argv[2];
    if (!targetDir) {
        console.error("❌ No directory provided.");
        process.exit(1);
    }

    const baseDir = path.resolve(targetDir);
    console.log(`📍 Current directory: ${baseDir}\n`);

    const repos = findGitRepos(baseDir);

    if (repos.length === 0) {
        console.error("❌ No Git repository found.");
        process.exit(1);
    }

    console.log(`🔎 Found ${repos.length} Git repo(s):`);
    repos.forEach(r => console.log(`   • ${path.basename(r)} (${r})`));
    console.log("");

    const activeModel = await getBestActiveGroqModel();

    for (const repo of repos) {
        await processRepo(repo, activeModel);
    }

    console.log("====================================");
    console.log("       ALL DONE! ✅");
    console.log("====================================\n");
}

main().catch(error => {
    console.error("\n❌ ERROR:", error.message);
    process.exit(1);
});