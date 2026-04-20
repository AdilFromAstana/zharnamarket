/**
 * Custom Vitest reporter (vitest v4 API): markdown-отчёт email-тестов.
 *
 * Подключается через vitest.email.config.ts. После `npm run test:email`
 * пишет tests/email/REPORT.md с таблицами по файлам:
 *
 *     | # | Сценарий | Статус | Время |
 */

import fs from "node:fs";
import path from "node:path";

interface Row {
  file: string;
  name: string;
  status: "passed" | "failed" | "skipped" | "pending";
  durationMs: number;
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectTests(testModule: any, out: Row[], repoRoot: string): void {
  const relFile = path.relative(repoRoot, testModule.moduleId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const test of testModule.children.allTests() as Iterable<any>) {
    const r = test.result();
    const d = test.diagnostic?.();
    out.push({
      file: relFile,
      name: test.fullName,
      status: r?.state ?? "pending",
      durationMs: Math.round(d?.duration ?? 0),
      error: r?.errors?.[0]?.message,
    });
  }
}

export default class EmailReporter {
  private startedAt = 0;

  onInit(): void {
    this.startedAt = Date.now();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onTestRunEnd(testModules: ReadonlyArray<any>): void {
    const repoRoot = process.cwd();
    const rows: Row[] = [];
    for (const m of testModules) collectTests(m, rows, repoRoot);

    const totalMs = Date.now() - this.startedAt;
    const md = this.render(rows, totalMs);

    const reportDir = path.join(repoRoot, "tests", "email");
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, "REPORT.md");
    fs.writeFileSync(reportPath, md, "utf8");
    // eslint-disable-next-line no-console
    console.log(`\n[email-report] ${reportPath}`);
  }

  private render(rows: Row[], totalMs: number): string {
    const byFile = new Map<string, Row[]>();
    for (const r of rows) {
      const arr = byFile.get(r.file) ?? [];
      arr.push(r);
      byFile.set(r.file, arr);
    }

    const pass = rows.filter((r) => r.status === "passed").length;
    const fail = rows.filter((r) => r.status === "failed").length;
    const skip = rows.filter((r) => r.status === "skipped").length;

    const lines: string[] = [];
    lines.push(`# Email tests report`);
    lines.push("");
    lines.push(`_Generated: ${new Date().toISOString()}_`);
    lines.push("");
    lines.push(`**Summary:** ${pass} pass · ${fail} fail · ${skip} skip · total ${totalMs} ms`);
    lines.push("");

    for (const [file, fileRows] of byFile) {
      lines.push(`## ${file}`);
      lines.push("");
      lines.push(`| # | Сценарий | Статус | Время |`);
      lines.push(`|---|---|---|---|`);
      fileRows.forEach((r, i) => {
        const icon =
          r.status === "passed" ? "✓ pass"
          : r.status === "failed" ? "✗ fail"
          : r.status === "skipped" ? "· skip"
          : "· pend";
        lines.push(`| ${i + 1} | ${r.name} | ${icon} | ${r.durationMs} ms |`);
      });
      lines.push("");

      const fails = fileRows.filter((r) => r.status === "failed");
      if (fails.length) {
        lines.push(`### Failures in ${file}`);
        lines.push("");
        for (const f of fails) {
          lines.push(`- **${f.name}**`);
          lines.push("");
          lines.push("  ```");
          lines.push(
            "  " +
              (f.error ?? "(no error message)")
                .split("\n")
                .slice(0, 5)
                .join("\n  "),
          );
          lines.push("  ```");
          lines.push("");
        }
      }
    }

    return lines.join("\n") + "\n";
  }
}
