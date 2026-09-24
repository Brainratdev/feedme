// Minimal Chrome DevTools driver: opens a page in headless Chrome, evaluates JS, returns the result.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export async function withPage(url, fn, { width = 1200, height = 900 } = {}) {
  const port = 9300 + Math.floor(Math.random() * 500);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "feedme-chrome-"));
  const chrome = spawn(CHROME, [
    "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    "--no-first-run", "--autoplay-policy=no-user-gesture-required", `--window-size=${width},${height}`,
    "--allow-file-access-from-files", url,
  ], { stdio: "ignore" });
  try {
    let target;
    for (let i = 0; i < 100 && !target; i++) {
      await new Promise((r) => setTimeout(r, 150));
      try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page"); } catch {}
    }
    if (!target) throw new Error("Chrome did not start");
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const pending = new Map();
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
    const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    const evaluate = async (expression) => {
      const d = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (d.result?.exceptionDetails) throw new Error(d.result.exceptionDetails.exception?.description || JSON.stringify(d.result.exceptionDetails));
      return d.result?.result?.value;
    };
    await send("Runtime.enable");
    return await fn(evaluate);
  } finally {
    const exited = new Promise((r) => chrome.once("exit", r));
    chrome.kill("SIGKILL");
    await exited;
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
  }
}
