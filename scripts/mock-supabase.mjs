// Local stand-in for Supabase's REST API, for `npm run test:devices` (no real database needed).
// Usage: node scripts/mock-supabase.mjs [port=3199], then start the site with
//   SUPABASE_URL=http://localhost:3199 SUPABASE_PUBLISHABLE_KEY=test-key
// POST /rest/v1/messages → 201 (checks the apikey header, Prefer: return=minimal, the JSON body).
//   A message containing "[mock:rate-limit]" gets the rate-limit trigger's error instead.
// GET /_received → the bodies accepted so far.
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 3199);
const received = [];

createServer((req, res) => {
  const send = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(body === undefined ? "" : JSON.stringify(body));
  };
  if (req.method === "GET" && req.url === "/_received") return send(200, received);
  if (req.method !== "POST" || req.url !== "/rest/v1/messages") return send(404, { message: "not found" });

  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    if (!req.headers.apikey) return send(401, { message: "No API key found in request" });
    if (req.headers.prefer !== "return=minimal")
      return send(400, { message: "mock: expected Prefer: return=minimal (anon cannot select)" });
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return send(400, { message: "mock: body is not JSON" });
    }
    const keys = Object.keys(body).sort().join(",");
    if (keys !== "email,message,name,sender_hash")
      return send(400, { message: `mock: unexpected columns ${keys} (anon may insert name, email, message, sender_hash)` });
    if (String(body.message).includes("[mock:rate-limit]"))
      return send(400, { code: "P0001", details: null, hint: null, message: "rate_limited" });
    const { sender_hash, ...message } = body; // a hashed IP (or null locally), not part of the message
    if (sender_hash !== null && !/^[0-9a-f]{32}$/.test(sender_hash))
      return send(400, { message: "mock: sender_hash must be null or 32 hex characters" });
    received.push(message);
    send(201);
  });
}).listen(port, () => console.log(`mock supabase on http://localhost:${port}`));
