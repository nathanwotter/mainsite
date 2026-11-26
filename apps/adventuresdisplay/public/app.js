(function () {
  'use strict';
  var C = window.AdventuresDisplayCore, $ = function (id) { return document.getElementById(id); };
  var preferences;
  try {
    var currentSettings = localStorage.getItem('adventuresdisplay.preferences.v3');
    if (currentSettings) preferences = C.settings(JSON.parse(currentSettings));
    else { var previousSettings = JSON.parse(localStorage.getItem('adventuresdisplay.preferences.v2')) || {}; preferences = C.settings(Object.assign({}, previousSettings, { layout: 'kitchen', clock: true, date: true, temperature: true, weeklyDinners: true, dinner: false, liveWeather: true })); localStorage.setItem('adventuresdisplay.preferences.v3', JSON.stringify(preferences)); }
    if (!localStorage.getItem('adventuresdisplay.weather-range.v1')) { preferences.highlow = true; localStorage.setItem('adventuresdisplay.preferences.v3', JSON.stringify(preferences)); localStorage.setItem('adventuresdisplay.weather-range.v1', '1'); }
  } catch (e) { preferences = C.settings(); }
  function preferredPhotoMode() { return preferences.layout === 'kitchen' && preferences.ambient ? 'ambient' : preferences.pure ? 'pure' : 'ambient'; }
  var photos = [
    { id: 'lake', src: '/photos/lake.jpg', alt: 'Still mountain lake in evening light', addedAt: '2026-11-26' },
    { id: 'coast', src: '/photos/coast.jpg', alt: 'Sunlight across quiet ocean waves', addedAt: '2026-10-01' },
    { id: 'mountains', src: '/photos/mountains.jpg', alt: 'A mountain beneath an open sky', addedAt: '2026-09-01' },
    { id: 'coast-video', type: 'video', src: '/videos/coast-demo.mp4', alt: 'A gentle pan across the ocean · sample clip', addedAt: '2026-11-26' }
  ];
  var mode = 'pure', manual = false, cycleStart = Date.now(), lastInteraction = Date.now(), lastSlide = Date.now();
  var currentPhoto = 0, activeLayer = 0, photoBusy = false, photoToken = 0, turn = 0, paused = false;
  var photoHistory = [photos[0].id], historyPosition = 0;
  var layers = [$('photo-a'), $('photo-b')], day = C.zonedDay(new Date()), events = C.sampleEvents(day), meals = C.sampleMeals(day);
  var demo = true, snapshotTime = 0, weatherBusy = false, weatherUpdated = 0, noticeTimeout, offlineLeaseUntil = 0, offlineSnapshot = false;
  var weather = sampleWeather(), returnFocus;
  var video = $('album-video'), videoActive = false, soundUnlocked = false, videoStartedAt = 0, videoTimeout;
  function element(tag, className, text) { var n = document.createElement(tag); if (className) n.className = className; if (text !== undefined) n.textContent = text; return n; }
  function labelDay(date, options) { return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: 'UTC' }, options)).format(new Date(date + 'T12:00:00Z')); }
  function sampleWeather() {
    return { temp: 68, code: 2, text: 'Partly cloudy', high: 72, low: 54, live: false,
      hourly: [68, 70, 71, 72, 70, 67, 64].map(function (t, i) { return { label: i === 0 ? 'Now' : (i + 12) % 12 + 1 + ' PM', temp: t, rain: [5, 5, 10, 10, 15, 10, 5][i] }; }),
      daily: [72, 74, 69, 65, 68, 71, 73].map(function (t, i) { return { day: C.addDays(day, i), high: t, low: [54, 56, 52, 48, 50, 53, 55][i], rain: [10, 20, 60, 30, 10, 5, 15][i] }; }) };
  }
  function notify(text) { clearTimeout(noticeTimeout); $('notice').textContent = text; $('notice').hidden = false; noticeTimeout = setTimeout(function () { $('notice').hidden = true; }, 5000); }
  function reveal() { lastInteraction = Date.now(); $('navigation').hidden = false; $('photo-controls').hidden = mode !== 'pure' && mode !== 'ambient'; }
  document.addEventListener('pointerdown', function () { lastInteraction = Date.now(); });
  document.addEventListener('keydown', function () { lastInteraction = Date.now(); });
  function setMode(next, user) {
    if (!preferences[next]) return;
    mode = next; $('board').dataset.mode = next; $('photos').hidden = next !== 'pure' && next !== 'ambient'; $('today').hidden = next !== 'today'; $('week').hidden = next !== 'week';
    if (next !== 'pure' && next !== 'ambient') { video.pause(); video.muted = true; }
    else if (videoActive && !paused && !video.ended && video.paused) playVideo();
    document.querySelectorAll('[data-mode]').forEach(function (node) { if (node.tagName === 'BUTTON') { if (node.dataset.mode === next) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current'); } });
    $('photo-controls').hidden = $('navigation').hidden || (next !== 'pure' && next !== 'ambient');
    if (user) { manual = true; reveal(); } window.scrollTo(0, 0);
  }
  document.querySelectorAll('button[data-mode]').forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.mode, true); }); });
  document.querySelectorAll('.page').forEach(function (node) { node.addEventListener('click', reveal); });
  function soundControl() {
    var audible = !video.muted;
    $('video-sound').hidden = !videoActive;
    $('photos').classList.toggle('has-video', videoActive);
    $('video-sound-label').textContent = audible ? 'Sound on' : 'Sound off';
    $('video-sound').dataset.sound = audible ? 'on' : 'off';
    $('video-sound').setAttribute('aria-label', audible ? 'Mute clip sound' : 'Enable clip sound');
    $('video-sound').setAttribute('aria-pressed', String(audible));
  }
  video.addEventListener('volumechange', soundControl);
  function stopVideo(unload) { clearTimeout(videoTimeout); video.pause(); video.muted = true; videoActive = false; video.classList.remove('active'); $('video-play').hidden = true; soundControl(); if (unload) { video.removeAttribute('src'); video.load(); } }
  function playVideo() {
    if (!videoActive || paused || !$('background-preview').hidden || (mode !== 'pure' && mode !== 'ambient')) return;
    if (video.paused) videoStartedAt = Date.now();
    video.muted = !(preferences.videoSound && soundUnlocked); soundControl();
    var token = photoToken, promise = video.play(); if (promise) promise.then(function () { if (token === photoToken) $('video-play').hidden = true; }).catch(function () {
      if (!videoActive || token !== photoToken) return;
      if (!video.muted) { video.muted = true; soundControl(); var fallback = video.play(); if (fallback) fallback.catch(function () { $('video-play').hidden = false; }); }
      else $('video-play').hidden = false;
    });
  }
  function rememberPhoto(next, historyTarget) {
    var id = photos[next].id;
    if (historyTarget !== undefined) { historyPosition = historyTarget; return; }
    if (photoHistory[historyPosition] === id) return;
    photoHistory = photoHistory.slice(0, historyPosition + 1);
    photoHistory.push(id);
    if (photoHistory.length > 64) photoHistory.shift();
    historyPosition = photoHistory.length - 1;
  }
  function navigatePhoto(direction) {
    lastInteraction = Date.now();
    if (photoBusy) return;
    for (var h = historyPosition + direction; h >= 0 && h < photoHistory.length; h += direction) {
      var next = photos.findIndex(function (p) { return p.id === photoHistory[h] && (preferences.videos || p.type !== 'video'); });
      if (next >= 0 && next !== currentPhoto) { changePhoto(direction, next, h); return; }
    }
    changePhoto(direction);
  }
  function showVideo(next, token, historyTarget) {
    var item = photos[next]; clearTimeout(videoTimeout);
    videoTimeout = setTimeout(function () { if (token === photoToken) { photoBusy = false; lastSlide = Date.now(); stopVideo(true); notify('Video unavailable. Continuing the frame.'); changePhoto(1); } }, 15000);
    video.onloadeddata = function () {
      if (token !== photoToken) return; clearTimeout(videoTimeout); videoActive = true; currentPhoto = next; rememberPhoto(next, historyTarget); videoStartedAt = Date.now(); lastSlide = Date.now();
      layers[activeLayer].classList.remove('active'); video.classList.add('active'); video.setAttribute('aria-label', item.alt || 'Album video'); $('photo-count').textContent = next + 1 + ' / ' + photos.length;
      photoBusy = false; playVideo();
    };
    video.onerror = function () { if (token !== photoToken) return; clearTimeout(videoTimeout); photoBusy = false; currentPhoto = next; stopVideo(true); lastSlide = Date.now(); notify('This video could not play. Skipping to the next album item.'); changePhoto(1); };
    video.muted = true; video.src = item.src; video.load();
  }
  function changePhoto(direction, selected, historyTarget) {
    if (photoBusy || !photos.length) return;
    var eligible = photos.map(function (p, index) { return { item: p, index: index }; }).filter(function (p) { return preferences.videos || p.item.type !== 'video'; });
    if (!eligible.length || (eligible.length < 2 && currentPhoto >= 0 && selected === undefined)) return;
    turn++;
    var position = eligible.findIndex(function (p) { return p.index === currentPhoto; });
    var chosen = position < 0 ? 0 : direction === -1 ? (position + eligible.length - 1) % eligible.length : preferences.shuffle ? C.choosePhoto(eligible.map(function (p) { return p.item; }), position, turn) : C.nextIndex(position, eligible.length, false);
    var next = selected === undefined ? eligible[chosen].index : selected;
    var token = ++photoToken; photoBusy = true;
    if (photos[next].type === 'video') { showVideo(next, token, historyTarget); return; }
    var incoming = layers[1 - activeLayer];
    var timeout = setTimeout(function () { if (token === photoToken) { photoBusy = false; photoToken++; lastSlide = Date.now(); } }, 10000);
    incoming.onload = function () {
      if (token !== photoToken) return; clearTimeout(timeout);
      incoming.alt = photos[next].alt || 'Album photograph'; incoming.removeAttribute('aria-hidden'); layers[activeLayer].setAttribute('aria-hidden', 'true');
      stopVideo(false); layers[activeLayer].classList.remove('active'); incoming.classList.add('active'); activeLayer = 1 - activeLayer; currentPhoto = next; rememberPhoto(next, historyTarget); lastSlide = Date.now();
      $('photo-count').textContent = (next + 1) + ' / ' + photos.length;
      setTimeout(function () { if (token !== photoToken) return; photoBusy = false; video.removeAttribute('src'); video.load(); }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1900);
    };
    incoming.onerror = function () { clearTimeout(timeout); if (token !== photoToken) return; photoBusy = false; lastSlide = Date.now(); notify('Photo unavailable. Keeping the current photograph.'); };
    incoming.src = photos[next].src;
  }
  $('next').addEventListener('click', function () { navigatePhoto(1); }); $('previous').addEventListener('click', function () { navigatePhoto(-1); });
  $('pause-slides').addEventListener('click', function () { paused = !paused; this.textContent = paused ? '▶' : 'Ⅱ'; this.setAttribute('aria-label', paused ? 'Resume slideshow' : 'Pause slideshow'); lastSlide = Date.now(); if (paused) video.pause(); else playVideo(); });
  video.addEventListener('ended', function () { video.muted = true; soundControl(); if (!paused) changePhoto(1); });
  $('video-play').addEventListener('click', function () { playVideo(); reveal(); });
  $('video-sound').addEventListener('click', function (e) { e.stopPropagation(); lastInteraction = Date.now(); preferences.videoSound = video.muted; soundUnlocked = preferences.videoSound; video.muted = !preferences.videoSound; soundControl(); try { localStorage.setItem('adventuresdisplay.preferences.v3', JSON.stringify(preferences)); } catch (e) { /* Apply for this visit. */ } if (paused) return; var p = video.play(); if (p) p.catch(function () { video.muted = true; soundControl(); $('video-play').hidden = false; }); });
  $('demo-video').addEventListener('click', function () { if (!preferences.videos) { notify('Enable album videos in Display preferences first.'); return; } var index = photos.findIndex(function (p) { return p.type === 'video'; }); if (index >= 0) changePhoto(1, index); });
  var touchX = null, touchY = null, touchId = null, suppressTapUntil = 0;
  function cancelSwipe() { touchX = null; touchY = null; touchId = null; }
  $('photo-stage').addEventListener('touchstart', function (e) {
    lastInteraction = Date.now();
    if (e.touches.length !== 1) { cancelSwipe(); return; }
    var touch = e.touches[0]; touchX = touch.clientX; touchY = touch.clientY; touchId = touch.identifier;
  }, { passive: true });
  $('photo-stage').addEventListener('touchmove', function (e) {
    if (touchX === null) return;
    if (e.touches.length !== 1) { cancelSwipe(); return; }
    var touch = e.touches[0], dx = touch.clientX - touchX, dy = touch.clientY - touchY;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.25 && e.cancelable) e.preventDefault();
  }, { passive: false });
  $('photo-stage').addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var touch = Array.prototype.find.call(e.changedTouches, function (t) { return t.identifier === touchId; });
    if (!touch) return;
    var dx = touch.clientX - touchX, dy = touch.clientY - touchY;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      suppressTapUntil = Date.now() + 700;
      navigatePhoto(dx > 0 ? -1 : 1);
      if (e.cancelable) e.preventDefault();
    }
    cancelSwipe();
  }, { passive: false });
  $('photo-stage').addEventListener('touchcancel', cancelSwipe, { passive: true });
  function tapPhoto() { if (Date.now() < suppressTapUntil) return; if ($('navigation').hidden) reveal(); else navigatePhoto(1); }
  $('photo-stage').addEventListener('click', tapPhoto);
  $('photo-stage').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapPhoto(); } if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); navigatePhoto(e.key === 'ArrowRight' ? 1 : -1); } });
  function visibleEvents() { return events.filter(function (e) { return preferences[String(e.calendar).toLowerCase()] !== false; }); }
  function eventRow(event) { var row = element('div', 'agenda-item ' + String(event.calendar).toLowerCase()); row.appendChild(element('time', '', event.time)); row.appendChild(element('h3', '', event.title)); if (event.location) row.appendChild(element('p', '', event.location)); return row; }
  function renderInformation() {
    var visible = visibleEvents(), todayEvents = visible.filter(function (e) { return e.day === day; }), todayMeals = meals.filter(function (m) { return m.day === day; });
    $('today-events').textContent = ''; todayEvents.slice(0, 4).forEach(function (e) { $('today-events').appendChild(eventRow(e)); }); if (!todayEvents.length) $('today-events').appendChild(element('p', 'fineprint', 'A little room in the day. No events planned.'));
    $('today-meals').textContent = ''; todayMeals.slice(0, 4).forEach(function (m) { var meal = element('div', 'meal'); meal.appendChild(element('h3', '', m.title)); $('today-meals').appendChild(meal); });
    if (!todayMeals.length) $('today-meals').appendChild(element('p', 'fineprint', 'No dinner planned. A little room for inspiration.'));
    document.querySelectorAll('.meal-source').forEach(function (n) { n.textContent = demo ? 'Sample dinner plan · Plan to Eat connects privately' : 'Plan to Eat · Dinner plan'; });
    var upcoming = visible.filter(function (e) { return e.day === C.addDays(day, 1); }); $('tomorrow').textContent = '';
    if (upcoming.length) { $('tomorrow').appendChild(element('h3', '', 'Tomorrow, a little ahead')); $('tomorrow').appendChild(element('p', '', upcoming.slice(0, 2).map(function (e) { return e.time + ' · ' + e.title; }).join(' / '))); }
    var nowParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()).split(':'), minutes = Number(nowParts[0]) * 60 + Number(nowParts[1]);
    var nextEvent = todayEvents.filter(function (e) { var match = /^(\d+):(\d+)\s*([AP]M)/.exec(e.time); return match && ((Number(match[1]) % 12) * 60 + Number(match[2]) + (match[3] === 'PM' ? 720 : 0)) >= minutes; })[0]; $('next-event').textContent = nextEvent ? nextEvent.time + ' · ' + nextEvent.title : 'Nothing else on the calendar';
    $('dinner-text').textContent = todayMeals.length ? todayMeals.map(function (m) { return m.title; }).join(' · ') : 'No dinner planned';
    $('dinner-label').textContent = demo ? 'TONIGHT’S DINNER · SAMPLE' : 'TONIGHT’S DINNER';
    $('dinner-week-label').textContent = demo ? 'DINNERS THIS WEEK · SAMPLE' : 'DINNERS THIS WEEK';
    $('dinner-week-list').textContent = '';
    for (var dinnerDay = 0; dinnerDay < 7; dinnerDay++) {
      var dinnerDate = C.addDays(day, dinnerDay), dinners = meals.filter(function (meal) { return meal.day === dinnerDate; });
      if (!dinners.length) continue;
      var dinnerRow = element('li', 'dinner-day' + (dinnerDay === 0 ? ' dinner-today' : ''));
      var dinnerTime = element('time', '', dinnerDay === 0 ? 'Today' : labelDay(dinnerDate, { weekday: 'short' })); dinnerTime.dateTime = dinnerDate; dinnerRow.appendChild(dinnerTime);
      dinnerRow.appendChild(element('span', 'dinner-name', dinners.map(function (meal) { return meal.title; }).join(' · ')));
      $('dinner-week-list').appendChild(dinnerRow);
    }
    $('dinner-week-overlay').classList.toggle('few-dinners', $('dinner-week-list').children.length <= 3);
    $('dinner-week-overlay').hidden = !preferences.weeklyDinners || !$('dinner-week-list').children.length;
    $('week-days').textContent = '';
    for (var i = 0; i < 7; i++) {
      var date = C.addDays(day, i), column = element('section', 'week-day'), forecast = weather.daily.filter(function (d) { return d.day === date; })[0];
      var dateBlock = element('div', 'week-date-block'); dateBlock.appendChild(element('h2', '', i === 0 ? 'Today' : labelDay(date, { weekday: 'short' }))); dateBlock.appendChild(element('span', 'week-date', labelDay(date, { month: 'short', day: 'numeric' }))); column.appendChild(dateBlock);
      var weatherNode = element('div', 'week-forecast'); if (forecast) { weatherNode.appendChild(element('strong', '', forecast.high + '°')); weatherNode.appendChild(element('span', '', forecast.low + '° low · ' + forecast.rain + '% rain')); } else weatherNode.appendChild(element('span', '', 'Forecast unavailable')); column.appendChild(weatherNode);
      var agenda = element('div', 'week-agenda'); visible.filter(function (e) { return e.day === date; }).slice(0, 2).forEach(function (e) { agenda.appendChild(eventRow(e)); }); column.appendChild(agenda);
      var planned = meals.filter(function (m) { return m.day === date; });
      var mealNode = element('div', 'week-meal'); mealNode.appendChild(element('span', '', 'DINNER'));
      if (!planned.length) mealNode.appendChild(element('p', '', 'Unplanned'));
      planned.slice(0, 1).forEach(function (m) { mealNode.appendChild(element('p', '', m.title + (planned.length > 1 ? ' + ' + (planned.length - 1) + ' more' : ''))); }); column.appendChild(mealNode); $('week-days').appendChild(column);
    }
  }
  function renderWeather() {
    $('temperature').textContent = weather.temp + '°'; $('overlay-condition').textContent = weather.text;
    var icon = weather.code >= 51 ? '<path d="M5 16h14M8 21l-1 2m6-2-1 2m6-2-1 2M6 16a4 4 0 010-8 6 6 0 0111-1 4 4 0 012 9"/>' : weather.code > 2 ? '<path d="M5 18a5 5 0 010-10 7 7 0 0113-1 5 5 0 011 11Z"/>' : '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>';
    if (weather.code === 1 || weather.code === 2) icon = '<circle cx="8" cy="8" r="3"/><path d="M8 1v2M1 8h2M3 3l1.5 1.5M13 3l-1.5 1.5M6 20h12a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1A3.5 3.5 0 0 0 6 20Z"/>';
    $('weather-icon').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">' + icon + '</svg>';
    $('highlow').textContent = 'High ' + weather.high + '° · Low ' + weather.low + '°';
    var source = weather.live ? (weather.stale ? 'Weather stale' : 'Updated ' + new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }).format(new Date(weatherUpdated))) : 'Sample weather';
    $('weather-source').textContent = source; $('weather-source').hidden = weather.live && !weather.stale; document.querySelector('.current-temp').textContent = weather.temp + '°'; document.querySelector('.current-condition').textContent = weather.text;
    document.querySelector('.current-range').textContent = 'High ' + weather.high + '° · Low ' + weather.low + '°'; document.querySelectorAll('.forecast-source').forEach(function (n) { n.textContent = preferences.location + ' · ' + source; });
    $('hourly').textContent = ''; weather.hourly.forEach(function (h) { var node = element('div', 'hour'); node.appendChild(element('span', '', h.label)); node.appendChild(element('strong', '', h.temp + '°')); node.appendChild(element('span', '', h.rain + '% rain')); $('hourly').appendChild(node); }); renderInformation();
  }
  function loadWeather() {
    if (weatherBusy) return; weatherBusy = true; weatherUpdated = Date.now(); var controller = new AbortController(), timeout = setTimeout(function () { controller.abort(); }, 12000);
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + preferences.latitude + '&longitude=' + preferences.longitude + '&current=temperature_2m,weather_code&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FNew_York&forecast_days=7', { signal: controller.signal, credentials: 'omit' }).then(function (r) { if (!r.ok) throw new Error(); return r.json(); }).then(function (data) {
      if (!data.current || !data.daily || !data.hourly || !Number.isFinite(data.current.temperature_2m)) throw new Error();
      var start = Math.max(0, data.hourly.time.findIndex(function (t) { return t.slice(0, 13) >= data.current.time.slice(0, 13); }));
      weather = { temp: Math.round(data.current.temperature_2m), code: data.current.weather_code, text: C.condition(data.current.weather_code), high: Math.round(data.daily.temperature_2m_max[0]), low: Math.round(data.daily.temperature_2m_min[0]), live: true,
        hourly: data.hourly.time.slice(start, start + 7).map(function (t, i) { var h = Number(t.slice(11, 13)); return { label: i === 0 ? 'Now' : ((h + 11) % 12 + 1) + (h >= 12 ? ' PM' : ' AM'), temp: Math.round(data.hourly.temperature_2m[start + i]), rain: data.hourly.precipitation_probability[start + i] }; }),
        daily: data.daily.time.map(function (d, i) { return { day: d, high: Math.round(data.daily.temperature_2m_max[i]), low: Math.round(data.daily.temperature_2m_min[i]), rain: data.daily.precipitation_probability_max[i] }; }) }; renderWeather();
    }).catch(function () { weather.stale = true; renderWeather(); notify('Weather could not refresh. ' + (weather.live ? 'Showing the last forecast.' : 'Showing labeled sample weather.')); }).finally(function () { clearTimeout(timeout); weatherBusy = false; });
  }
  var fields = { interval: ['Seconds per photograph', 10, 600], inactivity: ['Return to photos after (seconds)', 15, 600], pureSeconds: ['Pure Photos duration (seconds)', 15, 3600], ambientSeconds: ['Ambient Photos duration (seconds)', 15, 3600], todaySeconds: ['Today duration (seconds)', 15, 300], weekSeconds: ['Weekly Outlook duration (seconds)', 15, 300], outlookEvery: ['Show outlook after this many photo cycles', 1, 12], nightStart: ['Dim from hour (Eastern, 0–23)', 0, 23], nightEnd: ['Dim until hour (Eastern, 0–23)', 0, 23], location: ['Weather location name'], latitude: ['Latitude', -90, 90], longitude: ['Longitude', -180, 180] };
  Object.keys(fields).forEach(function (key) { var label = element('label', '', fields[key][0]), input = element('input'); input.name = key; input.required = true; input.type = fields[key].length > 1 ? 'number' : 'text'; if (fields[key].length > 1) { input.min = fields[key][1]; input.max = fields[key][2]; input.step = key === 'latitude' || key === 'longitude' ? 'any' : '1'; } label.appendChild(input); $('preference-fields').appendChild(label); });
  var selects = { background: ['Photo background', [['evergreen', 'Original green'], ['charcoal', 'Charcoal'], ['taupe', 'Warm taupe'], ['slate', 'Slate blue'], ['ink', 'Near-black']]], fit: ['Photo layout', [['contain', 'Fit · preserve the whole photograph'], ['cover', 'Fill · may crop edges']]], layout: ['Overlay placement', [['kitchen', 'Kitchen corners · weekly dinners'], ['corners', 'Quiet corners'], ['bottom', 'Lower edge'], ['minimal', 'Essentials only']]], fontSize: ['Type size', [['normal', 'Comfortable'], ['large', 'Larger']]] };
  Object.keys(selects).forEach(function (key) { var label = element('label', '', selects[key][0]), select = element('select'); select.name = key; selects[key][1].forEach(function (pair) { var opt = element('option', '', pair[1]); opt.value = pair[0]; select.appendChild(opt); }); label.appendChild(select); $('preference-fields').appendChild(label); });
  var checks = { pure: 'Pure Photos', ambient: 'Ambient Photos', today: 'Today', week: 'Weekly Outlook', clock: 'Clock', date: 'Date', temperature: 'Temperature & icon', highlow: 'Daily high & low', event: 'Next calendar event', dinner: 'Tonight’s dinner', weeklyDinners: 'Seven-day dinner overlay', shuffle: 'Favor recent photos, resurface older ones', videos: 'Play album videos', videoSound: 'Allow clip sound after a tap', night: 'Nighttime visual dimming', liveWeather: 'Live weather', family: 'Family calendar', home: 'Home calendar', activities: 'Activities calendar' };
  Object.keys(checks).forEach(function (key) { var label = element('label'), input = element('input'); input.name = key; input.type = 'checkbox'; label.appendChild(input); label.appendChild(document.createTextNode(checks[key])); $('preference-checks').appendChild(label); });
  function closePreferences() { $('preferences').hidden = true; lastInteraction = Date.now(); if (returnFocus) returnFocus.focus(); }
  $('preferences-open').addEventListener('click', function () { returnFocus = document.activeElement; Object.keys(preferences).forEach(function (key) { var field = $('preferences-form').elements.namedItem(key); if (field) { if (field.type === 'checkbox') field.checked = preferences[key]; else field.value = preferences[key]; } }); $('photo-share').textContent = C.photoShare(preferences) + '% of automatic rotation is photographs.'; $('preferences').hidden = false; $('preferences-close').focus(); });
  $('preferences-close').addEventListener('click', closePreferences);
  $('preferences').addEventListener('keydown', function (e) { if (e.key === 'Escape') closePreferences(); if (e.key === 'Tab') { var nodes = this.querySelectorAll('button,input,select'), first = nodes[0], last = nodes[nodes.length - 1]; if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); } } });
  $('preferences-form').addEventListener('submit', function (e) { e.preventDefault(); var values = {}; Object.keys(preferences).forEach(function (key) { var f = $('preferences-form').elements.namedItem(key); if (f) values[key] = f.type === 'checkbox' ? f.checked : f.value; }); preferences = C.settings(values); try { localStorage.setItem('adventuresdisplay.background.v1', preferences.background); localStorage.setItem('adventuresdisplay.preferences.v3', JSON.stringify(preferences)); } catch (error) { notify('Preferences apply until this page closes; local storage is unavailable.'); } applyPreferences(); cycleStart = Date.now(); manual = false; setMode(preferredPhotoMode()); closePreferences(); if (preferences.liveWeather) loadWeather(); });
  $('refresh-weather').addEventListener('click', loadWeather);
  var backgroundColors = { evergreen: '#12251e', charcoal: '#252628', taupe: '#403832', slate: '#303e4b', ink: '#101113' };
  var backgroundFocus;
  function closeBackgrounds(resume) {
    $('background-preview').hidden = true;
    $('background-options').querySelectorAll('img').forEach(function (img) { img.removeAttribute('src'); });
    lastInteraction = lastSlide = Date.now();
    if (resume !== false) { playVideo(); if (backgroundFocus) backgroundFocus.focus(); }
  }
  function openBackgrounds() {
    if (!$('locked').hidden) return;
    backgroundFocus = document.activeElement;
    if (!$('preferences').hidden) closePreferences();
    video.pause(); video.muted = true;
    $('background-options').textContent = '';
    var source = layers[activeLayer].getAttribute('src');
    [['charcoal', 'Charcoal'], ['taupe', 'Warm taupe'], ['slate', 'Slate blue'], ['ink', 'Near-black']].forEach(function (shade) {
      var button = element('button', 'background-option'); button.type = 'button'; button.dataset.background = shade[0]; button.style.backgroundColor = backgroundColors[shade[0]]; button.setAttribute('aria-label', 'Use ' + shade[1] + ' background'); button.setAttribute('aria-pressed', String(preferences.background === shade[0]));
      var label = element('span', 'background-name', shade[1]); label.appendChild(element('small', '', backgroundColors[shade[0]].toUpperCase())); button.appendChild(label);
      var frame = element('span', 'background-photo'); if (source) { var img = element('img'); img.src = source; img.alt = 'Current album photograph'; frame.appendChild(img); } button.appendChild(frame);
      button.addEventListener('click', function () { preferences.background = shade[0]; try { localStorage.setItem('adventuresdisplay.background.v1', shade[0]); localStorage.setItem('adventuresdisplay.preferences.v3', JSON.stringify(preferences)); } catch (e) { notify('Background applies until this page closes.'); } applyPreferences(); closeBackgrounds(); });
      $('background-options').appendChild(button);
    });
    $('navigation').hidden = true; $('photo-controls').hidden = true;
    $('background-preview').hidden = false; $('backgrounds-close').focus(); lastInteraction = Date.now();
  }
  $('backgrounds-open').addEventListener('click', openBackgrounds);
  $('backgrounds-close').addEventListener('click', function () { closeBackgrounds(); });
  $('background-preview').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeBackgrounds();
    if (e.key === 'Tab') { var nodes = this.querySelectorAll('button'), first = nodes[0], last = nodes[nodes.length - 1]; if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); } }
  });
  function applyPreferences() { document.documentElement.style.setProperty('--frame-background', backgroundColors[preferences.background]); layers.forEach(function (p) { p.style.objectFit = preferences.fit; }); video.style.objectFit = preferences.fit; if (!preferences.videoSound) { video.muted = true; soundUnlocked = false; } if (!preferences.videos && videoActive) { stopVideo(true); currentPhoto = -1; photoBusy = false; changePhoto(1); } soundControl(); $('board').className = 'layout-' + preferences.layout + (preferences.fontSize === 'large' ? ' large-type' : '');
    ['clock', 'date', 'highlow'].forEach(function (key) { $(key).hidden = !preferences[key]; }); document.querySelector('.weather-overlay').hidden = !preferences.temperature; $('event-overlay').hidden = !preferences.event; $('dinner-overlay').hidden = !preferences.dinner || preferences.weeklyDinners; $('dinner-week-overlay').hidden = !preferences.weeklyDinners;
    document.querySelectorAll('button[data-mode]').forEach(function (b) { b.hidden = !preferences[b.dataset.mode]; }); renderInformation(); updateClock(); }
  function updateClock() { var now = new Date(); $('clock').textContent = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }).format(now).replace(/\s[AP]M$/, ''); $('clock').dateTime = now.toISOString(); $('date').textContent = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric' }).format(now); document.querySelectorAll('.date-label').forEach(function (n) { n.textContent = $('date').textContent; }); var h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/New_York', hour: '2-digit', hourCycle: 'h23' }).format(now)); var night = preferences.nightStart > preferences.nightEnd ? h >= preferences.nightStart || h < preferences.nightEnd : h >= preferences.nightStart && h < preferences.nightEnd; $('night-shade').hidden = !preferences.night || !night; var d = C.zonedDay(now); if (d !== day) { day = d; if (demo) { events = C.sampleEvents(day); meals = C.sampleMeals(day); } renderInformation(); } }
  function loadSnapshot() {
    snapshotTime = Date.now(); fetch('/api/snapshot', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { if (r.status === 401) { lockDisplay(); throw new Error(); } if (!r.ok) return null; return r.json(); }).then(function (data) {
      if (!data || data.demo) return; demo = false; $('demo-status').hidden = true; offlineLeaseUntil = data.offlineLeaseUntil || 0; offlineSnapshot = !!data.offline; $('locked').hidden = true; events = data.events || []; meals = data.meals || []; $('sample-label').textContent = data.stale ? 'Sync interrupted · last saved information' : 'Household display'; $('data-source').textContent = data.stale ? 'Last saved information · sync interrupted' : 'Household calendars & Plan to Eat';
      if (data.preferences) { preferences = C.settings(data.preferences); try { var deviceBackground = localStorage.getItem('adventuresdisplay.background.v1'); if (Object.prototype.hasOwnProperty.call(backgroundColors, deviceBackground)) preferences.background = deviceBackground; } catch (e) { /* Use household defaults when storage is unavailable. */ } applyPreferences(); }
      $('demo-video').hidden = true;
      if (Array.isArray(data.photos)) { var oldId = photos[currentPhoto] && photos[currentPhoto].id; photos = data.photos; var retained = photos.findIndex(function (p) { return p.id === oldId; }); currentPhoto = retained; if (retained < 0) { photoHistory = []; historyPosition = -1; photoToken++; stopVideo(true); photoBusy = false; layers.forEach(function (layer) { layer.removeAttribute('src'); layer.alt = ''; }); if (photos.length) changePhoto(1); else notify('Your album is empty. Connect a photo source in administration.'); } $('photo-count').textContent = photos.length ? Math.max(1, currentPhoto + 1) + ' / ' + photos.length : 'No album items'; }
      renderInformation(); if (data.stale) notify('A source could not sync. Showing last saved information.');
    }).catch(function () { /* Preserve loaded content during network interruption. */ });
  }
  function lockDisplay() { closeBackgrounds(false); $('locked').hidden = false; $('photos').hidden = true; photoToken++; stopVideo(true); photoHistory = []; historyPosition = -1; events = []; meals = []; photos = []; layers.forEach(function (layer) { layer.removeAttribute('src'); layer.alt = ''; }); renderInformation(); }
  function tick() { var now = Date.now(); updateClock(); if (!document.hidden && $('locked').hidden) {
    if (!demo && (offlineSnapshot || !navigator.onLine) && (!offlineLeaseUntil || offlineLeaseUntil <= now)) { lockDisplay(); return; }
    if (!manual && $('preferences').hidden && $('background-preview').hidden && !videoActive) { var scheduled = C.modeAt(preferences, (now - cycleStart) / 1000); if (mode !== scheduled) setMode(scheduled); }
    if ((mode === 'pure' || mode === 'ambient') && !paused && !videoActive && $('background-preview').hidden && now - lastSlide >= preferences.interval * 1000) changePhoto(1);
    if (videoActive && !paused && $('background-preview').hidden && (mode === 'pure' || mode === 'ambient') && now - videoStartedAt > 105000) { notify('Skipping a stalled video.'); changePhoto(1); }
    if (now - lastInteraction > preferences.inactivity * 1000) { if (!$('background-preview').hidden) closeBackgrounds(); if (!$('preferences').hidden) closePreferences(); if (manual) { manual = false; cycleStart = now; setMode(preferredPhotoMode()); } $('navigation').hidden = true; $('photo-controls').hidden = true; }
    else if (now - lastInteraction > 8000) { $('navigation').hidden = true; $('photo-controls').hidden = true; }
    if (preferences.liveWeather && now - weatherUpdated >= 900000 && navigator.onLine) loadWeather();
    if (now - snapshotTime >= 900000 && navigator.onLine) loadSnapshot();
  } }
  document.addEventListener('visibilitychange', function () { if (document.hidden) { video.pause(); video.muted = true; } else { lastSlide = Date.now(); videoStartedAt = Date.now(); updateClock(); playVideo(); if (Date.now() - snapshotTime > 900000) loadSnapshot(); } });
  window.addEventListener('online', function () { loadSnapshot(); if (preferences.liveWeather) loadWeather(); });
  window.addEventListener('offline', function () { notify('Offline · using saved photographs. Information may be out of date.'); });
  applyPreferences(); renderWeather(); setMode(preferredPhotoMode()); loadSnapshot(); if (preferences.liveWeather) loadWeather(); setInterval(tick, 1000);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(function () { /* The online frame remains available. */ });
})();
