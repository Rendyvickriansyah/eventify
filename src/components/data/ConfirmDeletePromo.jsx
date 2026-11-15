import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { removePromoCode } from '@/data/promoStore'

/**
 * "Delete EARLY50?" — confirms before a promo code goes (list ⋯ menu and the details page).
 * Cancel takes focus; past redemptions are mentioned because they stay on their orders.
 * @param {{ eventId: string, promo: import('@/data/promoStore').PromoCode | null,
 *           onClose: () => void, onDeleted?: () => void }} props
 */
export function ConfirmDeletePromo({ eventId, promo, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false)
  const [shown, setShown] = useState(promo) // keep the copy while the modal fades out
  const timer = useRef()
  useEffect(() => { if (promo) setShown(promo) }, [promo])
  useEffect(() => () => clearTimeout(timer.current), [])
  const p = promo ?? shown

  function confirm() {
    setBusy(true)
    timer.current = setTimeout(() => {
      try {
        removePromoCode(eventId, p.id)
        toast.success('Promo code deleted', { description: `${p.code} can no longer be used at checkout.` })
        onDeleted?.()
      } catch {
        toast.error('Couldn’t delete the code', { description: 'Browser storage is unavailable.' })
      }
      setBusy(false)
      onClose()
    }, 500)
  }

  return (
    <Modal
      open={Boolean(promo)}
      onClose={busy ? () => {} : onClose}
      title={p ? `Delete ${p.code}?` : 'Delete promo code?'}
      footer={
        <>
          <Button className="h-11 flex-1 text-body-lg font-medium" onClick={onClose} disabled={busy} data-autofocus>Cancel</Button>
          <Button variant="danger" className="h-11 flex-1 text-body-lg font-medium" loading={busy} onClick={confirm}>Delete Promo Code</Button>
        </>
      }
    >
      <p className="pb-2 text-body text-pretty text-fg-muted">
        {p?.used
          ? `Buyers can’t use ${p.code} anymore. The ${p.used.toLocaleString('en-US')} orders that already used it keep their discount.`
          : 'Buyers can’t use this code anymore. It hasn’t been used yet, so no orders are affected.'}
      </p>
    </Modal>
  )
}

export default ConfirmDeletePromo
