import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.join(__dirname, "app");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const obsidianVaultPath = process.env.OBSIDIAN_VAULT_PATH || "C:\\Users\\wangh\\Desktop\\Obsidian Vault";
const maxVaultTermLength = Number(process.env.OBSIDIAN_MAX_TERM_LENGTH || 6);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

function getContentType(filePath) {
  if (filePath.endsWith(".webmanifest")) {
    return "application/manifest+json; charset=utf-8";
  }

  const extension = path.extname(filePath);
  return mimeTypes[extension] || "application/octet-stream";
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function normalizeVaultTerm(rawTerm) {
  const trimmed = String(rawTerm || "").trim();
  if (!trimmed) {
    return "";
  }

  const aliasTerm = trimmed.includes("|") ? trimmed.split("|").pop() : trimmed;
  const headingless = aliasTerm.split("#")[0].trim();
  const plain = headingless.replace(/\.md$/i, "").trim();

  if (!plain) {
    return "";
  }

  if (plain.includes("/") || plain.includes("\\")) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(plain)) {
    return "";
  }

  if (/^[\d\s\-_/.:]+$/.test(plain)) {
    return "";
  }

  if (/[<>[\]{}]/.test(plain)) {
    return "";
  }

  if (Array.from(plain).length > maxVaultTermLength) {
    return "";
  }

  return plain;
}

async function collectMarkdownFiles(dirPath, collector = []) {
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await collectMarkdownFiles(fullPath, collector);
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(".md")) {
      collector.push(fullPath);
    }
  }

  return collector;
}

async function readVaultTerms() {
  try {
    const markdownFiles = await collectMarkdownFiles(obsidianVaultPath);
    const counts = new Map();
    const matchesPattern = /\[\[(.+?)\]\]/g;

    for (const filePath of markdownFiles) {
      const content = await readFile(filePath, "utf8");

      for (const match of content.matchAll(matchesPattern)) {
        const candidate = normalizeVaultTerm(match[1]);
        if (!candidate) {
          continue;
        }

        counts.set(candidate, (counts.get(candidate) || 0) + 1);
      }
    }

    const terms = [...counts.entries()]
      .sort((left, right) => {
        if (right[1] !== left[1]) {
          return right[1] - left[1];
        }
        return left[0].localeCompare(right[0], "zh-CN");
      })
      .map(([term]) => term);

    return {
      ok: true,
      path: obsidianVaultPath,
      totalFiles: markdownFiles.length,
      totalTerms: terms.length,
      terms
    };
  } catch (error) {
    return {
      ok: false,
      path: obsidianVaultPath,
      totalFiles: 0,
      totalTerms: 0,
      terms: [],
      error: error instanceof Error ? error.message : "Failed to read vault terms"
    };
  }
}

async function serveStatic(requestPath, response) {
  const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.join(appDir, normalizedPath);

  if (!filePath.startsWith(appDir)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": getContentType(filePath)
    });
    response.end(content);
  } catch {
    sendJson(response, 404, { error: "Not found" });
  }
}

async function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function handleGenerate(request, response) {
  try {
    const rawBody = await readRequestBody(request);
    const payload = JSON.parse(rawBody || "{}");
    const { config = {}, messages = [], temperature = 0.9 } = payload;
    const { apiKey, baseUrl, model } = config;

    if (!apiKey || !baseUrl || !model) {
      sendJson(response, 400, {
        error: "Missing config. Please fill in base URL, model, and API key."
      });
      return;
    }

    const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
    const upstream = await fetch(`${normalizedBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature,
        messages
      })
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      sendJson(response, upstream.status, {
        error: data.error?.message || "Upstream model request failed.",
        raw: data
      });
      return;
    }

    const text = data.choices?.[0]?.message?.content?.trim();
    sendJson(response, 200, { text: text || "" });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Unknown server error"
    });
  }
}

async function handleVaultTerms(response) {
  const payload = await readVaultTerms();
  sendJson(response, 200, payload);
}

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { ok: true, port });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/generate") {
    await handleGenerate(request, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/obsidian-terms") {
    await handleVaultTerms(response);
    return;
  }

  if (request.method === "GET") {
    await serveStatic(url.pathname, response);
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}).listen(port, host, () => {
  console.log(`Interesting Practice Lab is running at http://localhost:${port}`);
});
