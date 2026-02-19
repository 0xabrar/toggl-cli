# Toggl CLI

Simple command-line tools for interacting with the [Toggl Track](https://track.toggl.com) API. Pull reports, manage time entries, and organize projects from your terminal.

Built with [Bun](https://bun.sh) and TypeScript.

## Why

Designed to work with AI coding assistants like [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Point Claude Code at this repo and interact with your Toggl entirely through conversation — start timers, check what's running, pull reports, reorganize projects. Use the Toggl web app for the nice visual dashboards; use this for everything else.

## Setup

```bash
bun install
export TOGGL_API_TOKEN="your-api-token"
```

Get your API token from the bottom of your [Toggl profile page](https://track.toggl.com/profile).

Workspace ID and project data are auto-cached to `~/.toggl-cache.json` (24h TTL) to minimize API calls.

## Usage

### Timer Control

```bash
# What's currently running?
bun src/entries.ts current

# Start a timer
bun src/entries.ts start --project "Product" --description "Working on auth flow"

# Stop the running timer
bun src/entries.ts stop
```

### Time Entries

```bash
# List today's entries
bun src/entries.ts list

# List entries for a date range
bun src/entries.ts list --from yesterday --to today

# Add a retroactive entry
bun src/entries.ts add --project "Product" --date 2026-02-18 --start 14:00 --end 17:00 --description "Worked on auth flow"
```

### Reports

Pull a summary report broken down by project for a date range.

```bash
bun src/report.ts                        # this week (default)
bun src/report.ts --from this-month      # month to date
bun src/report.ts --from 2026-01-01 --to 2026-01-31
```

### Projects

```bash
# List all projects with total hours
bun src/projects.ts list

# Rename a project
bun src/projects.ts rename "Old Name" "New Name"

# Move all entries from one project to another
bun src/projects.ts merge "Source Project" "Target Project"
```

## Date Shortcuts

Anywhere a date is accepted, you can use: `today`, `yesterday`, `this-week`, `this-month`, `this-quarter`, `this-year`, or a specific `YYYY-MM-DD` date.
