-- L772: unify the approval_requests requester columns.
-- PaymentRepository historically wrote `requested_by` while
-- ApprovalsRepository/MobileRepository read `requester_id`, which hid those
-- approval rows from the approval queue. Both columns are kept for schema
-- compat (the index on requested_by is retained); new writes populate both.
UPDATE approval_requests
SET requester_id = requested_by
WHERE requester_id IS NULL AND requested_by IS NOT NULL;

UPDATE approval_requests
SET requested_by = requester_id
WHERE requested_by IS NULL AND requester_id IS NOT NULL;
