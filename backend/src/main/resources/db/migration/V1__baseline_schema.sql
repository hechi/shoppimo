-- Baseline schema.
--
-- The schema used to be created at startup by Exposed (createMissingTablesAndColumns), so
-- existing databases already contain these tables. Every statement is idempotent, which lets
-- this migration run on a fresh database (creates everything) and on an existing one
-- (changes nothing, or adds columns and indexes that an older version of the app never created).

CREATE TABLE IF NOT EXISTS shopping_lists (
    id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    alias VARCHAR(64),
    CONSTRAINT shopping_lists_pkey PRIMARY KEY (id)
);

ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS alias VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS uq_shopping_lists_alias ON shopping_lists (alias);

CREATE TABLE IF NOT EXISTS list_items (
    id UUID NOT NULL,
    list_id UUID NOT NULL,
    text VARCHAR(500) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    item_order INTEGER NOT NULL,
    CONSTRAINT list_items_pkey PRIMARY KEY (id),
    CONSTRAINT fk_list_items_list_id__id FOREIGN KEY (list_id) REFERENCES shopping_lists (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_list_items_list_id ON list_items (list_id);
CREATE INDEX IF NOT EXISTS idx_list_items_order ON list_items (list_id, item_order);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID NOT NULL,
    list_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT fk_push_subscriptions_list_id__id FOREIGN KEY (list_id) REFERENCES shopping_lists (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_list_id_unique ON push_subscriptions (endpoint, list_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_list_id ON push_subscriptions (list_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_endpoint ON push_subscriptions (endpoint);
