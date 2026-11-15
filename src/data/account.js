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

/* Settings tab — Figma node 227:22273 ("Language & Region"). */
export const languages = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'id-ID', label: 'Bahasa Indonesia' },
  { value: 'ms-MY', label: 'Bahasa Melayu' },
  { value: 'th-TH', label: 'ไทย (Thai)' },
  { value: 'vi-VN', label: 'Tiếng Việt' },
]

export const timezones = [
  { value: '-08:00', label: 'UTC−08:00 (Los Angeles)' },
  { value: '-05:00', label: 'UTC−05:00 (New York)' },
  { value: '+00:00', label: 'UTC+00:00 (London)' },
  { value: '+01:00', label: 'UTC+01:00 (Paris)' },
  { value: '+04:00', label: 'UTC+04:00 (Dubai)' },
  { value: '+05:30', label: 'UTC+05:30 (Mumbai)' },
  { value: '+07:00', label: 'UTC+07:00 (Jakarta, Bangkok)' },
  { value: '+08:00', label: 'UTC+08:00 (Singapore, Bali)' },
  { value: '+09:00', label: 'UTC+09:00 (Tokyo, Jayapura)' },
  { value: '+10:00', label: 'UTC+10:00 (Sydney)' },
]

export const currencies = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'IDR', label: 'IDR (Rp)' },
  { value: 'SGD', label: 'SGD (S$)' },
  { value: 'MYR', label: 'MYR (RM)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
]

export const defaultRegionalSettings = { language: 'en-US', timezone: '+07:00', currency: 'USD' }
