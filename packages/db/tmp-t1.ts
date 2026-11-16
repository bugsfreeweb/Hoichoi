process.env.TURSO_DATABASE_URL = "file:./.tmp-t1.db";
process.env.TURSO_AUTH_TOKEN = "local";
const { issueInvoice } = await import("./src/ad-invoices");
try {
  const inv = await issueInvoice({ clientId: "c1", subtotalBdt: 5000, createdBy: "a@b" });
  console.log(inv);
} catch (e) {
  console.log((e as Error).stack?.split("\n").slice(0,6).join("\n"));
}
