import { parseArgs } from "util";
import {
  togglGet,
  togglPost,
  getWorkspaceId,
  getProjects,
  formatDuration,
  parseDate,
  type TimeEntry,
} from "./api";

const subcommand = process.argv[2];

async function listEntries(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      from: { type: "string", default: "today" },
      to: { type: "string", default: "today" },
    },
    allowPositionals: true,
  });

  const fromDate = parseDate(values.from!);
  const toDate = parseDate(values.to!);

  const [entries, projects] = await Promise.all([
    togglGet<TimeEntry[]>(
      `/me/time_entries?start_date=${fromDate}T00:00:00Z&end_date=${toDate}T23:59:59Z`,
    ),
    getProjects(),
  ]);

  const projectMap = new Map<number, string>();
  for (const p of projects) {
    projectMap.set(p.id, p.name);
  }

  const sorted = entries.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  if (sorted.length === 0) {
    console.log(`No entries from ${fromDate} to ${toDate}`);
    return;
  }

  console.log(`Entries from ${fromDate} to ${toDate}:\n`);
  for (const e of sorted) {
    const project = e.project_id ? (projectMap.get(e.project_id) ?? "Unknown") : "No project";
    const start = new Date(e.start).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const stop = e.stop
      ? new Date(e.stop).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "running";
    const dur = e.duration > 0 ? formatDuration(e.duration) : "running";
    const desc = e.description || "(no description)";
    console.log(`  ${start} - ${stop}  ${dur.padStart(7)}  [${project}]  ${desc}`);
  }
}

async function addEntry(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: "string" },
      date: { type: "string" },
      start: { type: "string" },
      end: { type: "string" },
      description: { type: "string", default: "" },
    },
    allowPositionals: true,
  });

  if (!values.project || !values.date || !values.start || !values.end) {
    console.error(
      "Usage: bun src/entries.ts add --project NAME --date YYYY-MM-DD --start HH:MM --end HH:MM [--description TEXT]",
    );
    process.exit(1);
  }

  const [wid, projects] = await Promise.all([getWorkspaceId(), getProjects()]);

  const match = projects.find((p) => p.name.toLowerCase() === values.project!.toLowerCase());
  if (!match) {
    console.error(`Project "${values.project}" not found. Available projects:`);
    for (const p of projects.filter((p) => p.active)) {
      console.error(`  - ${p.name}`);
    }
    process.exit(1);
  }

  const startISO = `${values.date}T${values.start}:00Z`;
  const endISO = `${values.date}T${values.end}:00Z`;
  const startTime = new Date(startISO).getTime();
  const endTime = new Date(endISO).getTime();
  const duration = Math.floor((endTime - startTime) / 1000);

  if (duration <= 0) {
    console.error("End time must be after start time");
    process.exit(1);
  }

  await togglPost(`/workspaces/${wid}/time_entries`, {
    workspace_id: wid,
    project_id: match.id,
    start: startISO,
    duration,
    description: values.description,
    created_with: "toggl-cli",
  });

  console.log(
    `Created entry: [${match.name}] ${values.start}-${values.end} (${formatDuration(duration)}) ${values.description || ""}`,
  );
}

switch (subcommand) {
  case "list":
    await listEntries(process.argv.slice(3));
    break;
  case "add":
    await addEntry(process.argv.slice(3));
    break;
  default:
    console.error("Usage: bun src/entries.ts <list|add>");
    console.error("  list [--from DATE] [--to DATE]");
    console.error(
      '  add --project NAME --date YYYY-MM-DD --start HH:MM --end HH:MM [--description "..."]',
    );
    process.exit(1);
}
