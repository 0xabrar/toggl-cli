import {
  togglGet,
  togglPut,
  getWorkspaceId,
  getProjects,
  refreshCache,
  formatDuration,
  type Project,
  type TimeEntry,
} from "./api";

const [cmd, ...args] = process.argv.slice(2);

async function listProjects() {
  const projects: Project[] = await getProjects();
  const active = projects.filter((p) => p.active);

  if (active.length === 0) {
    console.log("No active projects.");
    return;
  }

  active.sort((a, b) => (b.actual_seconds ?? 0) - (a.actual_seconds ?? 0));

  console.log(
    "Name".padEnd(35) + "Hours".padStart(10) + "  " + "Color"
  );
  console.log("-".repeat(55));

  for (const p of active) {
    const hours = formatDuration(p.actual_seconds ?? 0);
    console.log(
      p.name.slice(0, 35).padEnd(35) + hours.padStart(10) + "  " + p.color
    );
  }

  console.log(`\n${active.length} active projects`);
}

async function findProject(
  projects: Project[],
  name: string
): Promise<Project> {
  const match = projects.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
  if (!match) {
    console.error(`Project not found: "${name}"`);
    process.exit(1);
  }
  return match;
}

async function renameProject(oldName: string, newName: string) {
  const wid = await getWorkspaceId();
  const projects: Project[] = await getProjects();
  const project = await findProject(projects, oldName);

  await togglPut(`/workspaces/${wid}/projects/${project.id}`, {
    name: newName,
  });

  console.log(`Renamed "${project.name}" -> "${newName}"`);
  await refreshCache();
}

async function mergeProjects(sourceName: string, targetName: string) {
  const wid = await getWorkspaceId();
  const projects: Project[] = await getProjects();
  const source = await findProject(projects, sourceName);
  const target = await findProject(projects, targetName);

  console.log(
    `Merging "${source.name}" (id: ${source.id}) -> "${target.name}" (id: ${target.id})`
  );

  // Fetch time entries (API allows ~90 days lookback from today)
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 89);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = now.toISOString().slice(0, 10);
  const entries = await togglGet<TimeEntry[]>(
    `/me/time_entries?start_date=${startStr}&end_date=${endStr}`
  );
  const sourceEntries = entries.filter((e) => e.project_id === source.id);

  if (sourceEntries.length === 0) {
    console.log("No time entries found for source project.");
    return;
  }

  console.log(`Found ${sourceEntries.length} entries to move...`);

  let moved = 0;
  for (const entry of sourceEntries) {
    await togglPut(`/workspaces/${wid}/time_entries/${entry.id}`, {
      project_id: target.id,
    });
    moved++;
  }

  console.log(`Moved ${moved} entries from "${source.name}" to "${target.name}"`);
  console.log(
    `\nTip: You can archive "${source.name}" in Toggl settings if it's no longer needed.`
  );
  await refreshCache();
}

switch (cmd) {
  case "list":
    await listProjects();
    break;
  case "rename":
    if (args.length < 2) {
      console.error('Usage: bun src/projects.ts rename "Old Name" "New Name"');
      process.exit(1);
    }
    await renameProject(args[0]!, args[1]!);
    break;
  case "merge":
    if (args.length < 2) {
      console.error(
        'Usage: bun src/projects.ts merge "Source" "Target"'
      );
      process.exit(1);
    }
    await mergeProjects(args[0]!, args[1]!);
    break;
  default:
    console.log(`Usage: bun src/projects.ts <command>

Commands:
  list                          List all active projects
  rename "Old Name" "New Name"  Rename a project
  merge "Source" "Target"       Move all time entries from Source to Target`);
    process.exit(cmd ? 1 : 0);
}
