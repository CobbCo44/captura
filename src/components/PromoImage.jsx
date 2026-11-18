// Promo background image, shared by the promo editor preview and the scan pages
// so what owners see while editing is what customers see.
// position: a CSS background-position like "50% 30%", or 'fit' to show the
// whole image (letterboxed over a blurred copy) instead of cropping to fill.

export const FIT_WHOLE = 'fit'

export default function PromoImage({ url, position }) {
  if (!url) return null
  if (position === FIT_WHOLE) {
    return (
      <>
        <div style={{
          position: 'absolute', inset: -20, backgroundImage: `url(${url})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(18px) brightness(0.55)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, backgroundImage: `url(${url})`,
          backgroundSize: 'contain', backgroundPosition: 'center 35%', backgroundRepeat: 'no-repeat',
        }} />
      </>
    )
  }
  return (
    <div style={{
      position: 'absolute', inset: 0, backgroundImage: `url(${url})`,
      backgroundSize: 'cover', backgroundPosition: position || 'center',
    }} />
  )
}
