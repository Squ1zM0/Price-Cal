const fs = require("fs");
const path = require("path");
const https = require("https");

function removeRecursive(p) {
  if (!fs.existsSync(p)) return;
  const stat = fs.statSync(p);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(p)) removeRecursive(path.join(p, entry));
    fs.rmdirSync(p);
  } else {
    fs.unlinkSync(p);
  }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function httpGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      method: "GET",
      headers: {
        "User-Agent": "accutrol-price-calculator-sync",
        "Accept": "application/vnd.github+json",
        ...headers,
      },
    };
    https
      .request(u, opts, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
            }
          } else {
            reject(
              new Error(
                `HTTP ${res.statusCode} for ${url}: ${data.slice(0, 400)}`
              )
            );
          }
        });
      })
      .on("error", reject)
      .end();
  });
}

function httpGetBuffer(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      method: "GET",
      headers: {
        "User-Agent": "accutrol-price-calculator-sync",
        "Accept": "*/*",
        ...headers,
      },
    };
    https
      .request(u, opts, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(buf);
          } else {
            reject(
              new Error(
                `HTTP ${res.statusCode} for ${url}: ${buf.toString("utf8", 0, 400)}`
              )
            );
          }
        });
      })
      .on("error", reject)
      .end();
  });
}

async function listGithubDir(owner, repo, dirPath, ref, headers) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
    dirPath
  ).replace(/%2F/g, "/")}?ref=${encodeURIComponent(ref)}`;
  return await httpGetJson(apiUrl, headers);
}

async function downloadGithubTreeToPublic(owner, repo, baseDirPath, ref, outDir) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  async function walk(remotePath, localPath) {
    const items = await listGithubDir(owner, repo, remotePath, ref, headers);
    if (!Array.isArray(items)) throw new Error(`Expected directory listing array at ${remotePath}`);
    for (const item of items) {
      const target = path.join(localPath, item.name);
      if (item.type === "dir") {
        ensureDir(target);
        await walk(item.path, target);
      } else if (item.type === "file") {
        // Prefer download_url (raw)
        const dl = item.download_url;
        if (!dl) continue;
        const buf = await httpGetBuffer(dl, headers);
        fs.writeFileSync(target, buf);
      }
    }
  }

  ensureDir(outDir);
  await walk(baseDirPath, outDir);
}

async function main() {
  const repoRoot = process.cwd();
  const publicOut = path.join(repoRoot, "public", "techdirect");

  // Always rebuild output
  removeRecursive(publicOut);
  ensureDir(publicOut);

  // Repo + paths
  const owner = process.env.TECHDIRECT_OWNER || "Squ1zM0";
  const repo = process.env.TECHDIRECT_REPO || "TechDirect";
  const ref = process.env.TECHDIRECT_REF || "main";

  // Try common layouts in order
  const candidatePaths = [
    "tech-support-directory/dist",
    "tech-support-directory/public/techdirect",
    "tech-support-directory/public",
    "tech-support-directory",
  ];

  let lastErr = null;
  for (const p of candidatePaths) {
    try {
      await downloadGithubTreeToPublic(owner, repo, p, ref, publicOut);
      // If we pulled the entire folder, but it contained nested public/techdirect, flatten if needed
      // If index.min.json exists anywhere nested, copy it up to root.
      const indexCandidates = [];
      function findIndex(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const fp = path.join(dir, entry.name);
          if (entry.isDirectory()) findIndex(fp);
          else if (entry.isFile() && entry.name === "index.min.json") indexCandidates.push(fp);
        }
      }
      findIndex(publicOut);
      if (indexCandidates.length === 0) {
        console.warn(`[sync-techdirect] Pulled "${p}" but did not find index.min.json. Keeping files as-is.`);
      } else {
        // If index.min.json is not at root, ensure it's at root for the app.
        const rootIndex = path.join(publicOut, "index.min.json");
        if (!fs.existsSync(rootIndex)) {
          fs.copyFileSync(indexCandidates[0], rootIndex);
        }
      }

      console.log(`[sync-techdirect] Synced from github:${owner}/${repo}@${ref}:${p} -> ${publicOut}`);
      return;
    } catch (e) {
      lastErr = e;
      // Clean and retry next candidate
      removeRecursive(publicOut);
      ensureDir(publicOut);
    }
  }

  console.error("[sync-techdirect] Failed to sync TechDirect directory data from GitHub.");
  console.error(lastErr ? lastErr.message : "Unknown error");
  console.error("If the repo is private, set GITHUB_TOKEN in Vercel environment variables.");
  process.exit(1);
}

main().catch((e) => {
  console.error("[sync-techdirect] Unhandled error:", e);
  process.exit(1);
});
