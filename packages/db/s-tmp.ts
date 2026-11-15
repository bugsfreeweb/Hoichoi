import { createClient } from "@libsql/client";
const c = createClient({ url: "file:../../data/hoichoi.db" });
const r = await c.execute("SELECT slug, verification_status FROM posts WHERE id = 'demo-dbb13dfa-c102-4712-8a46-d35a05e39136'");
console.log((r.rows[0] as any).slug, (r.rows[0] as any).verification_status);
process.exit(0);
