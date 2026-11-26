import ICAL from 'ical.js';
import { createHash } from 'node:crypto';
const clean = text => String(text || '').replace(/https?:\/\/\S+/g, '').replace(/[\u0000-\u001f]/g, ' ').slice(0, 200);
const hash = text => createHash('sha256').update(text).digest('hex').slice(0, 24);
function day(time) {
  if (time.isDate || time.zone.tzid === 'floating') return time.toString().slice(0, 10);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(time.toJSDate());
  const p = Object.fromEntries(parts.map(p => [p.type, p.value])); return `${p.year}-${p.month}-${p.day}`;
}
function timeLabel(time) {
  if (time.isDate) return 'All day';
  if (time.zone.tzid === 'floating') return `${(time.hour + 11) % 12 + 1}:${String(time.minute).padStart(2, '0')} ${time.hour >= 12 ? 'PM' : 'AM'}`;
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }).format(time.toJSDate());
}
export function parseFeed(text, { from, until, calendar = 'Family', recipesOnly = false } = {}) {
  if (!text.startsWith('BEGIN:VCALENDAR') || text.length > 2_000_000) throw new Error('Invalid calendar');
  const root = new ICAL.Component(ICAL.parse(text));
  const zones = root.getAllSubcomponents('vtimezone');
  // Timezone service is synchronous and reset per parse to prevent cross-feed pollution.
  ICAL.TimezoneService.reset(); zones.forEach(zone => ICAL.TimezoneService.register(new ICAL.Timezone(zone)));
  const components = root.getAllSubcomponents('vevent'); if (components.length > 5000) throw new Error('Calendar too large');
  const result = [];
  for (const component of components) {
    const event = new ICAL.Event(component);
    const tzid = component.getFirstProperty('dtstart')?.getParameter('tzid');
    if (tzid && tzid !== 'America/New_York' && tzid !== 'UTC' && !ICAL.TimezoneService.get(tzid)) throw new Error('Timezone definition missing');
    if (event.isRecurrenceException() || component.getFirstPropertyValue('status') === 'CANCELLED') continue;
    const recipeURL = String(component.getFirstPropertyValue('url') || '');
    // Verified actual recipes feed: every recipe VEVENT has an app.plantoeat.com /recipes/ URL.
    if (recipesOnly && !/^https:\/\/app\.plantoeat\.com\/recipes\//.test(recipeURL)) continue;
    let occurrences = 0;
    const add = (start, end, item = event) => {
      const date = day(start), endDay = day(end);
      if (endDay < from || date > until || item.component.getFirstPropertyValue('status') === 'CANCELLED') return;
      if (start.zone.tzid !== 'floating' && start.zone.tzid !== 'UTC' && start.zone === ICAL.Timezone.localTimezone) throw new Error('Unsupported timezone');
      const recipe = /^https:\/\/app\.plantoeat\.com\/recipes\//.test(String(item.component.getFirstPropertyValue('url') || recipeURL));
      const identity = hash(event.uid + '|' + date + '|' + start.toString());
      const label = timeLabel(start), match = /^(\d+):(\d+)\s*([AP]M)/.exec(label);
      const minute = match ? (Number(match[1]) % 12) * 60 + Number(match[2]) + (match[3] === 'PM' ? 720 : 0) : -1;
      const base = { id: identity, day: date, time: label, minute, title: clean(item.summary), location: clean(item.location), calendar, recipe, uidHash: hash(event.uid) };
      // Date-only ends are exclusive; spread multi-day events within the bounded display window.
      const final = start.isDate ? new Date(endDay + 'T00:00:00Z').getTime() - 86400000 : new Date(endDay + 'T00:00:00Z').getTime();
      for (let value = new Date(date + 'T00:00:00Z').getTime(), n = 0; value <= Math.max(final, new Date(date + 'T00:00:00Z').getTime()) && n < 31; value += 86400000, n++) {
        const d = new Date(value).toISOString().slice(0, 10); if (d >= from && d <= until) result.push({ ...base, day: d });
      }
    };
    if (!event.startDate) continue;
    if (!event.isRecurring()) add(event.startDate, event.endDate);
    else {
      const iterator = event.iterator(); let next;
      while ((next = iterator.next())) {
        if (++occurrences > 10000) throw new Error('Recurrence expansion limit');
        if (day(next) > until) break;
        const detail = event.getOccurrenceDetails(next); add(detail.startDate, detail.endDate, detail.item);
      }
    }
    if (result.length > 2000) throw new Error('Calendar window too large');
  }
  return result.sort((a, b) => a.day.localeCompare(b.day) || a.minute - b.minute);
}
export function deduplicate(events, meals) {
  const mealIDs = new Set(meals.map(m => m.uidHash));
  return events.filter(e => !e.recipe && !mealIDs.has(e.uidHash));
}
