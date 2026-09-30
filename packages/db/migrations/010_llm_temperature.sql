-- Rewrite sampling temperature.
--
-- The desk has always shown a temperature slider, but the value lived only in
-- localStorage while every provider hardcoded 0.3. The control looked live and
-- did nothing, which is worse than not offering it: an operator raising the
-- slider for a noisy source had no effect and no error.
--
-- Persist the preference on the settings row so the desktop slider, the web
-- admin, and the scheduled GitHub Actions run all read the same number. The
-- providers clamp to [0, 1] and fall back to 0.3, so a bad value degrades to the
-- previous behaviour instead of failing a run.
ALTER TABLE settings ADD COLUMN llm_temperature REAL;

-- Preserve the historical hardcoded value for existing deployments.
UPDATE settings SET llm_temperature = 0.3 WHERE llm_temperature IS NULL;

-- Fact-gate threshold, as a whole percent. The desk has always shown a
-- threshold slider labelled 0.70-0.99, but the value never left localStorage and
-- the pipeline had no concept of it. Store it so a raised threshold actually
-- holds low-confidence classifier matches for review.
ALTER TABLE settings ADD COLUMN fact_gate REAL;

UPDATE settings SET fact_gate = 90 WHERE fact_gate IS NULL;
