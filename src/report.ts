import {
  getWorkspaceId,
  getProjects,
  reportsPost,
  parseDate,
  formatDuration,
} from "./api";
import { parseArgs } from "util";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    from: { type: "string", default: "this-week" },
    to: { type: "string", default: "today" },
  },
});

const startDate = parseDate(values.from!);
const endDate = parseDate(values.to!);

const workspaceId = await getWorkspaceId();

interface ReportGroup {
  id: number;
  sub_groups: { seconds: number }[];
}

const [projects, report] = await Promise.all([
  getProjects(),
  reportsPost<{ groups: ReportGroup[] }>(`/workspace/${workspaceId}/summary/time_entries`, {
    start_date: startDate,
    end_date: endDate,
  }),
]);

const projectMap = new Map(projects.map((p) => [p.id, p.name]));

const rows: { name: string; seconds: number }[] = [];
let totalSeconds = 0;

for (const group of report.groups) {
  const seconds = group.sub_groups.reduce(
    (sum, sg) => sum + sg.seconds,
    0,
  );
  if (seconds === 0) continue;
  rows.push({ name: projectMap.get(group.id) ?? `(unknown #${group.id})`, seconds });
  totalSeconds += seconds;
}

rows.sort((a, b) => b.seconds - a.seconds);

console.log(`\nToggl Report: ${startDate} → ${endDate}\n`);

if (rows.length === 0) {
  console.log("No tracked time in this period.");
  process.exit(0);
}

const nameWidth = Math.max(...rows.map((r) => r.name.length), 7);

console.log(
  "Project".padEnd(nameWidth) + "  " + "Hours".padStart(8) + "  " + "%".padStart(5),
);
console.log("─".repeat(nameWidth + 17));

for (const row of rows) {
  const pct = ((row.seconds / totalSeconds) * 100).toFixed(1);
  console.log(
    row.name.padEnd(nameWidth) +
      "  " +
      formatDuration(row.seconds).padStart(8) +
      "  " +
      (pct + "%").padStart(5),
  );
}

console.log("─".repeat(nameWidth + 17));
console.log(
  "Total".padEnd(nameWidth) + "  " + formatDuration(totalSeconds).padStart(8),
);
