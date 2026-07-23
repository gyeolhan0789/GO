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
const secretFile = /(^|[\s/"'])(\.env(\.[\w-]+)?|application-(local|dev|prod|production|staging|stage)\.ya?ml)(?=[\s"'`]|$)/i;
const revealOrStage = /\b(cat|type|more|less|head|tail|Get-Content|gc|grep|findstr|Select-String|git\s+(add|commit|show|diff|log\s+-p))\b/i;

if (secretFile.test(command) && revealOrStage.test(command)) {
  deny('This command reads or stages a file that may contain secrets (.env / application-<profile>.yml).');
}

if (/\bgit\s+commit\b/i.test(command) && !/--amend\s+--no-edit\b/i.test(command)) {
  const heredoc = command.match(/<<['"]?EOF['"]?\s*\n([\s\S]*?)\nEOF/);
  const match = command.match(/-m\s+"([^"]+)"|-m\s+'([^']+)'/);
  const message = heredoc ? heredoc[1].split('\n')[0] : match && (match[1] || match[2]);
  const conventionalCommit = /^(feat|fix|refactor|chore|docs|style|test|perf|build|ci|revert):\s+.+/;
  const containsKorean = /[가-힣]/;

  if (message && (!conventionalCommit.test(message.trim()) || !containsKorean.test(message))) {
    deny(`Commit message "${message.trim()}" must use the "type: 한글 설명" format without a scope or breaking-change marker; all-English messages are not allowed.`);
  }
}
