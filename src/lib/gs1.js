/**
 * gs1.js — GS1 Digital Link support for Captura
 * ------------------------------------------------------------------
 * WHY THIS EXISTS (plain English):
 * By end-2027 (GS1 "Sunrise 2027"), US retail checkout systems must read
 * 2D barcodes, and major retailers (Walmart, Tesco, Kroger, Target...) are
 * already requiring them ahead of that date. A plain marketing QR that points
 * at a website WILL NOT scan at checkout. The code on the box must be a
 * GS1 Digital Link URI built around the product's GTIN (the licensed product
 * number behind every UPC).
 *
 * Captura does NOT put its own second code on the box. Instead, the brand's
 * single GS1 code resolves (via the brand's resolver) to Captura as the
 * consumer-experience destination. So Captura must:
 *   1) accept and correctly PARSE a GS1 Digital Link URL (extract GTIN, lot,
 *      serial, expiry) — this identifies the exact product scanned, and
 *   2) be able to BUILD spec-correct GS1 Digital Link URLs (for demos, test
 *      codes, and any codes a brand asks Captura to generate on their domain).
 *
 * The GTIN becomes Captura's product key. `scan_code` in the consent record
 * is derived from the GTIN (+ serial/lot if present), NOT an arbitrary string.
 * ------------------------------------------------------------------
 */

// GS1 Application Identifiers we care about, mapped to friendly names.
// (Full AI list is large; these cover retail consumer use.)
export const AI_NAMES = {
  "01": "gtin",     // Global Trade Item Number (the product) — primary key
  "8006": "itip",   // component/piece
  "414": "gln",     // Global Location Number
  "255": "gcn",     // Global Coupon Number
  "00": "sscc",     // logistics unit
  "253": "gdti",    // document
  "8010": "cpid",   // company internal
  // qualifiers / attributes that refine WHICH item was scanned:
  "21": "serial",   // serial number (unique unit)
  "10": "lot",      // batch / lot
  "17": "expiry",   // expiration date (YYMMDD)
  "11": "prodDate", // production date
  "7003": "expiryTime",
}

// The GS1 "primary keys" that may legally start the path.
const PRIMARY_KEYS = new Set(["01", "8006", "414", "255", "00", "253", "8010"])

/**
 * Parse a GS1 Digital Link URL into its parts.
 * Returns { valid, gtin, primaryAI, qualifiers, query, host, reason? }.
 *
 * Accepts spec forms like:
 *   https://id.brand.com/01/09312345678907
 *   https://brand.com/01/12345678901231/21/XYZ/10/ABCD/17/240101
 * Rejects plain marketing URLs (no GS1 key in the path).
 */
export function parseGS1DigitalLink(input) {
  let u
  try { u = new URL(input) } catch { return { valid: false, reason: "not a URL" } }

  const seg = u.pathname.split("/").filter(Boolean)
  if (seg.length < 2 || !PRIMARY_KEYS.has(seg[0])) {
    return { valid: false, reason: "no primary GS1 key (e.g. /01/<gtin>) in path" }
  }

  const primaryAI = seg[0]
  let gtin = null
  if (primaryAI === "01") {
    const raw = (seg[1] || "").replace(/\D/g, "")
    if (raw.length < 8 || raw.length > 14) {
      return { valid: false, reason: "GTIN must be 8–14 digits" }
    }
    gtin = raw.padStart(14, "0") // spec v1.4+: express GTIN as 14 digits
  }

  const qualifiers = {}
  for (let i = 2; i + 1 < seg.length; i += 2) {
    const name = AI_NAMES[seg[i]] || seg[i]
    qualifiers[name] = decodeURIComponent(seg[i + 1])
  }

  const query = {}
  for (const [k, v] of u.searchParams) query[k] = v

  return { valid: true, gtin, primaryAI, qualifiers, query, host: u.host }
}

/**
 * Build a spec-correct GS1 Digital Link URL.
 * domain: the brand's resolver domain, e.g. "https://id.brand.com"
 * gtin:   any GTIN/UPC (8–14 digits) — auto zero-padded to 14
 * opts:   { lot, serial, expiry, linkType }
 *
 * NOTE: the on-pack code and resolver are OWNED BY THE BRAND. Captura builds
 * these only for demos/tests or when a brand explicitly delegates code
 * generation. Captura never invents GTINs — those are licensed from GS1.
 */
export function buildGS1DigitalLink(domain, gtin, opts = {}) {
  const g14 = String(gtin).replace(/\D/g, "").padStart(14, "0")
  if (g14.length !== 14) throw new Error("invalid GTIN")
  let path = "/01/" + g14
  if (opts.lot) path += "/10/" + encodeURIComponent(opts.lot)
  if (opts.serial) path += "/21/" + encodeURIComponent(opts.serial)
  if (opts.expiry) path += "/17/" + encodeURIComponent(opts.expiry)
  const url = new URL(domain.replace(/\/$/, "") + path)
  if (opts.linkType) url.searchParams.set("linkType", opts.linkType)
  return url.toString()
}

/**
 * Turn a parsed scan into Captura's internal product key (scan_code).
 * GTIN identifies the product; serial (if present) identifies the exact unit.
 * This is what gets stored on the consent record so the capture is tied to
 * the specific product/unit that was scanned.
 */
export function scanKeyFromParsed(parsed) {
  if (!parsed.valid || !parsed.gtin) return null
  return parsed.qualifiers.serial
    ? `gtin:${parsed.gtin}|ser:${parsed.qualifiers.serial}`
    : `gtin:${parsed.gtin}`
}
