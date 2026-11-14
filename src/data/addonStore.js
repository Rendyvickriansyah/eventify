import { createEventCollection } from '@/lib/localStore'

/*
 * Add-ons per event (parking, merch, meals…), created from the Add-ons tab of the Ticket List
 * and persisted in localStorage as { [eventId]: AddOn[] }.
 *
 * @typedef {{ id: string, name: string, category: string, price: number, stock: number,
 *   sold: number, description: string, image: string | null, minPerOrder: number,
 *   maxPerOrder: number, createdAt: string }} AddOn
 */
const addons = createEventCollection('eventify:addons', 'add')

export const useAddOns = addons.use
export const getAddOns = addons.get
/** Saves an add-on; throws when storage is full or unavailable. */
export const addAddOn = addons.add
export const removeAddOn = addons.remove
export const duplicateAddOn = addons.duplicate
export const takeJustCreatedAddOn = addons.takeJustCreated

export const addOnCategories = ['Parking & Transport', 'Food & Beverage', 'Merchandise', 'Hospitality & VIP', 'Experience']

/** Figma "Add ons" (node 274:39893) sample rows — shown for the Figma event (evt-102). */
export const demoAddOns = {
  'evt-102': [
    { id: 'demo-parking', name: 'VIP Parking Pass', category: 'Parking & Transport', price: 25, sold: 180, stock: 500 },
    { id: 'demo-shuttle', name: 'Shuttle Bus Pass', category: 'Parking & Transport', price: 10, sold: 120, stock: 200 },
    { id: 'demo-meal', name: 'Stadium Meal Package', category: 'Food & Beverage', price: 18, sold: 95, stock: 250 },
    { id: 'demo-jersey', name: 'Official Team Jersey', category: 'Merchandise', price: 40, sold: 50, stock: 200 },
    { id: 'demo-lounge', name: 'Premium Lounge Access', category: 'Hospitality & VIP', price: 75, sold: 15, stock: 50 },
    { id: 'demo-tour', name: 'Pitch Tour Experience', category: 'Experience', price: 60, sold: 20, stock: 20 },
  ],
}
