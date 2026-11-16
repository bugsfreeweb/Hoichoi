-- Invoices and payments, captured by hand.
--
-- There is no payment gateway. An invoice exists because an operator issued it,
-- and money exists because an operator recorded receiving it. Nothing here can
-- mark itself paid, which is the only honest shape for a desk that takes bank
-- transfers and bKash by hand.
--
-- Void is a flag, never a delete: an invoice number that once existed must keep
-- existing, or two records disagree about the same money.

CREATE TABLE IF NOT EXISTS ad_invoice_counters (
  year INTEGER PRIMARY KEY,
  next_no INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ad_invoices (
  id TEXT PRIMARY KEY,
  invoice_no TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  booking_id TEXT,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'paid', 'void')),
  issued_at TEXT NOT NULL,
  due_at TEXT,
  subtotal_bdt INTEGER NOT NULL,
  vat_bdt INTEGER NOT NULL DEFAULT 0,
  total_bdt INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BDT',
  notes TEXT,
  void_reason TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ad_invoices_client ON ad_invoices (client_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_invoices_booking ON ad_invoices (booking_id);
CREATE INDEX IF NOT EXISTS idx_ad_invoices_status ON ad_invoices (status, issued_at DESC);

CREATE TABLE IF NOT EXISTS ad_payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  amount_bdt INTEGER NOT NULL CHECK (amount_bdt > 0),
  method TEXT NOT NULL CHECK (method IN ('bank_transfer', 'bkash', 'nagad', 'cash', 'cheque', 'other')),
  reference TEXT,
  received_at TEXT NOT NULL,
  recorded_by TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ad_payments_invoice ON ad_payments (invoice_id, received_at DESC);
-- One payment record per (invoice, reference): the same bank transfer entered
-- twice is a bookkeeping error, and the second insert should fail loudly.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_payments_reference
  ON ad_payments (invoice_id, reference) WHERE reference IS NOT NULL;
