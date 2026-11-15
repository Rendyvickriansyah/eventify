import ticketBack from '@/assets/illustrations/ticket-back.svg'
import ticketFront from '@/assets/illustrations/ticket-front.svg'

/**
 * Two stacked tickets — the Figma "Empty States" illustration shared by Ticket List and
 * Discount & Promo Code (279 × 248). Decorative; inverted in dark mode.
 */
export function TicketIllustration() {
  return (
    <div aria-hidden className="relative h-62 w-[279px] shrink-0 overflow-hidden">
      <img
        src={ticketBack}
        alt=""
        width="244.264"
        height="171.765"
        className="ticket-back absolute top-[40.6px] left-[17.3px] block h-[171.765px] w-[244.264px] max-w-none rotate-[-16.11deg] dark:invert"
      />
      <img
        src={ticketFront}
        alt=""
        width="244.264"
        height="171.765"
        className="ticket-front absolute top-[77.6px] left-[17.25px] block h-[171.765px] w-[244.264px] max-w-none dark:invert"
      />
    </div>
  )
}

export default TicketIllustration
