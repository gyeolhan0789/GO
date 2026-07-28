---
name: mr-gen
description: Generate or update the current branch's GitLab merge-request description from its develop diff.
argument-hint: "[optional source branch]"
---

# GitLab MR description generation

Follow `convention/git-convention.md` for branch, commit, and MR rules.

1. Confirm `glab` is installed. Do not treat a failing `glab --version` in the current shell as proof it is missing — a stale PATH cache is a common false negative, especially right after another process installed it. Before running any install command, check for an existing installation first: `winget list --id GLab.GLab`, and check whether a known install path (for example `%LOCALAPPDATA%\Programs\glab`) is already present in the user `Path` environment variable. If either check shows it is already installed, add that path to the current session's PATH and use it — never run an install, reinstall, or upgrade command in that case. Only install it through the approved Windows package manager (for example, `winget install --id GLab.GLab --exact`) once both checks confirm there is no existing installation. Then run `glab auth status`. If authentication is unavailable, stop and provide this PAT recovery path:
   - Open `https://lab.ssafy.com/-/user_settings/personal_access_tokens`.
   - Create a token with the `api` scope.
   - Authenticate with `glab auth login --hostname lab.ssafy.com --token <token>`.
2. Read the current branch with `git branch --show-current`. Extract the work type and Jira key from `{type}/S15P11A506-{number}`. Map the work type to an uppercase title prefix (for example, `feat` to `[FEAT]`).
3. Run `glab mr list --source-branch "$(git branch --show-current)" --state opened`. If an MR exists, retain its number and skip title resolution because only its description will be updated.
4. Only when no MR exists: if a Jira key exists and Jira MCP is available, call `mcp__jira__jira_get_issue(issue_key="<key>")` and use its `summary`. If the branch format is invalid, the Jira key cannot be extracted, Jira is unavailable, or the issue lookup fails, ask the user for the title before reading the diff. Use the user-provided title exactly.
5. Inspect `git diff origin/develop...HEAD`; when the diff exceeds 20 files or 2,000 lines, inspect `git diff origin/develop...HEAD --name-only` first.
6. Generate this Markdown body, describing behavior rather than implementation details:

   ```md
   ## Summary
   <purpose and main behavior in one or two sentences>

   ## Changes
   - <behavioral area 1>
   - <behavioral area 2>

   ## Note
   <optional deployment or reviewer note>

   ## Related Issue
   Jira: https://ssafy.atlassian.net/browse/<key>
   ```

   Omit `Note` when it has no content. Omit `Related Issue` when no Jira key was resolved.
7. If an MR exists, replace its complete description with `glab mr update <number> --description "<body>"`. Otherwise create one with `glab mr create --title "[<TYPE>] <title>" --description "<body>" --target-branch develop`.
8. Report the resulting MR URL using `glab mr view --web` or its `Web URL` output. Do not set assignees, labels, or milestones unless explicitly requested.
