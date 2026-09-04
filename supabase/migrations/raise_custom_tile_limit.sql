-- Raise the active custom tile cap from 3 to 6 per brand.
CREATE OR REPLACE FUNCTION enforce_custom_tile_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active THEN
    IF (SELECT COUNT(*) FROM custom_tiles
        WHERE brand_id = NEW.brand_id AND is_active = true AND id <> NEW.id) >= 6 THEN
      RAISE EXCEPTION 'You can have at most 6 active custom tiles. Deactivate one first.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
