/**
 * SQL MIGRATION - Create history table
 * Run this in your Neon database to create the history table
 */

-- Create history table for tracking changes
CREATE TABLE IF NOT EXISTS history (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,  -- 'add', 'edit', 'delete'
    field_name VARCHAR(100),       -- which field was changed (optional)
    old_value TEXT,                -- previous value
    new_value TEXT,                -- new value
    changed_by VARCHAR(100),       -- username
    device_id VARCHAR(100),        -- device ID
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_history_item_name ON history(item_name);
CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_history_changed_by ON history(changed_by);

-- Example queries:

-- Get all history (latest first)
-- SELECT * FROM history ORDER BY timestamp DESC LIMIT 200;

-- Get history for specific item
-- SELECT * FROM history WHERE item_name = 'A01' ORDER BY timestamp DESC;

-- Get history by user
-- SELECT * FROM history WHERE changed_by = 'admin' ORDER BY timestamp DESC;

-- Get history by action type
-- SELECT * FROM history WHERE action = 'edit' ORDER BY timestamp DESC;
