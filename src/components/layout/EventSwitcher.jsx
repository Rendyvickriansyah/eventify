import { Menu } from '@/components/ui/Menu'
import { getEventOptions } from '@/data/eventDetail'

/**
 * Sidebar event switcher — Figma event "Sidebar" dropdown. Switching keeps the current
 * section (e.g. Seating Chart stays on Seating Chart for the newly picked event).
 *
 * @param {{ eventId: string, title: string, section?: string }} props
 */
export function EventSwitcher({ eventId, title, section }) {
  const suffix = section && section !== 'overview' ? `/${section}` : ''
  return (
    <Menu
      variant="field"
      align="start"
      triggerLabel={title}
      label={`Switch event, current: ${title}`}
      items={getEventOptions().map((option) => ({
        id: option.id,
        label: option.title,
        checked: option.id === eventId,
        onSelect: () => { window.location.hash = `#/event/${option.id}${suffix}` },
      }))}
    />
  )
}

export default EventSwitcher
