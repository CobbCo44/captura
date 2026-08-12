import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * Predefined attribute keys that brands can pick from a dropdown.
 * They can also type a custom key if none of these fit.
 */
const COMMON_KEYS = [
  { value: 'material_composition', label: 'Material Composition' },
  { value: 'country_of_origin', label: 'Country of Origin' },
  { value: 'recyclability', label: 'Recyclability' },
  { value: 'care_instructions', label: 'Care Instructions' },
  { value: 'substances_of_concern', label: 'Substances of Concern' },
  { value: 'repair_info', label: 'Repair Info' },
  { value: 'weight_grams', label: 'Weight (grams)' },
]

/** Turn "material_composition" into "Material Composition" */
function formatLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/** Show a JSONB value as readable text for the attribute list */
function displayValue(val) {
  if (val === null || val === undefined) return '—'
  if (Array.isArray(val)) return val.join(', ')
  if (typeof val === 'object') {
    return Object.entries(val)
      .map(([k, v]) => `${formatLabel(k)}: ${typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v}`)
      .join(' · ')
  }
  return String(val)
}

export default function Passport({ brand }) {
  // --- state ---
  const [products, setProducts] = useState([])         // brand's products that have a GTIN
  const [selectedGtin, setSelectedGtin] = useState('')  // which product is selected
  const [dppProduct, setDppProduct] = useState(null)    // the dpp_products row (or null)
  const [attributes, setAttributes] = useState([])      // current passport attributes
  const [loading, setLoading] = useState(true)
  const [loadingAttrs, setLoadingAttrs] = useState(false)

  // --- add/edit form state ---
  const [showForm, setShowForm] = useState(false)
  const [formKey, setFormKey] = useState('')             // selected key from dropdown
  const [customKey, setCustomKey] = useState('')         // custom key if "custom" chosen
  const [formValue, setFormValue] = useState('')         // value as text (parsed to JSON on save)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)           // { type: 'success'|'error', text }
  const [editingAttr, setEditingAttr] = useState(null)   // attribute being edited (or null for new)

  // --- load products with GTINs ---
  useEffect(() => {
    async function load() {
      if (!supabase || !brand?.id || brand.id === 'demo') {
        setProducts([])
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from('products')
        .select('id, name, gtin')
        .eq('brand_id', brand.id)
        .not('gtin', 'is', null)
        .order('name')
      setProducts((data || []).filter(p => p.gtin && p.gtin.trim()))
      setLoading(false)
    }
    load()
  }, [brand])

  // --- when a product is selected, load its passport data ---
  useEffect(() => {
    if (!selectedGtin) {
      setDppProduct(null)
      setAttributes([])
      return
    }
    loadPassport(selectedGtin)
  }, [selectedGtin])

  async function loadPassport(gtin) {
    setLoadingAttrs(true)
    setShowForm(false)
    setSaveMsg(null)

    // Normalize GTIN to 14 digits to match how it was stored
    const normalizedGtin = gtin.replace(/\D/g, '').padStart(14, '0')

    const { data: dpp } = await supabase
      .from('dpp_products')
      .select('*')
      .eq('gtin', normalizedGtin)
      .maybeSingle()

    setDppProduct(dpp)

    if (dpp) {
      const { data: attrs } = await supabase
        .from('dpp_attributes')
        .select('*')
        .eq('product_id', dpp.id)
        .eq('is_current', true)
        .order('attribute_key')
      setAttributes(attrs || [])
    } else {
      setAttributes([])
    }
    setLoadingAttrs(false)
  }

  // --- create dpp_products row if it doesn't exist yet ---
  async function ensureDppProduct(gtin) {
    if (dppProduct) return dppProduct

    const normalizedGtin = gtin.replace(/\D/g, '').padStart(14, '0')
    const product = products.find(p => p.gtin === gtin)

    const { data, error } = await supabase
      .from('dpp_products')
      .insert({
        gtin: normalizedGtin,
        brand_id: brand.id,
        product_name: product?.name || 'Product',
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    setDppProduct(data)
    return data
  }

  // --- open form to add a new attribute ---
  function openAddForm() {
    setEditingAttr(null)
    setFormKey('')
    setCustomKey('')
    setFormValue('')
    setShowForm(true)
    setSaveMsg(null)
  }

  // --- open form to edit an existing attribute ---
  function openEditForm(attr) {
    setEditingAttr(attr)
    const isCommon = COMMON_KEYS.some(k => k.value === attr.attribute_key)
    setFormKey(isCommon ? attr.attribute_key : 'custom')
    setCustomKey(isCommon ? '' : attr.attribute_key)
    // Show the value as formatted JSON text so it's editable
    const val = attr.attribute_value
    setFormValue(typeof val === 'string' ? val : JSON.stringify(val, null, 2))
    setShowForm(true)
    setSaveMsg(null)
  }

  // --- save (append-only versioned insert) ---
  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)

    const key = formKey === 'custom' ? customKey.trim().toLowerCase().replace(/\s+/g, '_') : formKey
    if (!key) {
      setSaveMsg({ type: 'error', text: 'Please select or enter an attribute key.' })
      setSaving(false)
      return
    }
    if (!formValue.trim()) {
      setSaveMsg({ type: 'error', text: 'Please enter a value.' })
      setSaving(false)
      return
    }

    // Parse the value: try JSON first, fall back to plain string
    let parsedValue
    try {
      parsedValue = JSON.parse(formValue)
    } catch {
      parsedValue = formValue.trim()
    }

    try {
      // Make sure we have a dpp_products row
      const dpp = await ensureDppProduct(selectedGtin)

      // Find the current version of this attribute (if editing or if key already exists)
      const existing = attributes.find(a => a.attribute_key === key)
      const newVersion = existing ? existing.version + 1 : 1

      // If there's an existing current row for this key, mark it as not current
      if (existing) {
        const { error: updateErr } = await supabase
          .from('dpp_attributes')
          .update({ is_current: false })
          .eq('id', existing.id)
        if (updateErr) throw new Error(updateErr.message)
      }

      // Insert the new version
      const { error: insertErr } = await supabase
        .from('dpp_attributes')
        .insert({
          product_id: dpp.id,
          attribute_key: key,
          attribute_value: parsedValue,
          version: newVersion,
          is_current: true,
        })
      if (insertErr) throw new Error(insertErr.message)

      // Update dpp_products.updated_at
      await supabase
        .from('dpp_products')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', dpp.id)

      setSaveMsg({ type: 'success', text: `Saved "${formatLabel(key)}" (v${newVersion})` })
      setShowForm(false)

      // Reload attributes
      await loadPassport(selectedGtin)
    } catch (err) {
      setSaveMsg({ type: 'error', text: `Error: ${err.message}` })
    }

    setSaving(false)
  }

  // --- get the scan domain for preview links ---
  const scanDomain = import.meta.env.VITE_SCAN_DOMAIN || window.location.origin

  // ========== RENDER ==========

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Digital Product Passport</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            DPP-ready data for EU ESPR. Attach sustainability and compliance attributes to your products.
          </p>
        </div>
      </div>

      {/* Product selector */}
      <div className="card" style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 10 }}>
          Select a Product
        </label>
        {products.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No products with a GTIN found. Add a GTIN to a product in the Products page first.
          </p>
        ) : (
          <select
            className="input"
            value={selectedGtin}
            onChange={e => setSelectedGtin(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">Choose a product...</option>
            {products.map(p => (
              <option key={p.id} value={p.gtin}>
                {p.name} ({p.gtin})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Passport content (only shown when a product is selected) */}
      {selectedGtin && (
        <>
          {loadingAttrs ? (
            <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>
              Loading passport data...
            </div>
          ) : (
            <>
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={openAddForm}>
                  + Add Attribute
                </button>
                {dppProduct && (
                  <a
                    href={`${scanDomain}/passport/${dppProduct.gtin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Preview Passport
                  </a>
                )}
              </div>

              {/* Success/error message */}
              {saveMsg && (
                <div style={{
                  padding: '12px 16px', borderRadius: 8, marginBottom: 16,
                  background: saveMsg.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${saveMsg.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
                  color: saveMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
                  fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span>{saveMsg.text}</span>
                  <button onClick={() => setSaveMsg(null)} style={{
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem',
                  }}>Dismiss</button>
                </div>
              )}

              {/* Add/Edit form */}
              {showForm && (
                <div className="card" style={{ marginBottom: 20, border: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>
                    {editingAttr ? `Update "${formatLabel(editingAttr.attribute_key)}"` : 'Add Attribute'}
                  </h3>
                  <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Attribute key selector */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                        Attribute
                      </label>
                      <select
                        className="input"
                        value={formKey}
                        onChange={e => { setFormKey(e.target.value); setCustomKey('') }}
                        style={{ width: '100%' }}
                        disabled={!!editingAttr}
                      >
                        <option value="">Choose an attribute...</option>
                        {COMMON_KEYS.map(k => (
                          <option key={k.value} value={k.value}>{k.label}</option>
                        ))}
                        <option value="custom">Custom Attribute</option>
                      </select>
                    </div>

                    {/* Custom key input (only shown when "custom" is selected) */}
                    {formKey === 'custom' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                          Custom Key
                        </label>
                        <input
                          className="input"
                          placeholder="e.g. carbon_footprint_kg"
                          value={customKey}
                          onChange={e => setCustomKey(e.target.value)}
                          style={{ width: '100%' }}
                          disabled={!!editingAttr}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          Use lowercase with underscores. Example: carbon_footprint_kg
                        </p>
                      </div>
                    )}

                    {/* Value input */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                        Value
                      </label>
                      <textarea
                        className="input"
                        value={formValue}
                        onChange={e => setFormValue(e.target.value)}
                        placeholder='Plain text, number, or JSON (e.g. ["item1", "item2"] or {"key": "value"})'
                        style={{ width: '100%', minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
                      />
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Enter plain text for simple values. For lists, use JSON array format: ["item1", "item2"].
                        For structured data, use JSON object format.
                      </p>
                    </div>

                    {/* Form actions */}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                        {saving ? 'Saving...' : editingAttr ? 'Update Attribute' : 'Add Attribute'}
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)} style={{ flex: 1 }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Current attributes list */}
              {attributes.length === 0 && !showForm ? (
                <div className="card" style={{ textAlign: 'center', padding: 60 }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>No passport data yet</div>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
                    Add attributes like material composition, country of origin, and recyclability info.
                  </p>
                  <button className="btn btn-primary" onClick={openAddForm}>+ Add First Attribute</button>
                </div>
              ) : attributes.length > 0 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Attribute', 'Value', 'Version', ''].map((h, i) => (
                          <th key={i} style={{
                            padding: '14px 20px', textAlign: 'left',
                            fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)',
                            textTransform: 'uppercase', letterSpacing: '0.5px',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {attributes.map(attr => (
                        <tr key={attr.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '14px 20px', fontWeight: 500, fontSize: '0.9rem' }}>
                            {formatLabel(attr.attribute_key)}
                          </td>
                          <td style={{
                            padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.85rem',
                            maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {displayValue(attr.attribute_value)}
                          </td>
                          <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            v{attr.version}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <button
                              onClick={() => openEditForm(attr)}
                              style={{
                                background: 'none', border: 'none', color: '#FAFAFA',
                                fontSize: '0.8rem', cursor: 'pointer',
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
