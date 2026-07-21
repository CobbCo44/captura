-- Delete a channel and all its batches/serials, nullifying scan references.
CREATE OR REPLACE FUNCTION delete_channel(p_channel_id UUID)
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

  SELECT ch.brand_id INTO v_brand_id
  FROM channels ch
  JOIN brands br ON br.id = ch.brand_id
  WHERE ch.id = p_channel_id
    AND br.user_id = v_user_id;

  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'Channel not found or not owned by you';
  END IF;

  -- Nullify scan references to serials in batches for this channel
  UPDATE scans SET serial_id = NULL
  WHERE serial_id IN (
    SELECT s.id FROM serials s
    JOIN batches b ON b.id = s.batch_id
    WHERE b.channel_id = p_channel_id
  );

  -- Delete serials in batches for this channel
  DELETE FROM serials
  WHERE batch_id IN (SELECT id FROM batches WHERE channel_id = p_channel_id);

  -- Delete batches for this channel
  DELETE FROM batches WHERE channel_id = p_channel_id;

  -- Delete the channel
  DELETE FROM channels WHERE id = p_channel_id;

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_channel(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_channel(UUID) TO authenticated;
