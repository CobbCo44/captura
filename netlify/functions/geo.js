export default async (req, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  }

  // Netlify injects geo data from its edge network — free, unlimited, no API key
  const geo = context?.geo || {}

  if (geo.city) {
    return new Response(JSON.stringify({
      lat: parseFloat(geo.latitude) || null,
      lng: parseFloat(geo.longitude) || null,
      city: geo.city,
      region: geo.subdivision?.code || geo.subdivision?.name || null,
      country: geo.country?.code || null,
    }), { status: 200, headers })
  }

  // Fallback: try ipapi.co then ip-api.com
  try {
    const res = await fetch('https://ipapi.co/json/')
    const data = await res.json()
    if (data && data.city && !data.error) {
      return new Response(JSON.stringify({
        lat: data.latitude,
        lng: data.longitude,
        city: data.city,
        region: data.region_code || data.region,
        country: data.country_code,
      }), { status: 200, headers })
    }
  } catch { /* fall through */ }

  try {
    const res = await fetch('https://ip-api.com/json/?fields=status,lat,lon,city,region,countryCode')
    const data = await res.json()
    if (data && data.status === 'success' && data.city) {
      return new Response(JSON.stringify({
        lat: data.lat,
        lng: data.lon,
        city: data.city,
        region: data.region,
        country: data.countryCode,
      }), { status: 200, headers })
    }
  } catch { /* fall through */ }

  return new Response(JSON.stringify({
    lat: null, lng: null, city: null, region: null, country: null,
  }), { status: 200, headers })
}
