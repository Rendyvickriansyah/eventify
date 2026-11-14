/** Sidebar navigation config — Figma "Sidebar" groups (order and labels as designed). */
export const navigation = {
  groups: [
    {
      id: 'general',
      title: 'GENERAL',
      items: [
        { id: 'dashboard', label: 'Dashboard', href: '#/dashboard' },
        { id: 'events', label: 'Events', href: '#/events' },
      ],
    },
    {
      id: 'finance',
      title: 'FINANCE',
      items: [
        { id: 'orders', label: 'Orders', href: '#/orders' },
        { id: 'wallet', label: 'Wallet', href: '#/wallet' },
      ],
    },
    {
      id: 'settings',
      title: 'SETTINGS',
      items: [
        { id: 'account', label: 'Account', href: '#/account' },
        { id: 'integrations', label: 'Integrations', href: '#/integrations' },
      ],
    },
  ],
  footer: [
    { id: 'help-center', label: 'Help Center', href: '#/help-center' },
    { id: 'developers', label: 'Developers', href: '#/developers' },
  ],
}

export default navigation
