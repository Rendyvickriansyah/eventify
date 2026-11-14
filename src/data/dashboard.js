/*
 * Mock content for the Dashboard page — copied verbatim from Figma node 290:29550.
 * Replace with API data later; components only read these shapes.
 */
import eventCover from '@/assets/images/event-cover.png'
import chartGrid from '@/assets/icons/chart-grid.svg'
import chartLine from '@/assets/icons/chart-line.svg'
import chartArea from '@/assets/icons/chart-area.svg'
import { Bell, MessageSquareWarning, User } from 'lucide-react'

export const breadcrumb = [
  { label: 'Dashboard', href: '#/dashboard' },
  { label: 'Indonesian League Match' },
]

export const headerActions = [
  { id: 'feedback', label: 'Feedback', icon: MessageSquareWarning },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'account', label: 'Account', icon: User },
]

export const filters = [
  {
    id: 'dateRange',
    label: 'Date Range',
    options: [
      { value: 'today', label: 'Today' },
      { value: '7d', label: 'Last 7 days' },
      { value: '30d', label: 'Last 30 days' },
      { value: 'year', label: 'This year' },
    ],
  },
  {
    id: 'category',
    label: 'Event Category',
    options: [
      { value: 'music-art', label: 'Music & Art' },
      { value: 'sports', label: 'Sports' },
      { value: 'conference', label: 'Conference' },
      { value: 'workshop', label: 'Workshop' },
    ],
  },
]

/* Figma ships "Title / Value" placeholders here; filled with the metrics an organizer
   checks first. Figures line up with the event cards below (revenue, tickets sold). */
export const insights = [
  {
    id: 'total-revenue',
    label: 'Total Revenue',
    value: '$401,850',
    trend: { direction: 'up', value: '12.4%', context: 'vs last month' },
  },
  {
    id: 'tickets-sold',
    label: 'Tickets Sold',
    value: '8,750',
    trend: { direction: 'neutral', value: '87.5%', context: 'of capacity' },
  },
  {
    id: 'total-attendees',
    label: 'Total Attendees',
    value: '52,200',
    trend: { direction: 'down', value: '3.2%', context: 'vs last event' },
  },
]

const jazzFestivalFields = [
  { label: 'Tickets Sold', value: '8,750 / 10,000' },
  { label: 'Revenue', value: '$401,850' },
  { label: 'Status', badge: { label: 'Published', tone: 'success' } },
  { label: 'Location', value: 'Jakarta Stadium' },
  { label: 'Starts In', value: '33 Days' },
  { label: 'Check-in', value: 'Not Started' },
]

/* `crop` = image placement inside the 138×68 cover frame, from Figma. */
export const upcomingEvents = [
  {
    id: 'event-1',
    title: 'Jakarta Jazz Festival',
    date: 'July 12, 2026',
    category: 'Music & Art',
    cover: { src: eventCover, alt: 'Jakarta Jazz Festival', crop: { left: -3.3228, top: -5, width: 145.6457, height: 97 } },
    fields: jazzFestivalFields,
  },
  {
    id: 'event-2',
    title: 'Jakarta Jazz Festival',
    date: 'July 12, 2026',
    category: 'Music & Art',
    cover: { src: eventCover, alt: 'Jakarta Jazz Festival', crop: { left: -4, top: -7, width: 146, height: 97 } },
    fields: jazzFestivalFields,
  },
]

/*
 * Revenue data points = the vertices of the Figma line layer (chart-line.svg,
 * viewBox 997.5 × 189.058), so the hover marker sits exactly on the drawn line.
 * x → date across Jan–Dec 2026, y → value on the $0–$25,000 axis of the 202px plot.
 */
const LINE_VIEWBOX_W = 997.5
const LINE_LAYER_TOP = -1.382
const LINE_LAYER_WIDTH = 0.996
const PLOT_HEIGHT = 202
const Y_MAX = 25000
const AVG_TICKET_PRICE = 96

const lineVertices = [
  [0.75, 170.375], [31.215, 183.716], [68.45, 159.258], [119.226, 188.164], [170.001, 150.363],
  [210.621, 183.716], [247.856, 183.716], [254.626, 159.258], [298.631, 150.363], [325.712, 165.928],
  [379.872, 130.352], [423.877, 59.198], [447.572, 59.198], [481.422, 1.386], [522.042, 59.198],
  [555.892, 21.398], [572.818, 39.186], [613.438, 1.386], [643.903, 30.292], [684.523, 25.845],
  [718.373, 39.186], [752.223, 103.669], [789.458, 59.198], [813.154, 72.54], [867.314, 72.54],
  [884.239, 59.198], [901.164, 92.551], [928.244, 92.551], [955.324, 141.469], [985.789, 130.352],
  [996.75, 103.265],
]

const ticketMix = [
  { label: 'VIP', share: 0.22 },
  { label: 'Club Level', share: 0.38 },
  { label: 'General Admission', share: 0.4 },
]

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function buildRevenuePoints() {
  const start = Date.UTC(2026, 0, 1)
  const end = Date.UTC(2026, 11, 31)
  return lineVertices.map(([vx, vy], index) => {
    const x = (vx / LINE_VIEWBOX_W) * LINE_LAYER_WIDTH // 0–1 of plot width
    const y = LINE_LAYER_TOP + vy // px inside the plot
    const value = Math.round(((1 - y / PLOT_HEIGHT) * Y_MAX) / 10) * 10
    const tickets = Math.max(1, Math.round(value / AVG_TICKET_PRICE))
    const orders = Math.max(1, Math.round(tickets / 1.8))
    // Small deterministic wobble so the mix isn't identical on every point
    const wobble = ((index * 37) % 9) / 100 - 0.04
    const vip = Math.round(value * (ticketMix[0].share + wobble))
    const club = Math.round(value * (ticketMix[1].share - wobble / 2))
    return {
      id: `rev-${index}`,
      x,
      y,
      value,
      date: dateFormat.format(new Date(start + (end - start) * (vx / LINE_VIEWBOX_W))),
      orders,
      tickets,
      breakdown: [
        { label: ticketMix[0].label, value: vip },
        { label: ticketMix[1].label, value: club },
        { label: ticketMix[2].label, value: value - vip - club },
      ],
    }
  }).map((point, index, all) => ({
    ...point,
    change: index === 0 ? null : (point.value - all[index - 1].value) / all[index - 1].value,
  }))
}

export const revenue = {
  yTicks: ['$25,000', '$20,000', '$15,000', '$10,000', '$5,000', '$0'],
  points: buildRevenuePoints(),
  xTicks: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  summary: 'Total revenue by month, January to December. Revenue stays under $10,000 until May, peaks near $25,000 in June and August, and ends the year around $13,000.',
  /* Figma layer geometry inside the 202px plot (px). Order = paint order. */
  layers: [
    { src: chartGrid, top: -0.5, height: 210.5 },
    { src: chartLine, top: -1.382, height: 189.058 },
    { src: chartArea, top: 0, height: 201.805 },
  ],
}

export const recentOrders = [
  { id: '#ORD-2041', buyer: 'James Donovan', ticket: '2x Club Level', total: '$240', payment: { label: 'Paid', tone: 'success' } },
  { id: '#ORD-2041', buyer: 'James Donovan', ticket: '2x Club Level', total: '$240', payment: { label: 'Paid', tone: 'success' } },
  { id: '#ORD-2041', buyer: 'James Donovan', ticket: '2x Club Level', total: '$240', payment: { label: 'Paid', tone: 'success' } },
  { id: '#ORD-2041', buyer: 'James Donovan', ticket: '2x Club Level', total: '$240', payment: { label: 'Paid', tone: 'success' } },
]
