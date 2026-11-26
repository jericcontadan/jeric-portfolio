// Fails (exit 1) if any file in /public is still a generated placeholder.
// Run in Step 7: npm run check:placeholders
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const hashes = JSON.parse(readFileSync(join(root, "scripts", "placeholder-hashes.json"), "utf8"));

const remaining = Object.entries(hashes).filter(([rel, hash]) => {
  const file = join(root, "public", rel);
  if (!existsSync(file)) return false;
  return createHash("sha256").update(readFileSync(file)).digest("hex") === hash;
});

if (remaining.length) {
  console.error(`${remaining.length} placeholder(s) still in /public:`);
  for (const [rel] of remaining) console.error(`  - public/${rel}`);
  process.exit(1);
}
console.log("No placeholders remain in /public.");
