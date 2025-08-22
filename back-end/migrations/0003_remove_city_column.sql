-- Migration number: 0003 	 2025-01-XX
-- Remove city column from analytics_events table

-- Create new table without city column
CREATE TABLE IF NOT EXISTS analytics_events_new (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  referer TEXT,
  country TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
);

-- Copy data from old table to new table (excluding city column)
INSERT INTO analytics_events_new (id, link_id, timestamp, ip_address, user_agent, referer, country, device_type, browser, os)
SELECT id, link_id, timestamp, ip_address, user_agent, referer, country, device_type, browser, os
FROM analytics_events;

-- Drop old table
DROP TABLE analytics_events;

-- Rename new table to original name
ALTER TABLE analytics_events_new RENAME TO analytics_events;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_analytics_link_id ON analytics_events(link_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp);

