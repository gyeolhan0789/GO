'use strict';

const fs = require('fs');

function readPayload() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function cursorDeny(reason, agentMessage) {
  process.stdout.write(
    JSON.stringify({
      permission: 'deny',
      user_message: reason,
      agent_message: agentMessage || reason,
    })
  );
}

function getFilePath(payload) {
  return payload.file_path || (payload.tool_input && payload.tool_input.file_path) || '';
}

function getCommand(payload) {
  return payload.command || (payload.tool_input && payload.tool_input.command) || '';
}

module.exports = {
  readPayload,
  cursorDeny,
  getFilePath,
  getCommand,
};
