import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { toast } from '@/components/ui/Toast'
import {
  notificationChannels,
  notificationGroups,
  getNotificationPrefs,
  saveNotificationPrefs,
} from '@/data/notificationStore'

const enter = (index) => ({ '--enter-index': index })

/**
 * Account › Notifications — Figma node 227:25519. One table per group (48px header row with
 * the group title and the In-App / Email / Slack columns, 68px event rows, 150px channel
 * columns), 16px between groups. "Save Changes" sits bottom-right and is only enabled once
 * something changed; saving writes to localStorage and confirms with a toast.
 */
export function NotificationPreferences() {
  const [saved, setSaved] = useState(getNotificationPrefs)
  const [prefs, setPrefs] = useState(saved)
  const [saving, setSaving] = useState(false)
  const timer = useRef()

  useEffect(() => () => clearTimeout(timer.current), [])

  const dirty = JSON.stringify(prefs) !== JSON.stringify(saved)

  const toggle = (eventId, channelId) => (checked) =>
    setPrefs((prev) => ({ ...prev, [eventId]: { ...prev[eventId], [channelId]: checked } }))

  function handleSubmit(e) {
    e.preventDefault()
    if (!dirty || saving) return
    setSaving(true)
    // Stand-in for the API call
    timer.current = setTimeout(() => {
      saveNotificationPrefs(prefs)
      setSaved(prefs)
      setSaving(false)
      toast.success('Notification preferences saved', { description: 'We’ll notify you on the channels you selected.' })
    }, 600)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 pt-4 pr-4 pb-8 md:pr-8 md:pl-4">
      <div className="flex flex-col gap-4">
        {notificationGroups.map((group, i) => (
          <div key={group.id} className="enter-rise overflow-x-auto" style={enter(i + 2)}>
            <table className="w-full min-w-160 border-collapse text-left">
              <thead>
                <tr className="h-12">
                  <th scope="col" className="border-b border-default py-2 pr-3 pl-4 text-label text-fg">{group.title}</th>
                  {notificationChannels.map((channel) => (
                    <th key={channel.id} scope="col" className="w-[150px] border-b border-default px-3 py-2 text-label text-fg">
                      {channel.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => (
                  <tr key={item.id} className="h-17 last:*:border-b-0">
                    <th scope="row" className="border-b border-default py-3 pr-3 pl-4 font-normal">
                      <span className="flex flex-col gap-1">
                        <span className="text-label text-fg">{item.label}</span>
                        <span className="text-body text-pretty text-fg-muted">{item.description}</span>
                      </span>
                    </th>
                    {notificationChannels.map((channel) => (
                      <td key={channel.id} className="h-17 border-b border-default p-0">
                        {/* The whole cell toggles — a 16px box alone is too small a target */}
                        <label className="flex h-full cursor-pointer items-center px-3 py-2">
                          <Checkbox
                            name={`${item.id}.${channel.id}`}
                            checked={prefs[item.id][channel.id]}
                            onChange={toggle(item.id, channel.id)}
                            aria-label={`${item.label} via ${channel.label}`}
                          />
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="enter-rise flex justify-end" style={enter(notificationGroups.length + 2)}>
        {/* Same 44px glass "Save Changes" as the Overview profile form */}
        <Button type="submit" variant="glass" loading={saving} disabled={!dirty && !saving} className="h-11 text-body-lg font-medium">
          Save Changes
        </Button>
      </div>
    </form>
  )
}

export default NotificationPreferences
