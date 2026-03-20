import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.join(__dirname, "app");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";

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

  if (request.method === "GET") {
    await serveStatic(url.pathname, response);
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}).listen(port, host, () => {
  console.log(`Interesting Practice Lab is running at http://localhost:${port}`);
});
