import { useId } from 'react'
import { cn } from '@/lib/cn'
import { Switch } from './Switch'

/**
 * Settings group — Figma "Access & Registration", "Visibility", "Purchase Rules"…: 16/24
 * semibold title, 20px between rows; groups after the first get a divider and 24px above.
 * @param {{ title: string, divided?: boolean, className?: string, children: React.ReactNode }} props
 */
export function SettingsSection({ title, divided = false, className, children }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cn('flex flex-col gap-5', divided && 'border-t border-default pt-6', className)}>
      <h2 id={id} className="text-body-lg font-semibold text-fg">{title}</h2>
      {children}
    </section>
  )
}

/**
 * One setting — Figma "Age Restriction" etc.: 14/20 medium heading + 70% hint, then the
 * Switch with its own label and description, 20px apart.
 * @param {{ heading: string, hint: string, label: string, description?: string, name?: string,
 *           checked: boolean, onChange: (checked: boolean) => void, disabled?: boolean }} props
 */
export function SettingToggle({ heading, hint, ...switchProps }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-label text-fg">{heading}</h3>
        <p className="text-body text-pretty text-fg-muted">{hint}</p>
      </div>
      <Switch {...switchProps} />
    </div>
  )
}

/**
 * Renders a config of groups → toggles bound to one `values` object.
 * @param {{ groups: { title: string, items: { key: string, heading: string, hint: string, label: string, description?: string }[] }[],
 *           values: Record<string, boolean>, onChange: (key: string, checked: boolean) => void,
 *           disabled?: boolean, dividedFirst?: boolean }} props
 */
export function SettingsGroups({ groups, values, onChange, disabled = false, dividedFirst = false }) {
  return groups.map((group, g) => (
    <SettingsSection key={group.title} title={group.title} divided={g > 0 || dividedFirst}>
      {group.items.map((item) => (
        <SettingToggle
          key={item.key}
          name={item.key}
          heading={item.heading}
          hint={item.hint}
          label={item.label}
          description={item.description}
          checked={values[item.key]}
          onChange={(checked) => onChange(item.key, checked)}
          disabled={disabled}
        />
      ))}
    </SettingsSection>
  ))
}

export default SettingToggle
