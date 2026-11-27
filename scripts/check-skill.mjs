// Static package checks only. This does not execute or score model responses.
import assert from "node:assert/strict";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillName = "structural-visualization";
const fixedPrompt = "@GitHub https://github.com/dharmainsight/structural-visualization- の開発を再開してください。mainと未マージのPRを確認し、最新のdocs/RESUME.mdおよびdocs/PLAN.mdに従って作業を継続してください。";
const placeholders = /\b(?:TODO|TBD|FIXME|PLACEHOLDER)\b|\[(?:INSERT|ここに記入)[^\]]*\]/i;
const provenance = /\bS01(?:-\d+[a-z]?)?\b|\bT0\d(?:\.\d{2})*\b|第[一二三四五六七八九十0-9]+章|(?:出典|着想元)\s*[:：]|\bPROPOSAL\b|原典(?:の着想|確認済み|との対応)|暫定実装/i;
const devArtifact = /(?:^|\/)(?:docs|evals|\.git|node_modules|__pycache__)(?:\/|$)|(?:^|\/)(?:README|CHANGELOG|PLAN|RESUME|TOC|KNOWLEDGE-TRANSFER|AGENTS)\.md$|(?:^|\/)(?:sources?|bibliography|provenance|attributions?|citations?)(?:[-_.]|$)/i;

function readRuntime(root) {
  const files = new Map(), problems = [];
  function visit(absolute) {
    const relative = path.relative(root, absolute).split(path.sep).join("/") || ".";
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      problems.push("Runtime contains a symlink: " + relative);
    } else if (stat.isDirectory()) {
      for (const entry of readdirSync(absolute).sort()) visit(path.join(absolute, entry));
    } else if (stat.isFile()) {
      files.set(relative, /\.(?:md|ya?ml|mjs|js|json|txt|py|sh)$/i.test(relative)
        ? readFileSync(absolute, "utf8") : null);
    } else {
      problems.push("Unsupported runtime entry: " + relative);
    }
  }
  if (!lstatSync(root).isDirectory()) problems.push("Runtime root must be a directory");
  visit(root);
  return { files, problems };
}

// Read the simple scalar fields used by skill metadata; no YAML dependency.
function scalar(yaml, key, indent = 0) {
  const lines = yaml.split(/\r?\n/);
  const expression = new RegExp("^ {" + indent + "}" + key + ":\\s*(.*)$");
  const hits = lines.map((line, index) => ({ match: line.match(expression), index }))
    .filter(item => item.match);
  if (hits.length !== 1) return null;
  const { match, index } = hits[0];
  const raw = match[1].trim();
  if (/^[>|][-+]?$/.test(raw)) {
    const body = [];
    for (let i = index + 1; i < lines.length; i++) {
      if (lines[i].trim() && !new RegExp("^ {" + (indent + 1) + ",}\\S").test(lines[i])) break;
      body.push(lines[i].trim());
    }
    return body.join(raw.startsWith(">") ? " " : "\n").trim();
  }
  if (raw.startsWith('"')) {
    try { return JSON.parse(raw); } catch { return null; }
  }
  if (raw.startsWith("'")) return /^'(?:[^']|'')*'$/.test(raw) ? raw.slice(1, -1).replace(/''/g, "'") : null;
  const plain = raw.replace(/\s+#.*$/, "").trim();
  if (/^(?:null|~|true|false|[+-]?\d+(?:\.\d+)?|#[\s\S]*|[\[{][\s\S]*)$/i.test(plain)) return null;
  return plain;
}

function markdownTargets(markdown) {
  const targets = [], definitions = new Set(), unresolved = [];
  const withoutFences = markdown.replace(/^ {0,3}(```|~~~)[^\n]*\n[\s\S]*?^ {0,3}\1\s*$/gm, "");
  for (const match of withoutFences.matchAll(/!?\[[^\]\n]*\]\(\s*(<[^>\n]+>|[^\s)]+)(?:\s+["'][^)\n]*["'])?\s*\)/g)) {
    targets.push(match[1].replace(/^<|>$/g, ""));
  }
  for (const match of withoutFences.matchAll(/^ {0,3}\[[^\]\n]+\]:\s*(<[^>\n]+>|[^\s]+)(?:\s+.*)?$/gm)) {
    targets.push(match[1].replace(/^<|>$/g, ""));
    definitions.add(match[0].match(/\[([^\]]+)\]/)[1].trim().replace(/\s+/g, " ").toLowerCase());
  }
  for (const match of withoutFences.matchAll(/!?\[([^\]\n]+)\]\[([^\]\n]*)\]/g)) {
    const label = (match[2] || match[1]).trim().replace(/\s+/g, " ").toLowerCase();
    if (!definitions.has(label)) unresolved.push(label);
  }
  return { targets, unresolved };
}

function localTarget(from, raw) {
  if (/^(?:https?:\/\/|mailto:|\/\/)/i.test(raw)) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) throw new Error("Unsupported or nonportable link");
  let target;
  try { target = decodeURIComponent(raw.split(/[?#]/)[0]); } catch { throw new Error("Invalid link encoding"); }
  if (!target) return from;
  if (target.includes("\\") || path.posix.isAbsolute(target)) throw new Error("Link must be relative");
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(from), target));
  if (resolved === ".." || resolved.startsWith("../")) throw new Error("Link escapes the runtime");
  return resolved;
}

function validate(runtime, repository) {
  const errors = [...runtime.problems], files = runtime.files;
  const skill = files.get("SKILL.md");
  if (typeof skill !== "string") errors.push("Missing SKILL.md");
  else {
    const header = skill.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!header) errors.push("Missing or malformed YAML frontmatter");
    else {
      if (scalar(header[1], "name") !== skillName) errors.push("Frontmatter name must be " + skillName);
      const description = scalar(header[1], "description");
      if (typeof description !== "string" || !description.trim()) errors.push("Frontmatter description must be a nonempty scalar");
    }
    if (skill.trimEnd().split(/\r?\n/).length >= 500) errors.push("SKILL.md must stay under 500 lines");
    if (!header || !skill.slice(header[0].length).trim()) errors.push("SKILL.md body must be nonempty");
  }
  const ui = files.get("agents/openai.yaml");
  if (typeof ui !== "string" || !/^interface:\s*$/m.test(ui)) errors.push("Missing UI interface metadata");
  else {
    for (const key of ["display_name", "short_description", "default_prompt"]) {
      const value = scalar(ui, key, 2);
      if (typeof value !== "string" || !value.trim()) errors.push("Missing or invalid UI " + key);
      if (key === "default_prompt" && (typeof value !== "string" || !value.includes("$" + skillName))) {
        errors.push("UI default_prompt must contain $" + skillName);
      }
    }
  }
  const directReferences = new Set();
  for (const [file, content] of files) {
    if (devArtifact.test(file)) errors.push("Development or source artifact in runtime: " + file);
    if (typeof content !== "string") continue;
    if (placeholders.test(content)) errors.push("Placeholder in runtime: " + file);
    if (provenance.test(content)) errors.push("Source attribution or development marker in runtime: " + file);
    if (!file.endsWith(".md")) continue;
    const links = markdownTargets(content);
    for (const label of links.unresolved) errors.push("Undefined Markdown reference: " + file + " -> " + label);
    for (const target of links.targets) {
      try {
        const resolved = localTarget(file, target);
        if (resolved === null) continue;
        if (!files.has(resolved)) errors.push("Broken local link: " + file + " -> " + target);
        if (file === "SKILL.md") directReferences.add(resolved);
      } catch (error) {
        errors.push(error.message + ": " + file + " -> " + target);
      }
    }
  }
  for (const file of files.keys()) {
    if (file.startsWith("references/") && !directReferences.has(file)) {
      errors.push("Reference not directly linked from SKILL.md: " + file);
    }
  }
  const cases = repository.get("evals/CASES.md") || "";
  const ids = [...cases.matchAll(/^\|\s*(E\d+)\s*\|/gm)].map(match => match[1]);
  if (ids.length < 57) errors.push("Evaluation specifications must retain E01 through E57");
  for (let i = 0; i < ids.length; i++) {
    const expected = "E" + String(i + 1).padStart(2, "0");
    if (ids[i] !== expected) errors.push("Evaluation IDs must be unique and contiguous: expected " + expected + ", found " + ids[i]);
  }
  for (const file of ["README.md", "docs/RESUME.md"]) {
    const prompts = (repository.get(file) || "").split(/\r?\n/)
      .filter(line => line.startsWith("@GitHub https://github.com/dharmainsight/structural-visualization-"));
    if (prompts.length !== 1 || prompts[0] !== fixedPrompt) errors.push("Fixed resume prompt missing or changed: " + file);
  }
  if (provenance.test(repository.get("README.md") || "")) errors.push("Source attribution or development marker in README.md");
  return { errors, caseCount: ids.length, runtimeFileCount: files.size };
}

function selfTest() {
  // In-memory synthetic fixtures are checker tests, not installed skills.
  const files = new Map([
    ["SKILL.md", "---\nname: " + skillName + "\ndescription: Structure information.\n---\n# Structure\n[Guide](references/guide.md)\n"],
    ["agents/openai.yaml", 'interface:\n  display_name: "Structure"\n  short_description: "Structure information"\n  default_prompt: "Use $structural-visualization."\n'],
    ["references/guide.md", "# Guide\nPreserve known relationships.\n"],
  ]);
  const repository = new Map([
    ["evals/CASES.md", Array.from({ length: 57 }, (_, i) => "| E" + String(i + 1).padStart(2, "0") + " | Input |").join("\n")],
    ["README.md", fixedPrompt],
    ["docs/RESUME.md", fixedPrompt],
  ]);
  assert.equal(validate({ files, problems: [] }, repository).errors.length, 0, "Valid fixture rejected");
  const mutations = [
    ["broken link", f => f.set("references/guide.md", "[Missing](absent.md)"), /Broken local link/],
    ["escaping link", f => f.set("references/guide.md", "[Outside](../../README.md)"), /escapes/],
    ["source leakage", f => f.set("references/guide.md", "S01-2"), /Source attribution/],
    ["source artifact", f => f.set("references/sources.md", "# Notes"), /source artifact/],
    ["bad metadata", f => f.set("agents/openai.yaml", 'interface:\n  display_name: "Structure"\n'), /UI default_prompt/],
    ["null description", f => f.set("SKILL.md", f.get("SKILL.md").replace("description: Structure information.", "description: null")), /nonempty scalar/],
    ["undefined reference", f => f.set("references/guide.md", "[Guide][missing]"), /Undefined Markdown reference/],
    ["placeholder", f => f.set("references/guide.md", "TODO"), /Placeholder/],
    ["orphan reference", f => f.set("references/orphan.md", "# Guide"), /not directly linked/],
  ];
  for (const [name, mutate, expected] of mutations) {
    const altered = new Map(files);
    mutate(altered);
    assert.match(validate({ files: altered, problems: [] }, repository).errors.join("\n"), expected, name);
  }
  const missingCase = new Map(repository);
  missingCase.set("evals/CASES.md", missingCase.get("evals/CASES.md").replace("| E28 | Input |\n", ""));
  assert.match(validate({ files, problems: [] }, missingCase).errors.join("\n"), /contiguous/);
  assert.match(validate({ files, problems: ["Runtime contains a symlink: link"] }, repository).errors.join("\n"), /symlink/);
  console.log("Checker self-tests: 1 positive and 11 negative fixtures passed (static checks only).");
}

try {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--self-test") selfTest();
  else {
    if (args.length > 1 || args.some(arg => arg.startsWith("--"))) throw new Error("Usage: node scripts/check-skill.mjs [runtime-directory] | --self-test");
    const runtime = readRuntime(path.resolve(args[0] || path.join(repoRoot, skillName)));
    const repository = new Map(["README.md", "docs/RESUME.md", "evals/CASES.md"]
      .map(file => [file, readFileSync(path.join(repoRoot, file), "utf8")]));
    const result = validate(runtime, repository);
    if (result.errors.length) {
      console.error(result.errors.join("\n"));
      process.exitCode = 1;
    } else {
      console.log("Static skill integrity: OK (" + result.runtimeFileCount + " runtime files; " + result.caseCount + " evaluation specifications).");
      console.log("No model behavior or human comprehension result is asserted by this check.");
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
