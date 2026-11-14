/*
 * Mock content for the Account page — Figma node 227:22275 ("Overview").
 * Replace with API data later; components only read these shapes.
 */
import avatar from '@/assets/images/profile-avatar.jpg'

export const accountTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'settings', label: 'Settings' },
]

export const profile = {
  avatar,
  verified: true,
  firstName: 'Alex',
  lastName: 'Cabral',
  email: 'alexcabral@example.com',
  phone: '+62 123 4567 89',
  organizer: 'Dan’s Organizer',
  country: 'ID',
}

export const countries = [
  { value: 'ID', label: 'Indonesia' },
  { value: 'MY', label: 'Malaysia' },
  { value: 'SG', label: 'Singapore' },
  { value: 'TH', label: 'Thailand' },
  { value: 'PH', label: 'Philippines' },
  { value: 'VN', label: 'Vietnam' },
  { value: 'AU', label: 'Australia' },
  { value: 'US', label: 'United States' },
]

export const security = {
  passwordChanged: 'Last changed 3 months ago',
  twoFactorEnabled: false,
}
