-- Slot inventory expansion to match the ad-management mockup.
--
-- The mockup defines 20 placements across home, article, category and global
-- chrome. Only five were seeded, so most of the mockup's inventory had no row
-- and therefore could not be booked, priced or reported on.
--
-- These eleven are inserted with delivery_mode='platform': they render only a
-- real booking, never the house placeholder. Empty reserved boxes on every
-- article would be worse than no slot, and an operator who wants the house
-- fallback can flip the mode per slot in /admin/ads/slots.
INSERT OR IGNORE INTO ad_slots
  (slot_key, name, description, enabled, day_rate_bdt, house_html_enabled, delivery_mode, updated_at)
VALUES
  ('home_lead_sponsor',    'হোম লিড স্পনসর',        'হোমপেজের প্রধান সংবাদের ঠিক নিচে নেটিভ স্পনসর সারি।', 1, 3200, 0, 'platform', datetime('now')),
  ('home_feed_1',          'হোম ফিড · প্রথম',       'হোমপেজের সাম্প্রতিক গ্রিডে প্রথম ইন-ফিড বিজ্ঞাপন।',     1, 2000, 0, 'platform', datetime('now')),
  ('home_feed_2',          'হোম ফিড · দ্বিতীয়',     'হোমপেজের সাম্প্রতিক গ্রিডে দ্বিতীয় ইন-ফিড বিজ্ঞাপন।',   1, 1800, 0, 'platform', datetime('now')),
  ('post_inarticle',       'আর্টিকেল ইন-বডি',       'প্রতিবেদনের অনুচ্ছেদের মাঝে ৩৩৬×২৮০ ইন-বডি ইউনিট।',   1, 2600, 0, 'platform', datetime('now')),
  ('post_endcap',          'আর্টিকেল এন্ডক্যাপ',    'প্রতিবেদন শেষে, মন্তব্যের আগে বিলবোর্ড ইউনিট।',        1, 2400, 0, 'platform', datetime('now')),
  ('post_related_infeed',  'সম্পর্কিত · ইন-ফিড',    '“একই বিভাগে আরও” গ্রিডের ভেতরে ইন-ফিড ইউনিট।',          1, 1400, 0, 'platform', datetime('now')),
  ('post_sidebar_sticky',  'আর্টিকেল স্টিকি সাইড',  'আর্টিকেল সাইডবারে স্ক্রলজুড়ে থাকা হাফ-পেজ ইউনিট।',    1, 2600, 0, 'platform', datetime('now')),
  ('category_top_leaderboard', 'বিভাগ · টপ ব্যানার', 'বিভাগ পেজের শিরোনামের নিচে লিডারবোর্ড।',               1, 1800, 0, 'platform', datetime('now')),
  ('category_infeed',      'বিভাগ · ইন-ফিড',       'বিভাগ পেজের গ্রিডে ইন-ফিড ইউনিট।',                    1, 1500, 0, 'platform', datetime('now')),
  ('global_footer_strip',  'গ্লোবাল ফুটার স্ট্রিপ', 'প্রতিটি পেজের ফুটারের উপরে ব্র্যান্ডেড স্ট্রিপ।',       1,  800, 0, 'platform', datetime('now')),
  ('global_mobile_anchor', 'মোবাইল অ্যাঙ্কর',       'মোবাইলে নিচে আটকে থাকা ৩২০×৬০ ইউনিট (শুধু ছোট স্ক্রিনে)।', 1, 1200, 0, 'platform', datetime('now'));
