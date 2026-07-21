-- Delete a batch and its serials, nullifying any scan references first.
-- Must be SECURITY DEFINER to bypass RLS on scans (no UPDATE policy).
CREATE OR REPLACE FUNCTION delete_batch(p_batch_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_id UUID;
  v_user_id UUID;
BEGIN
  SELECT auth.uid() INTO v_user_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the batch belongs to the authenticated user's brand
  SELECT b.brand_id INTO v_brand_id
  FROM batches b
  JOIN brands br ON br.id = b.brand_id
  WHERE b.id = p_batch_id
    AND br.user_id = v_user_id;

  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'Batch not found or not owned by you';
  END IF;

  -- Nullify scan references to serials in this batch
  UPDATE scans SET serial_id = NULL
  WHERE serial_id IN (SELECT id FROM serials WHERE batch_id = p_batch_id);

  -- Delete serials (now safe, no FK references remain)
  DELETE FROM serials WHERE batch_id = p_batch_id;

  -- Delete the batch
  DELETE FROM batches WHERE id = p_batch_id;

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_batch(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_batch(UUID) TO authenticated;
