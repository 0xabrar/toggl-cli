# Toggl

CLI tools for interacting with the Toggl Track API. Pull reports, manage entries, and organize projects.

## Auth

Uses `TOGGL_API_TOKEN` env var. Workspace ID and projects are auto-detected and cached to `~/.toggl-cache.json` (24h TTL). Cache refreshes automatically after project renames/merges.

## Project Categories

| Project | Description |
|---------|-------------|
| Product | Core app development — features, bugs, design |
| Tooling | Productivity tools — CRM, scripts, automation |
| Content | TikToks, slideshows, video content creation |
| Outreach | Influencer deals, partnerships, cold emails |
| Research | Learning, watching videos, reading, courses |
| Admin | App Store Connect, bookkeeping, planning, overhead |

## Scripts

```
bun src/report.ts [--from DATE] [--to DATE]          # summary by project (default: this week)
bun src/entries.ts list [--from DATE] [--to DATE]     # list time entries (default: today)
bun src/entries.ts add --project NAME --date YYYY-MM-DD --start HH:MM --end HH:MM [--description "..."]
bun src/projects.ts list                              # list projects with hours
bun src/projects.ts rename "Old" "New"                # rename a project
bun src/projects.ts merge "Source" "Target"           # move entries between projects
```

## Date Shortcuts

`today`, `yesterday`, `this-week`, `this-month`, `this-quarter`, `this-year`, or `YYYY-MM-DD`
