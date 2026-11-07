/**
 * Uploads the extracted release to the Hugging Face dataset in one commit:
 *
 *   <release>/<city>/<category>.json.gz
 *   <release>/manifest.json
 *   manifest.json            ← copy of the above; the app's entry point
 *
 *   bun scripts/overture/upload.ts
 *
 * Needs HF_TOKEN in `.env.local` (Bun loads it): a fine-grained token with
 * write access to this one dataset only.
 */
import { uploadFiles } from "@huggingface/hub";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { OVERTURE_RELEASE } from "./cities";

const DATASET = "nafistarik/leadscout-places";
const OUT_DIR = new URL(`./out/${OVERTURE_RELEASE}/`, import.meta.url).pathname;

const token = process.env.HF_TOKEN;
if (!token) throw new Error("HF_TOKEN is missing — add it to .env.local.");
if (!existsSync(`${OUT_DIR}manifest.json`)) {
  throw new Error(`Nothing to upload — run extract.ts first (${OUT_DIR}manifest.json not found).`);
}

const files = readdirSync(OUT_DIR, { recursive: true, encoding: "utf8" })
  .filter((path) => statSync(OUT_DIR + path).isFile())
  .map((path) => ({ path: `${OVERTURE_RELEASE}/${path}`, content: new Blob([readFileSync(OUT_DIR + path)]) }));
files.push({ path: "manifest.json", content: new Blob([readFileSync(`${OUT_DIR}manifest.json`)]) });

const started = performance.now();
const result = await uploadFiles({
  repo: { type: "dataset", name: DATASET },
  accessToken: token,
  files,
  commitTitle: `data: Overture places ${OVERTURE_RELEASE}`,
});
const seconds = ((performance.now() - started) / 1000).toFixed(0);
console.log(`${files.length} files uploaded in ${seconds}s, commit ${result?.commit.oid ?? "unknown"}`);
