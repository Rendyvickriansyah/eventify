/*
 * Mock content for the Events page — Figma node 274:36462 ("Event List").
 * Figma repeats one placeholder row ("Jakarta Jazz Festival"); rows here vary so the
 * list reads like real data. Every row uses the Figma cover asset and crop.
 * Replace with API data later; components only read these shapes.
 */
import eventCover from '@/assets/images/event-cover.png'

/* Figma "image 82" inside the 68px cover: 145.646 × 97, centred at (-0.18, +9.5) */
const coverCrop = { left: -39.003, top: -5, width: 145.646, height: 97 }
const cover = (alt) => ({ src: eventCover, alt, crop: coverCrop })

export const eventsBreadcrumb = [
  { label: 'Dashboard', href: '#/dashboard' },
  { label: 'Events' },
]

export const eventTabs = [
  { id: 'upcoming', label: 'Upcoming Events' },
  { id: 'past', label: 'Past Events' },
]

export const upcomingEvents = [
  { id: 'evt-101', title: 'Jakarta Jazz Festival', date: '2026-07-12', category: 'Music & Art', sold: 4000, capacity: 7000, priceRange: '$150-$1000' },
  { id: 'evt-102', title: 'Indonesian League Matchday 12', date: '2026-07-19', category: 'Sports', sold: 4900, capacity: 10000, priceRange: '$20-$150' },
  { id: 'evt-103', title: 'Bali Food & Wine Week', date: '2026-08-02', category: 'Food & Drink', sold: 1850, capacity: 3000, priceRange: '$60-$450' },
  { id: 'evt-104', title: 'Tech in Asia Summit', date: '2026-08-21', category: 'Conference', sold: 2400, capacity: 2500, priceRange: '$199-$899' },
  { id: 'evt-105', title: 'Bandung Indie Fest', date: '2026-09-05', category: 'Music & Art', sold: 620, capacity: 4000, priceRange: '$35-$120' },
  { id: 'evt-106', title: 'Surabaya Marathon', date: '2026-09-27', category: 'Sports', sold: 8900, capacity: 12000, priceRange: '$40-$95' },
  { id: 'evt-107', title: 'Yogyakarta Art Biennale', date: '2026-10-10', category: 'Exhibition', sold: 3100, capacity: 8000, priceRange: '$15-$80' },
].map((event) => ({ ...event, cover: cover(event.title) }))

export const pastEvents = [
  { id: 'evt-090', title: 'Java Rockin Land', date: '2026-06-14', category: 'Music & Art', sold: 15000, capacity: 15000, priceRange: '$45-$300' },
  { id: 'evt-089', title: 'Jakarta Fashion Week', date: '2026-05-23', category: 'Fashion', sold: 4210, capacity: 5000, priceRange: '$80-$650' },
  { id: 'evt-088', title: 'Startup Founders Meetup', date: '2026-04-30', category: 'Conference', sold: 380, capacity: 500, priceRange: '$0-$49' },
].map((event) => ({ ...event, cover: cover(event.title) }))

/** Event categories offered when creating / editing an event. */
export const eventCategories = ['Music & Art', 'Sports & Fitness', 'Food & Drink', 'Conference', 'Exhibition', 'Fashion']
