/**
 * One-time (or re-run safe): replace hardcoded http://localhost:5000 with API_BASE from src/config/api.js
 * Run from repo root: node scripts/fix-api-urls.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcDir = path.join(root, "client", "src");

function importPath(fromFile) {
  const rel = path
    .relative(path.dirname(fromFile), path.join(srcDir, "config", "api.js"))
    .replace(/\\/g, "/")
    .replace(/\.js$/, "");
  return rel.startsWith(".") ? rel : `./${rel}`;
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (name === "node_modules") continue;
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(jsx?|tsx?)$/.test(name) && !p.replace(/\\/g, "/").endsWith("config/api.js")) out.push(p);
  }
  return out;
}

function processFile(fp) {
  let s = fs.readFileSync(fp, "utf8");
  if (!s.includes("localhost:5000")) return false;

  // Remove duplicate local API_BASE definitions (use shared config)
  s = s.replace(
    /^\s*const API_BASE = import\.meta\.env\.VITE_API_BASE_URL \|\| ["']http:\/\/localhost:5000["'];\s*\n/gm,
    ""
  );
  s = s.replace(
    /\n\s*const API_BASE = import\.meta\.env\.VITE_API_BASE_URL \|\| ["']http:\/\/localhost:5000["'];\s*\n/g,
    "\n"
  );

  // fetch("http://localhost:5000/...")  -> fetch(`${API_BASE}/...`)
  s = s.replace(/fetch\(\s*"http:\/\/localhost:5000([^"]*)"/g, "fetch(`${API_BASE}$1`");
  s = s.replace(/fetch\(\s*'http:\/\/localhost:5000([^']*)'/g, "fetch(`${API_BASE}$1`");

  // Template URLs starting with localhost
  s = s.replace(/`http:\/\/localhost:5000/g, "`${API_BASE}");

  // Remaining quoted full URLs (e.g. someUrl = "http://localhost:5000...")
  s = s.replace(/"http:\/\/localhost:5000(\/[^"]*)"/g, "`${API_BASE}$1`");
  s = s.replace(/'http:\/\/localhost:5000(\/[^']*)'/g, "`${API_BASE}$1`");

  // import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000' in templates
  s = s.replace(
    /import\.meta\.env\.VITE_API_BASE_URL \|\| ['"]http:\/\/localhost:5000['"]/g,
    "API_BASE"
  );

  if (s.includes("localhost:5000")) {
    console.warn("Still has localhost:5000:", fp);
  }

  if (!s.includes('from "') && !s.includes("from '") || !s.includes("API_BASE")) {
    // may need import
  }
  if (s.includes("${API_BASE}") || s.includes("${API_BASE}") || /API_BASE/.test(s)) {
    const imp = `import { API_BASE } from "${importPath(fp)}";\n`;
    if (!s.includes("config/api") && !s.includes('config/api')) {
      const firstImport = s.search(/^import\s/m);
      if (firstImport >= 0) {
        const lineEnd = s.indexOf("\n", firstImport);
        s = s.slice(0, lineEnd + 1) + imp + s.slice(lineEnd + 1);
      } else {
        s = imp + s;
      }
    }
  }

  // If we only removed const API_BASE but file still uses API_BASE from old pattern - ensure import
  if ((s.match(/\bAPI_BASE\b/g) || []).length > 0 && !s.match(/import\s*\{\s*API_BASE/)) {
    const imp = `import { API_BASE } from "${importPath(fp)}";\n`;
    const firstImport = s.search(/^import\s/m);
    if (firstImport >= 0) {
      const lineEnd = s.indexOf("\n", firstImport);
      s = s.slice(0, lineEnd + 1) + imp + s.slice(lineEnd + 1);
    } else {
      s = imp + s;
    }
  }

  fs.writeFileSync(fp, s);
  return true;
}

let n = 0;
for (const fp of walk(srcDir)) {
  try {
    if (processFile(fp)) n++;
  } catch (e) {
    console.error(fp, e);
  }
}
console.log("Updated", n, "files");
