/* eslint-disable no-console */
// scripts/restore-sanity-services.ts
//
// Reverses a service-seed run by restoring service docs from a backup file
// written by seed-theresa-services.ts (backups/sanity-services-*.json).
//
// USAGE:
//   npx tsx scripts/restore-sanity-services.ts backups/sanity-services-<stamp>.json          # dry-run
//   npx tsx scripts/restore-sanity-services.ts backups/sanity-services-<stamp>.json --apply  # restore
//
// It createOrReplace's every service doc captured in the backup, returning the
// Sanity project's service docs to exactly the snapshot state. Docs created
// AFTER the backup are left as-is (it does not delete them); remove those by
// hand if needed.

import "dotenv/config";
import { readFileSync } from "node:fs";

interface Backup {
  projectId?: string;
  dataset?: string;
  services: Array<Record<string, unknown> & { _id: string; _type?: string }>;
}

async function main() {
  const file = process.argv[2];
  const apply = process.argv.includes("--apply");
  if (!file) {
    console.error("Usage: npx tsx scripts/restore-sanity-services.ts <backup.json> [--apply]");
    process.exit(1);
  }

  const backup: Backup = JSON.parse(readFileSync(file, "utf8"));
  const { sanityWrite } = await import("../src/lib/sanity-write");

  console.log(`Restoring from: ${file}`);
  console.log(`Backup project: ${backup.projectId} / ${backup.dataset}`);
  console.log(`Current target: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID} / ${process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production"}`);
  console.log(`Docs in backup: ${backup.services.length}`);
  console.log("");

  if (backup.projectId && backup.projectId !== process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    console.error("Refusing to restore: .env points at a DIFFERENT project than the backup.");
    process.exit(1);
  }

  for (const doc of backup.services) {
    console.log(`  ${apply ? "RESTORE" : "would restore"} ${doc._id}  ${(doc as { title?: string }).title ?? ""}`);
  }
  console.log("");

  if (!apply) {
    console.log("(Dry-run. Re-run with --apply to restore.)");
    return;
  }

  for (const doc of backup.services) {
    // Ensure _type is present (it always is in our backups).
    await sanityWrite.createOrReplace({ _type: "service", ...doc } as never);
    console.log(`Restored ${doc._id}`);
  }
  console.log("");
  console.log("Done.");
}

main().catch((err) => {
  console.error("Restore failed:");
  console.error(err);
  process.exit(1);
});
