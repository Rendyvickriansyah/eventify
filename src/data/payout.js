/*
 * Mock content for the Payout page — Figma node 208:15171 ("Payout").
 * Figma ships "Title / Value" placeholders for the Recent Period cards and repeats one
 * history row; both are filled with consistent figures (April net payout = $17,575.00).
 * Replace with API data later; components only read these shapes.
 */

export const payoutBreadcrumb = [
  { label: 'Dashboard', href: '#/dashboard' },
  { label: 'Wallet' },
]

export const balance = {
  available: 4470250,  // USD; the page formats it
  amount: '$4,470,250.00',
  currency: 'USD',
  nextPayout: 'Your next automatic payout is scheduled for May 15, 2026',
}

export const recentPeriod = [
  { id: 'gross', label: 'Gross Sales', value: '$19,850.00', trend: { direction: 'up', value: '8.2%', context: 'vs March' } },
  { id: 'fees', label: 'Platform Fees', value: '$2,275.00', trend: { direction: 'neutral', value: '11.5%', context: 'of gross' } },
  { id: 'net', label: 'Net Payout', value: '$17,575.00', trend: { direction: 'up', value: '6.9%', context: 'vs March' } },
]

export const payoutAccounts = [
  { id: 'acc-visa', brand: 'visa', number: '**** **** **** 5123', holder: 'James Alexander', currency: 'USD', isDefault: true },
  { id: 'acc-mc', brand: 'mastercard', number: '**** **** **** 1234', holder: 'James Alexander', currency: 'USD', isDefault: false },
]

export const payoutHistory = [
  { id: '#PAY-0041', period: 'Apr 1–30, 2026', amount: '$17,575.00', status: { label: 'Completed', tone: 'success' }, date: 'May 3, 2026' },
  { id: '#PAY-0040', period: 'Mar 1–31, 2026', amount: '$16,440.00', status: { label: 'Completed', tone: 'success' }, date: 'Apr 3, 2026' },
  { id: '#PAY-0039', period: 'Feb 1–28, 2026', amount: '$12,980.50', status: { label: 'Completed', tone: 'success' }, date: 'Mar 3, 2026' },
  { id: '#PAY-0038', period: 'Jan 1–31, 2026', amount: '$9,215.00', status: { label: 'Completed', tone: 'success' }, date: 'Feb 3, 2026' },
]
