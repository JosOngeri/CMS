-- Migration 072: payment_receipt_counters + document_tags
--
-- payment_receipt_counters: per-church per-day sequence for atomic receipt
--   numbering (ManualPaymentRepository.getNextReceiptSequence — replaces the
--   racy getTodayPaymentCount + 1 read-then-write).
--
-- document_tags: junction table mirroring documents.tags so tag lookups are
--   index-assisted instead of LIKE scans (DocumentsRepository._syncDocumentTags).

CREATE TABLE IF NOT EXISTS payment_receipt_counters (
  church_id    UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  receipt_date DATE NOT NULL,
  seq          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (church_id, receipt_date)
);

CREATE TABLE IF NOT EXISTS document_tags (
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  church_id   UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  tag         VARCHAR(100) NOT NULL,
  PRIMARY KEY (document_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_document_tags_church_tag
  ON document_tags (church_id, tag);

-- documents.tags diverged across environments: jsonb on some DBs, TEXT on
-- others. Backfill branch on the real column type — jsonb arrays expand
-- element-wise; TEXT splits on commas (JSON-array-looking text gets its
-- brackets/quotes trimmed so both legacy forms yield clean tags).
DO $$
DECLARE ttype TEXT;
BEGIN
  SELECT data_type INTO ttype FROM information_schema.columns
   WHERE table_name = 'documents' AND column_name = 'tags';
  IF ttype = 'jsonb' THEN
    INSERT INTO document_tags (document_id, church_id, tag)
    SELECT d.id, d.church_id, TRIM(t.tag)
    FROM documents d
    CROSS JOIN LATERAL jsonb_array_elements_text(d.tags) AS t(tag)
    WHERE d.tags IS NOT NULL
      AND jsonb_typeof(d.tags) = 'array'
      AND TRIM(t.tag) <> ''
    ON CONFLICT (document_id, tag) DO NOTHING;
  ELSE
    INSERT INTO document_tags (document_id, church_id, tag)
    SELECT d.id, d.church_id, TRIM(BOTH '[]" ' FROM t.tag)
    FROM documents d
    CROSS JOIN LATERAL unnest(string_to_array(d.tags, ',')) AS t(tag)
    WHERE d.tags IS NOT NULL
      AND TRIM(BOTH '[]" ' FROM t.tag) <> ''
    ON CONFLICT (document_id, tag) DO NOTHING;
  END IF;
END $$;
