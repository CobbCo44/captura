-- Server-side aggregation for Insights tab
-- Returns pre-rolled totals so the browser never loads raw rows

CREATE OR REPLACE FUNCTION get_insights_rollup(
  p_brand_id UUID,
  p_since TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_scans', (
      SELECT COUNT(*) FROM scans
      WHERE brand_id = p_brand_id
        AND (p_since IS NULL OR scanned_at >= p_since)
    ),
    'vip_members', (
      SELECT COUNT(*) FROM vip_members
      WHERE brand_id = p_brand_id
        AND (p_since IS NULL OR joined_at >= p_since)
    ),
    'promo_entries', (
      SELECT COUNT(*) FROM promo_entries
      WHERE brand_id = p_brand_id
        AND (p_since IS NULL OR entered_at >= p_since)
    ),
    'event_entries', (
      SELECT COUNT(*) FROM event_entries
      WHERE brand_id = p_brand_id
        AND (p_since IS NULL OR entered_at >= p_since)
    ),
    'warranty_registrations', (
      SELECT COUNT(*) FROM contact_warranties cw
      JOIN contacts c ON c.id = cw.contact_id
      WHERE c.brand_id = p_brand_id
        AND (p_since IS NULL OR cw.created_at >= p_since)
    ),
    'scans_by_product', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT p.name AS product_name, COUNT(s.id) AS scan_count,
               COUNT(DISTINCT s.city) AS city_count
        FROM scans s
        LEFT JOIN products p ON p.id = s.product_id
        WHERE s.brand_id = p_brand_id
          AND (p_since IS NULL OR s.scanned_at >= p_since)
        GROUP BY p.name
        ORDER BY scan_count DESC
      ) t
    ),
    'scans_by_city', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT city, COUNT(*) AS scan_count
        FROM scans
        WHERE brand_id = p_brand_id
          AND city IS NOT NULL
          AND (p_since IS NULL OR scanned_at >= p_since)
        GROUP BY city
        ORDER BY scan_count DESC
        LIMIT 20
      ) t
    ),
    'recent_scans', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT s.scanned_at, p.name AS product_name, s.city
        FROM scans s
        LEFT JOIN products p ON p.id = s.product_id
        WHERE s.brand_id = p_brand_id
          AND (p_since IS NULL OR s.scanned_at >= p_since)
        ORDER BY s.scanned_at DESC
        LIMIT 10
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;
