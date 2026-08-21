-- Custom subject + message body per autopilot flow, per brand.
-- NULL means "use the default". Placeholders: {store}, {name}, {points}, {reward}

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS autopilot_reward_subject TEXT,
  ADD COLUMN IF NOT EXISTS autopilot_reward_message TEXT,
  ADD COLUMN IF NOT EXISTS autopilot_welcome_subject TEXT,
  ADD COLUMN IF NOT EXISTS autopilot_welcome_message TEXT,
  ADD COLUMN IF NOT EXISTS autopilot_winback_subject TEXT,
  ADD COLUMN IF NOT EXISTS autopilot_winback_message TEXT;
