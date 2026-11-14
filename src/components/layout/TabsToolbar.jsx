import { Tabs } from '@/components/ui/Tabs'

/**
 * Page toolbar — Figma secondary "Header" / "CTA" (Event List, Ticket List, E-Voucher): 60px
 * incl. bottom border, tabs on the left (16px inset, the tabs bring their own 16px), a primary
 * action on the right (32px inset). Without `tabs` it's just the right-aligned action bar.
 * Pass it to DashboardLayout's `toolbar`.
 *
 * @param {{ tabs?: { id: string, label: string }[], value?: string, onChange?: (id: string) => void,
 *           idPrefix?: string, label?: string, action?: React.ReactNode }} props
 */
export function TabsToolbar({ tabs, value, onChange, idPrefix, label, action }) {
  return (
    <div className="flex h-15 w-full shrink-0 items-center justify-between gap-4 border-b border-default pr-4 md:pl-4 md:pr-8">
      {tabs ? <Tabs tabs={tabs} value={value} onChange={onChange} idPrefix={idPrefix} label={label} /> : <span />}
      {action}
    </div>
  )
}

export default TabsToolbar
