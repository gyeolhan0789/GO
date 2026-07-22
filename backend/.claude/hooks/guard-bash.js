#!/usr/bin/env node
'use strict';

const fs = require('fs');

let raw = '';
try {
  raw = fs.readFileSync(0, 'utf8');
} catch (e) {
  raw = '';
}

let payload = {};
try {
  payload = raw ? JSON.parse(raw) : {};
} catch (e) {
  payload = {};
}

const command = (payload.tool_input && payload.tool_input.command) || '';

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
}

// 1) Block shell commands that reveal or stage secret-bearing files.
//    Heuristic guard, not a hard security boundary — a determined bypass
//    (e.g. base64-encoding the filename) is still possible.
const SECRET_FILE_RE =
  /(^|[\s/"'])(\.env(\.[\w-]+)?|application-(local|dev|prod|production|staging|stage)\.ya?ml)(?=[\s"'`]|$)/i;
const REVEAL_OR_STAGE_RE =
  /\b(cat|type|more|less|head|tail|Get-Content|gc|grep|findstr|Select-String|git\s+(add|commit|show|diff|log\s+-p))\b/i;

if (SECRET_FILE_RE.test(command) && REVEAL_OR_STAGE_RE.test(command)) {
  deny(
    'This command reads or stages a file that may contain secrets (.env / application-<profile>.yml). Blocked by project hook policy.'
  );
}

// 2) Enforce Conventional Commits on `git commit` messages.
if (/\bgit\s+commit\b/i.test(command) && !/--amend\s+--no-edit\b/i.test(command)) {
  let message = null;

  // Heredoc style used by Claude Code's own commit convention:
  //   git commit -m "$(cat <<'EOF' ... EOF)"
  const heredocMatch = command.match(/<<['"]?EOF['"]?\s*\n([\s\S]*?)\nEOF/);
  if (heredocMatch) {
    message = heredocMatch[1].split('\n')[0];
  } else {
    const simpleMatch = command.match(/-m\s+"([^"]+)"|-m\s+'([^']+)'/);
    if (simpleMatch) {
      message = (simpleMatch[1] || simpleMatch[2]).split('\n')[0];
    }
  }

  if (message) {
    const CONVENTIONAL_RE =
      /^(feat|fix|refactor|chore|docs|style|test|perf|build|ci|revert)(\([\w./-]+\))?!?:\s+.+/;
    if (!CONVENTIONAL_RE.test(message.trim())) {
      deny(
        `Commit message "${message.trim()}" does not follow Conventional Commits (e.g. "feat: add login API", "fix(auth): handle expired token"). Rewrite the message and retry.`
      );
    }
  }
  // If no message could be extracted, don't block — avoid false positives.
}

process.exit(0);
