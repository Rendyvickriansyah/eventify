import { cn } from '@/lib/cn'
import visaLogo from '@/assets/icons/visa-logo.svg'
import visaLogoSmall from '@/assets/icons/visa-logo-small.svg'
import mcLeft from '@/assets/icons/mastercard-left.svg'
import mcRight from '@/assets/icons/mastercard-right.svg'
import mcTm from '@/assets/icons/mastercard-tm.svg'

/* Figma geometry (px) for each layer, relative to its logo box */
const layer = (src, left, top, width, height) => ({ src, left, top, width, height })

/**
 * 40px round payment-brand avatar — Figma Payout Account rows (nodes 199:16097, 199:16112).
 * Visa: #0742a6 disc, 26.667×7.5 wordmark inside a centred 32×24 box (8.33% / 33.33% insets).
 * Mastercard: gray-50 disc, 21.392×14.651 logo (orange overlap rect + two circles + TM),
 * inside a 1px / 4px padded box.
 *
 * @param {{ brand: 'visa' | 'mastercard', className?: string }} props
 */
export function CardBrandLogo({ brand, className }) {
  const label = brand === 'visa' ? 'Visa' : 'Mastercard'
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        'relative block size-10 shrink-0 overflow-hidden rounded-full',
        brand === 'visa' ? 'border border-default bg-[#0742a6]' : 'border-[0.941px] border-black/8 bg-gray-50',
        className,
      )}
    >
      {brand === 'visa' ? (
        <span className="absolute top-1/2 left-1/2 h-6 w-8 -translate-1/2">
          <Layer {...layer(visaLogo, 2.667, 8, 26.667, 7.5)} />
        </span>
      ) : (
        <span className="absolute top-1/2 left-1/2 box-content h-[14.651px] w-[21.392px] -translate-1/2 px-px py-1">
          <span className="relative block size-full">
            <span aria-hidden className="absolute bg-[#ff5f00]" style={{ left: 7.88, top: 2.55, width: 5.643, height: 9.544 }} />
            <Layer {...layer(mcLeft, 1.21, 1.26, 9.483, 12.139)} />
            <Layer {...layer(mcTm, 19.51, 10.85, 0.537, 0.479)} />
            <Layer {...layer(mcRight, 10.7, 1.25, 9.484, 12.14)} />
          </span>
        </span>
      )}
    </span>
  )
}

/**
 * 32 × 24 card-brand chip — Figma "Visa" in the payout success summary (node 209:17668):
 * black/10 border, radius 6, 21.333 × 8 wordmark centred. Mastercard uses the same chip with
 * its logo layers at 0.8 scale.
 * @param {{ brand: 'visa' | 'mastercard', className?: string }} props
 */
export function CardBrandMini({ brand, className }) {
  return (
    <span
      role="img"
      aria-label={brand === 'visa' ? 'Visa' : 'Mastercard'}
      className={cn('relative block h-6 w-8 shrink-0 overflow-hidden rounded-[6px] border border-default bg-white', className)}
    >
      {brand === 'visa' ? (
        <img src={visaLogoSmall} alt="" aria-hidden width="21.333" height="8" draggable={false} className="absolute top-1/2 left-1/2 block h-2 w-[21.333px] max-w-none -translate-1/2" />
      ) : (
        <span className="absolute top-1/2 left-1/2 h-[14.651px] w-[21.392px] -translate-1/2 scale-80">
          <span aria-hidden className="absolute bg-[#ff5f00]" style={{ left: 7.88, top: 2.55, width: 5.643, height: 9.544 }} />
          <Layer {...layer(mcLeft, 1.21, 1.26, 9.483, 12.139)} />
          <Layer {...layer(mcTm, 19.51, 10.85, 0.537, 0.479)} />
          <Layer {...layer(mcRight, 10.7, 1.25, 9.484, 12.14)} />
        </span>
      )}
    </span>
  )
}

function Layer({ src, left, top, width, height }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      draggable={false}
      className="absolute block max-w-none"
      style={{ left, top, width, height }}
    />
  )
}

export default CardBrandLogo
