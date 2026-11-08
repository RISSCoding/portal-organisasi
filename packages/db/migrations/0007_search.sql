-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Full-Text Search for Tasks and Documents

-- 1. Tambahkan kolom search_vector ke tasks
ALTER TABLE tasks ADD COLUMN search_vector tsvector 
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))) STORED;

CREATE INDEX tasks_search_idx ON tasks USING GIN (search_vector);

-- 2. Tambahkan kolom search_vector ke documents
ALTER TABLE documents ADD COLUMN search_vector tsvector 
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))) STORED;

CREATE INDEX documents_search_idx ON documents USING GIN (search_vector);
