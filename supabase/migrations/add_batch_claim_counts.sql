-- Claimed/total counts per batch, counted in the database. The dashboard used
-- to download every serial to count them, which breaks past 1,000 codes.
-- SECURITY INVOKER: the caller's own row-level security decides what they see.

CREATE INDEX IF NOT EXISTS serials_batch_status_idx ON serials (batch_id, status);

CREATE OR REPLACE FUNCTION batch_claim_counts(p_brand_id UUID)
RETURNS TABLE (batch_id UUID, total BIGINT, claimed BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT s.batch_id,
         count(*) AS total,
         count(*) FILTER (WHERE s.status = 'claimed') AS claimed
  FROM serials s
  JOIN batches b ON b.id = s.batch_id
  WHERE b.brand_id = p_brand_id
  GROUP BY s.batch_id;
$$;

REVOKE EXECUTE ON FUNCTION batch_claim_counts(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION batch_claim_counts(UUID) TO authenticated;
