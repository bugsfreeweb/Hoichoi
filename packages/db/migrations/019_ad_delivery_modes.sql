ALTER TABLE ad_slots ADD COLUMN delivery_mode TEXT NOT NULL DEFAULT 'both'
  CHECK (delivery_mode IN ('both', 'platform', 'house'));

INSERT OR IGNORE INTO ad_slots
  (slot_key, name, description, enabled, day_rate_bdt, house_html_enabled, delivery_mode, updated_at)
VALUES
  ('home_infeed', 'হোমপেজ ইন-ফিড', 'হোমপেজের সংবাদ গ্রিডে পর্যায়ক্রমিক HTML/Google অথবা platform ad placement.', 1, 1600, 1, 'both', datetime('now'));
