const fs = require("fs");
const path = require("path");

function copyRecursive(src, dst) {
  if (!fs.existsSync(src)) throw new Error(`Source not found: ${src}`);
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dst, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

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

const repoRoot = process.cwd();
const vendorDist = path.join(repoRoot, "vendor", "tech-support-directory", "dist");
const publicOut = path.join(repoRoot, "public", "techdirect");

// Clean output then copy
removeRecursive(publicOut);
copyRecursive(vendorDist, publicOut);

console.log(`[sync-techdirect] Copied ${vendorDist} -> ${publicOut}`);
