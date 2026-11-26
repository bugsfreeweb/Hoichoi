-- Fixed editorial taxonomy.
--
-- Classification, the public nav and the desk share one list. Legacy desks stay
-- in the table (their posts keep a readable label) but are deactivated so the
-- public site no longer advertises them. Sensitive desks are explicitly moved
-- out of the public nav.

INSERT OR IGNORE INTO category_configs
  (slug, display_name_bn, display_name_en, description_bn, description_en, is_active, sort_order, config, created_at, updated_at)
VALUES
  ('startup','স্টার্টআপ','Startup','স্টার্টআপ, ফান্ডিং ও উদ্যোক্তা','Startups, funding and founders',1,14,'{"requires_double_approval":false,"auto_pending_review":false,"redaction_strict":"standard","keywords":["স্টার্টআপ","startup","ফান্ডিং","funding","বিনিয়োগ","উদ্যোক্তা","seed round","valuation"]}',datetime('now'),datetime('now')),
  ('bangladesh','বাংলাদেশ','Bangladesh','দেশজুড়ে সংবাদ','National news from Bangladesh',1,15,'{"requires_double_approval":false,"auto_pending_review":false,"redaction_strict":"standard","keywords":["বাংলাদেশ","দেশজুড়ে","জেলা","উপজেলা"]}',datetime('now'),datetime('now')),
  ('dhaka','ঢাকা','Dhaka','রাজধানীর সংবাদ','News from Dhaka',1,16,'{"requires_double_approval":false,"auto_pending_review":false,"redaction_strict":"standard","keywords":["ঢাকা","রাজধানী","ডিএমপি","সিটি করপোরেশন"]}',datetime('now'),datetime('now')),
  ('administration','প্রশাসন','Administration','সরকারি প্রশাসন ও নীতি','Public administration',1,17,'{"requires_double_approval":false,"auto_pending_review":false,"redaction_strict":"standard","keywords":["প্রশাসন","জেলা প্রশাসক","মন্ত্রণালয়","সরকারি সেবা","নীতিমালা"]}',datetime('now'),datetime('now')),
  ('transport','পরিবহণ','Transport','সড়ক, রেল ও গণপরিবহণ','Transport and mobility',1,18,'{"requires_double_approval":false,"auto_pending_review":false,"redaction_strict":"standard","keywords":["পরিবহণ","সড়ক","রেল","বাস","ট্রেন","যানজট","মেট্রো"]}',datetime('now'),datetime('now')),
  ('agriculture','কৃষি','Agriculture','কৃষি, ফসল ও কৃষক','Agriculture and farming',1,19,'{"requires_double_approval":false,"auto_pending_review":false,"redaction_strict":"standard","keywords":["কৃষি","কৃষক","ফসল","ধান","গম","সেচ","বীজ"]}',datetime('now'),datetime('now')),
  ('analysis','বিশ্লেষণ','Analysis','গভীর বিশ্লেষণ ও ব্যাখ্যা','Analysis and explainers',1,20,'{"requires_double_approval":false,"auto_pending_review":false,"redaction_strict":"standard","keywords":["বিশ্লেষণ","ব্যাখ্যা","পর্যালোচনা"]}',datetime('now'),datetime('now')),
  ('social-media','সোশ্যাল মিডিয়া','Social media','প্ল্যাটফর্ম ও অনলাইন আলোচনা','Platforms and online conversations',1,21,'{"requires_double_approval":false,"auto_pending_review":true,"redaction_strict":"standard","keywords":["ফেসবুক","সোশ্যাল মিডিয়া","টিকটক","ইনস্টাগ্রাম","ভাইরাল","পোস্ট"]}',datetime('now'),datetime('now')),
  ('live-events','লাইভ ইভেন্ট','Live events','লাইভ কভারেজ ও ঘটনাপ্রবাহ','Live coverage',1,22,'{"requires_double_approval":false,"auto_pending_review":false,"redaction_strict":"standard","keywords":["লাইভ","ইভেন্ট","কভারেজ"]}',datetime('now'),datetime('now')),
  ('opinion-polls','জনমত ও ভোট','Polls & opinion','জরিপ, ভোট ও জনমত','Polls and public opinion',1,23,'{"requires_double_approval":false,"auto_pending_review":false,"redaction_strict":"standard","keywords":["জরিপ","ভোট","জনমত","সার্ভে"]}',datetime('now'),datetime('now'));

-- Names that changed to match the fixed taxonomy.
UPDATE category_configs SET display_name_bn='অর্থনীতি ও ব্যবসা', display_name_en='Economy & business' WHERE slug='economy';
UPDATE category_configs SET display_name_bn='প্রযুক্তি', display_name_en='Technology' WHERE slug='technology';
UPDATE category_configs SET display_name_bn='পরিবেশ ও জলবায়ু', display_name_en='Environment & climate' WHERE slug='environment';
UPDATE category_configs SET display_name_bn='অন্যান্য', display_name_en='Other' WHERE slug IN ('misc','uncategorized');

-- Public nav: only the fixed desks. Legacy rows keep their labels for old posts.
UPDATE category_configs SET is_active = 0
 WHERE slug NOT IN (
  'politics','economy','technology','ai','startup','international','bangladesh','dhaka',
  'education','health','sports','entertainment','lifestyle','environment','law-order',
  'crime','corruption','administration','transport','agriculture','opinion','analysis',
  'social-media','live-events','opinion-polls','misc'
 );

-- Sensitive desks previously auto-published. Move live rows back to review; they
-- are not deleted and keep their audit history.
UPDATE posts SET status='pending_review', published_at=NULL, is_feature_eligible=0
 WHERE status='published' AND category IN ('child-sexual-abuse','extramarital-crime','missing-children');
