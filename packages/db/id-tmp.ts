import { createClient } from "@libsql/client";
const c = createClient({ url: "file:../../data/hoichoi.db" });
const r = await c.execute("SELECT id, slug FROM posts WHERE status='published' LIMIT 1");
console.log(r.rows[0]?.id ?? "");
process.exit(0);
