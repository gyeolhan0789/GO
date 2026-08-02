#!/usr/bin/env node
'use strict';

const fs = require('fs');

function readPayload() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

const payload = readPayload();
const command = payload.tool_input?.command || '';

// 1) Block shell commands that reveal or stage secret-bearing files.
//    Heuristic guard, not a hard security boundary — a determined bypass
//    (e.g. base64-encoding the filename) is still possible.
//    Profile-specific application ymls for production/staging aren't tracked
//    in this repo (those envs are configured via env vars / CI secrets, not
//    committed yaml), so they're not matched here.
const SECRET_FILE_RE = /(^|[\s/"'])(\.env(\.[\w-]+)?)(?=[\s"'`]|$)/i;
const REVEAL_OR_STAGE_RE =
  /\b(cat|type|more|less|head|tail|Get-Content|gc|grep|findstr|Select-String|git\s+(add|commit|show|diff|log\s+-p))\b/i;

if (SECRET_FILE_RE.test(command) && REVEAL_OR_STAGE_RE.test(command)) {
  deny(
    'This command reads or stages a file that may contain secrets (.env). Blocked by project hook policy.'
  );
}

// 2) Enforce Conventional Commits on `git commit` messages.
if (/\bgit\s+commit\b/i.test(command) && !/--amend\s+--no-edit\b/i.test(command)) {
  let message = null;

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
      /^(feat|fix|refactor|chore|docs|style|test|perf|build|ci|revert):\s+.+/;
    const CONTAINS_KOREAN_RE = /[가-힣]/;
    if (!CONVENTIONAL_RE.test(message.trim()) || !CONTAINS_KOREAN_RE.test(message)) {
      deny(
        `Commit message "${message.trim()}" must use the "type: 한글 설명" format without a scope or breaking-change marker (e.g. "feat: 로그인 API 추가", "fix: 만료된 토큰 처리"). All-English messages are not allowed. Rewrite the message and retry.`
      );
    }
  }
}

process.exit(0);
