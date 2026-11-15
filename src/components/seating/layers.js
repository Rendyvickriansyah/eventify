import { newId } from './geometry'

/*
 * Layers on a flat scene list (Figma's layer tree without nesting the data):
 *  - Leaves are drawable objects; their array order is the paint order (last = in front).
 *  - Groups are records `{ id, type: 'group', layerName, hidden?, locked?, groupId? }` with no
 *    geometry. Membership is `groupId` on the child (groups can nest).
 *  - A group's place in the stack is that of its front-most leaf; moving or grouping keeps a
 *    group's leaves together in the array.
 * Every function is pure: it takes the list and returns a new one.
 */

export const isGroup = (o) => o?.type === 'group'

const parentOf = (o) => o?.groupId ?? null

function index(list) {
  const byId = new Map(list.map((o) => [o.id, o]))
  const pos = new Map(list.map((o, i) => [o.id, i]))
  const kids = new Map()
  for (const o of list) {
    const p = parentOf(o)
    if (!kids.has(p)) kids.set(p, [])
    kids.get(p).push(o.id)
  }
  return { byId, kids, pos }
}

/** Ids of `id` and everything inside it. */
export function subtree(list, id, idx = index(list)) {
  const out = [id]
  for (const k of idx.kids.get(id) ?? []) out.push(...subtree(list, k, idx))
  return out
}

/** Leaf ids under the given ids (a leaf counts as its own). */
export function leafIds(list, ids) {
  const idx = index(list)
  const out = new Set()
  for (const id of ids) for (const s of subtree(list, id, idx)) if (!isGroup(idx.byId.get(s))) out.add(s)
  return out
}

/** [self, parent, grandparent, …] */
export function chainOf(list, id) {
  const byId = new Map(list.map((o) => [o.id, o]))
  const chain = []
  let cur = byId.get(id)
  while (cur) { chain.push(cur.id); cur = byId.get(parentOf(cur)) }
  return chain
}

export const parentId = (list, id) => parentOf(list.find((o) => o.id === id))

/** Leaves hidden or locked by themselves or by a group above them. */
export function effectiveFlags(list) {
  const byId = new Map(list.map((o) => [o.id, o]))
  const hidden = new Set()
  const locked = new Set()
  for (const o of list) {
    if (isGroup(o)) continue
    let cur = o
    let h = false
    let l = false
    while (cur) { h ||= Boolean(cur.hidden); l ||= Boolean(cur.locked); cur = byId.get(parentOf(cur)) }
    if (h) hidden.add(o.id)
    if (l) locked.add(o.id)
  }
  return { hidden, locked }
}

/** Stack position: the leaf's index, or a group's front-most leaf (-1 when empty). */
function zOf(list, id, idx) {
  let z = -1
  for (const s of subtree(list, id, idx)) {
    if (isGroup(idx.byId.get(s))) continue
    z = Math.max(z, idx.pos.get(s))
  }
  return z
}

/** Children of `parent` (null = top level) front-most first — the order the layers panel shows. */
export function childrenFront(list, parent = null) {
  const idx = index(list)
  const z = new Map((idx.kids.get(parent) ?? []).map((id) => [id, zOf(list, id, idx)]))
  return [...z.keys()].sort((a, b) => z.get(b) - z.get(a))
}

/** Removes groups that no longer contain any leaf. */
export function pruneGroups(list) {
  let cur = list
  for (;;) {
    const idx = index(cur)
    const empty = cur.filter((o) => isGroup(o) && leafIds(cur, [o.id]).size === 0).map((o) => o.id)
    if (!empty.length) return cur
    const gone = new Set(empty)
    cur = cur.filter((o) => !gone.has(o.id)).map((o) => (gone.has(parentOf(o)) ? { ...o, groupId: parentOf(idx.byId.get(parentOf(o))) ?? undefined } : o))
  }
}

/** Keeps only the outer-most of the given ids (drops ones inside another given one). */
export function outermost(list, ids) {
  const set = new Set(ids)
  return ids.filter((id) => !chainOf(list, id).slice(1).some((a) => set.has(a)))
}

/**
 * Moves items next to `targetId`: 'above' (in front of it), 'below' (behind it), or 'inside'
 * (front of a group). The moved items take the target's parent (or the target group).
 */
export function moveItems(list, ids, targetId, position) {
  const movers = outermost(list, ids).filter((id) => id !== targetId)
  if (!movers.length) return list
  // No dropping a group into itself
  if (movers.some((m) => chainOf(list, targetId).includes(m))) return list
  const idx = index(list)
  const target = idx.byId.get(targetId)
  if (!target) return list
  const newParent = position === 'inside' ? targetId : parentOf(target)
  const moving = new Set()
  for (const m of movers) for (const s of subtree(list, m, idx)) if (!isGroup(idx.byId.get(s))) moving.add(s)
  const block = list.filter((o) => moving.has(o.id))
  let rest = list.filter((o) => !moving.has(o.id))
  // Where the target's leaves sit in what's left
  const targetLeaves = leafIds(rest, [targetId])
  const positions = rest.map((o, i) => (targetLeaves.has(o.id) ? i : -1)).filter((i) => i >= 0)
  let at
  if (!positions.length) at = rest.length
  else if (position === 'below') at = Math.min(...positions)
  else at = Math.max(...positions) + 1
  rest = [...rest.slice(0, at), ...block, ...rest.slice(at)]
  const moverSet = new Set(movers)
  rest = rest.map((o) => (moverSet.has(o.id) ? { ...o, groupId: newParent ?? undefined } : o))
  return pruneGroups(rest)
}

/** Bring to front / send to back / one step forward or backward among siblings. */
export function restack(list, ids, dir) {
  let cur = list
  for (const id of dir === 'front' || dir === 'backward' ? [...outermost(list, ids)].reverse() : outermost(list, ids)) {
    const siblings = childrenFront(cur, parentId(cur, id)) // front-most first
    const i = siblings.indexOf(id)
    if (dir === 'front' && i > 0) cur = moveItems(cur, [id], siblings[0], 'above')
    if (dir === 'back' && i < siblings.length - 1) cur = moveItems(cur, [id], siblings.at(-1), 'below')
    if (dir === 'forward' && i > 0) cur = moveItems(cur, [id], siblings[i - 1], 'above')
    if (dir === 'backward' && i >= 0 && i < siblings.length - 1) cur = moveItems(cur, [id], siblings[i + 1], 'below')
  }
  return cur
}

/** Groups the items (⌘G). Returns the new list and the group's id. */
export function groupItems(list, ids) {
  const items = outermost(list, ids)
  if (!items.length) return { list, id: null }
  const parents = new Set(items.map((id) => parentId(list, id)))
  const parent = parents.size === 1 ? [...parents][0] : null
  const count = list.filter(isGroup).length + 1
  const group = { id: newId('grp'), type: 'group', layerName: `Group ${count}`, ...(parent && { groupId: parent }) }
  // The group lands where its front-most member was; the rest gather right behind it.
  const front = items.reduce((a, b) => (zIndex(list, b) > zIndex(list, a) ? b : a))
  let next = [...list.map((o) => (items.includes(o.id) ? { ...o, groupId: group.id } : o)), group]
  next = moveItems(next, items.filter((id) => id !== front), front, 'below') // movers take front's parent = the group
  return { list: pruneGroups(next), id: group.id }
}

function zIndex(list, id) {
  return zOf(list, id, index(list))
}

/** Ungroups (⇧⌘G): children move up a level. Returns the list and the freed children. */
export function ungroupItems(list, ids) {
  const groups = ids.filter((id) => isGroup(list.find((o) => o.id === id)))
  if (!groups.length) return { list, ids }
  const byId = new Map(list.map((o) => [o.id, o]))
  const freed = []
  const gone = new Set(groups)
  const next = list
    .filter((o) => !gone.has(o.id))
    .map((o) => {
      if (!gone.has(parentOf(o))) return o
      freed.push(o.id)
      return { ...o, groupId: parentOf(byId.get(parentOf(o))) ?? undefined }
    })
  return { list: next, ids: [...ids.filter((id) => !gone.has(id)), ...freed] }
}

/** Deletes items and everything inside them. */
export function removeItems(list, ids) {
  const idx = index(list)
  const gone = new Set()
  for (const id of ids) for (const s of subtree(list, id, idx)) gone.add(s)
  return pruneGroups(list.filter((o) => !gone.has(o.id)))
}

/** Snapshot of items with their contents (for copy). */
export function collect(list, ids) {
  const idx = index(list)
  const keep = new Set()
  for (const id of outermost(list, ids)) for (const s of subtree(list, id, idx)) keep.add(s)
  return { items: list.filter((o) => keep.has(o.id)), roots: outermost(list, ids) }
}

/** Pastes a snapshot (new ids, offset leaves) in front. Returns the list and the new root ids. */
export function pasteItems(list, snapshot, offset = 16) {
  const ids = new Map(snapshot.items.map((o) => [o.id, newId(isGroup(o) ? 'grp' : 'obj')]))
  const copies = snapshot.items.map((o) => ({
    ...o,
    id: ids.get(o.id),
    ...(o.groupId && ids.has(o.groupId) ? { groupId: ids.get(o.groupId) } : {}),
    ...(!isGroup(o) && { x: o.x + offset, y: o.y + offset }),
    ...(isGroup(o) && { layerName: `${o.layerName ?? 'Group'} copy` }),
  }))
  // Roots keep their parent only if it still exists
  const existing = new Set(list.map((o) => o.id))
  const fixed = copies.map((o) => (o.groupId && !existing.has(o.groupId) && ![...ids.values()].includes(o.groupId) ? { ...o, groupId: undefined } : o))
  return { list: [...list, ...fixed], roots: snapshot.roots.map((r) => ids.get(r)) }
}

const typeNames = { rect: 'Rectangle', ellipse: 'Ellipse', polygon: 'Vector', image: 'Image', group: 'Group' }

/** What the layers panel calls an object. */
export function layerName(o) {
  if (o.layerName) return o.layerName
  if (o.type === 'section') return `Section ${o.name ?? ''}`.trim()
  if (o.type === 'text') return o.text || 'Text'
  return typeNames[o.type] ?? 'Layer'
}
