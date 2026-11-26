(function (root) {
  'use strict';
  var defaults = { interval: 45, inactivity: 60, fit: 'contain', background: 'evergreen', shuffle: true, clock: true, date: true, temperature: true, highlow: true, event: false, dinner: false, weeklyDinners: true, night: true, fontSize: 'normal', liveWeather: true, layout: 'kitchen', pure: true, ambient: true, rotatePure: false, today: true, week: true, pureSeconds: 270, ambientSeconds: 270, todaySeconds: 30, weekSeconds: 30, outlookEvery: 1, nightStart: 22, nightEnd: 7, latitude: 35.7796, longitude: -78.6382, location: 'Raleigh, NC', family: true, home: true, activities: true, videos: true, videoSound: false };
  function settings(input) {
    var result = Object.assign({}, defaults);
    if (!input || typeof input !== 'object') return result;
    Object.keys(defaults).forEach(function (key) {
      if (typeof defaults[key] === 'boolean' && typeof input[key] === 'boolean') result[key] = input[key];
    });
    ['interval', 'inactivity', 'pureSeconds', 'ambientSeconds', 'todaySeconds', 'weekSeconds', 'outlookEvery', 'nightStart', 'nightEnd', 'latitude', 'longitude'].forEach(function (key) {
      var value = Number(input[key]);
      var ranges = { interval: [10, 600], inactivity: [15, 600], pureSeconds: [15, 3600], ambientSeconds: [15, 3600], todaySeconds: [15, 300], weekSeconds: [15, 300], outlookEvery: [1, 12], nightStart: [0, 23], nightEnd: [0, 23], latitude: [-90, 90], longitude: [-180, 180] };
      if (input[key] !== undefined && Number.isFinite(value) && value >= ranges[key][0] && value <= ranges[key][1]) result[key] = key === 'latitude' || key === 'longitude' ? value : Math.round(value);
    });
    if (['contain', 'cover'].indexOf(input.fit) >= 0) result.fit = input.fit;
    if (['evergreen', 'charcoal', 'taupe', 'slate', 'ink'].indexOf(input.background) >= 0) result.background = input.background;
    if (['normal', 'large'].indexOf(input.fontSize) >= 0) result.fontSize = input.fontSize;
    if (['kitchen', 'corners', 'bottom', 'minimal'].indexOf(input.layout) >= 0) result.layout = input.layout;
    if (typeof input.location === 'string' && input.location.trim()) result.location = input.location.trim().slice(0, 70);
    if (!result.pure && !result.ambient) result.pure = true;
    return result;
  }
  function recipeURL(value) {
    try { var url = new URL(value); if (url.origin !== 'https://app.plantoeat.com' || url.username || url.password || !/^\/recipes\/\d+\/?$/.test(url.pathname)) return ''; return url.origin + url.pathname; } catch (e) { return ''; }
  }
  function nextIndex(current, length, shuffle, random) {
    if (length < 2) return 0;
    return shuffle ? (current + 1 + Math.floor((random || Math.random)() * (length - 1))) % length : (current + 1) % length;
  }
  function zonedDay(date) {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    var values = {};
    parts.forEach(function (part) { values[part.type] = part.value; });
    return values.year + '-' + values.month + '-' + values.day;
  }
  function addDays(day, count) {
    var d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + count); return d.toISOString().slice(0, 10);
  }
  function sampleEvents(day) {
    return [
      { day: day, time: 'All day', title: 'A little time together', location: 'Household calendar', calendar: 'Family', color: 'sage' },
      { day: day, time: '4:30 PM', title: 'Walk around the lake', location: 'Lake Johnson Park', calendar: 'Family', color: 'sage' },
      { day: day, time: '6:00 PM', title: 'Dinner with the neighbors', location: 'At home', calendar: 'Home', color: 'peach' },
      { day: addDays(day, 1), time: '9:00 AM', title: 'Farmers market', location: 'State Farmers Market', calendar: 'Home', color: 'peach' },
      { day: addDays(day, 2), time: '10:30 AM', title: 'Library & coffee', location: 'Village Regional Library', calendar: 'Family', color: 'sage' },
      { day: addDays(day, 4), time: '5:00 PM', title: 'Soccer practice', location: 'Neighborhood field', calendar: 'Activities', color: 'lavender' }
    ];
  }
  function condition(code) {
    if (code === 0) return 'Clear skies';
    if (code <= 3) return 'Partly cloudy';
    if (code <= 48) return 'Foggy';
    if (code <= 67) return 'Rain';
    if (code <= 77) return 'Snow';
    if (code <= 82) return 'Showers';
    if (code <= 86) return 'Snow showers';
    return 'Thunderstorms';
  }
  function rotation(p) {
    var steps = [];
    for (var c = 0; c < p.outlookEvery; c++) {
      (p.layout === 'kitchen' ? ['ambient', 'pure'] : ['pure', 'ambient']).forEach(function (mode) { if (p[mode]) { var scheduledMode = mode === 'pure' && p.ambient && !p.rotatePure ? 'ambient' : mode; steps.push({ mode: scheduledMode, seconds: p[mode + 'Seconds'] }); } });
    }
    ['today', 'week'].forEach(function (mode) { if (p[mode]) steps.push({ mode: mode, seconds: p[mode + 'Seconds'] }); });
    return steps;
  }
  function modeAt(p, seconds) {
    var steps = rotation(p), total = steps.reduce(function (sum, step) { return sum + step.seconds; }, 0), cursor = Math.max(0, seconds) % total;
    for (var i = 0; i < steps.length; i++) { if (cursor < steps[i].seconds) return steps[i].mode; cursor -= steps[i].seconds; }
    return steps[0].mode;
  }
  function photoShare(p) { var steps = rotation(p), total = 0, photos = 0; steps.forEach(function (s) { total += s.seconds; if (s.mode === 'pure' || s.mode === 'ambient') photos += s.seconds; }); return Math.round(photos / total * 100); }
  function createPhotoShuffle() {
    var known = [], remaining = [], recent = [];
    return { next: function (photos, current, random) {
      if (!photos.length) return -1;
      var ids = photos.map(function (photo) { return photo.id; }), currentId = ids[current];
      remaining = remaining.filter(function (id) { return ids.indexOf(id) >= 0 && id !== currentId; });
      ids.forEach(function (id) { if (known.indexOf(id) < 0 && id !== currentId) remaining.push(id); });
      known = ids.slice();
      recent = recent.filter(function (id) { return ids.indexOf(id) >= 0; });
      if (currentId && recent[recent.length - 1] !== currentId) recent.push(currentId);
      // Keep one third of the album out of the first choices of the next pass.
      var buffer = Math.max(1, Math.floor(ids.length / 3));
      recent = recent.slice(-buffer);
      if (!remaining.length) remaining = ids.slice();
      var candidates = remaining.filter(function (id) { return id !== currentId && recent.indexOf(id) < 0; });
      if (!candidates.length) candidates = remaining.filter(function (id) { return id !== currentId; });
      if (!candidates.length) return current >= 0 ? current : 0;
      var chosen = candidates[Math.floor((random || Math.random)() * candidates.length)];
      remaining.splice(remaining.indexOf(chosen), 1);
      return ids.indexOf(chosen);
    } };
  }
  function sampleMeals(day) { return [
    { day: day, title: 'Lemon chicken & herby potatoes' },
    { day: addDays(day, 1), title: 'Mushroom & spinach pasta' }, { day: addDays(day, 2), title: 'Black bean tacos' },
    { day: addDays(day, 3), title: 'Leftover night' }, { day: addDays(day, 5), title: 'Tomato soup & sourdough' }
  ]; }
  function byteRange(header, total) {
    if (!header) return null;
    var match = /^bytes=(\d*)-(\d*)$/.exec(header);
    if (!match || (!match[1] && !match[2]) || total <= 0) return false;
    var start = match[1] ? Number(match[1]) : Math.max(0, total - Number(match[2]));
    var end = match[1] && match[2] ? Math.min(total - 1, Number(match[2])) : total - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= total) return false;
    return { start: start, end: end };
  }
  var api = { recipeURL: recipeURL, defaults: defaults, settings: settings, nextIndex: nextIndex, zonedDay: zonedDay, addDays: addDays, sampleEvents: sampleEvents, condition: condition, rotation: rotation, modeAt: modeAt, photoShare: photoShare, createPhotoShuffle: createPhotoShuffle, sampleMeals: sampleMeals, byteRange: byteRange };
  root.AdventuresDisplayCore = api;
})(typeof window === 'undefined' ? globalThis : window);
