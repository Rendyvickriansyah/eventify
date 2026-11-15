import { createEventCollection } from '@/lib/localStore'

/*
 * E-voucher templates per event (the ticket design attendees receive), persisted in
 * localStorage as { [eventId]: Voucher[] }.
 *
 * @typedef {{ id: string, name: string, sold: number, createdAt: string, updatedAt?: string,
 *   design?: { head: string, body: string, image: string | null } }} Voucher
 *   `design` is the editor's content (Figma "Create New E-Voucher", node 305:29728).
 */
const vouchers = createEventCollection('eventify:vouchers', 'vch')

export const useVouchers = vouchers.use
/** Saves a template; throws when storage is full or unavailable. */
export const addVoucher = vouchers.add
/** Saves edits to a template; throws when storage is full or unavailable. */
export const updateVoucher = vouchers.update
export const getVouchers = vouchers.get
export const removeVoucher = vouchers.remove
export const takeJustCreatedVoucher = vouchers.takeJustCreated

/** Figma "E-Voucher" (node 275:40818) sample templates — shown for the Figma event (evt-102). */
export const demoVouchers = {
  'evt-102': [
    { id: 'demo-matchday', name: 'Match Day E-Voucher', updatedAt: '2025-09-28T10:00:00Z' },
    { id: 'demo-vip', name: 'VIP Lounge E-Voucher', updatedAt: '2025-09-28T15:30:00Z' },
  ],
}
