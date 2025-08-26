-- Migration: 0015 - Click events tracking for analytics

CREATE TABLE IF NOT EXISTS click_events (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL,
  user_id TEXT,
  country TEXT,
  device_type TEXT,
  browser TEXT,
  referrer TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_click_events_link_id ON click_events(link_id);
CREATE INDEX IF NOT EXISTS idx_click_events_created_at ON click_events(created_at);
CREATE INDEX IF NOT EXISTS idx_click_events_country ON click_events(country);
CREATE INDEX IF NOT EXISTS idx_click_events_device ON click_events(device_type);
CREATE INDEX IF NOT EXISTS idx_click_events_browser ON click_events(browser);


