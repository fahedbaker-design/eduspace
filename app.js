/* EduSpace offline — 0.11.0: one version number with the panel (MAJOR.MINOR.PATCH); a teaching assistant's device (only his courses, his permissions: «can», read-only items); a warning when the panel's major version differs. 0.5.4: names of naming_v1.md («سجل الدرجات»، «استيراد من مودل»، «كود الربط»). 0.5.3: the sync state on the right under the title; the version under the mark; each layer of the progress bar has its own bubble. 0.5.2: round buttons on the right, the mark alone on the left; the sync state under the title; home cards at the bottom; the progress bar tells its layers on a tap; a new version reloads itself. 0.5.1: the version next to the mark. 0.5: two-way sync — every change is a record in the outbox (grade, section, publish, removal) with the value it started from; «مزامنة الآن» sends them, then downloads; a cell changed in both places comes back as a conflict to decide. 0.4: linked to EduSpace (read only: «تنزيل بياناتي» brings the real courses; editing returns with two-way sync); tips on round buttons. 0.2: the approved style (handoff/brand_rules.md); 0.1: demo data, simulated sync.
 * Everything is kept on the device (IndexedDB); every change is written to an outbox that the sync sends later.
 * Views: home (courses) · course: students | grades | submissions · sheets: sync, export, bulk, backup. */
'use strict';
var VERSION = '0.15.1';                 /* the system's version: the same number as the panel (handoff/backlog.md) */
var $ = function (s, r) { return (r || document).querySelector(s); };
var ICON = {
  sync: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  back: '<path d="m9 18 6-6-6-6"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  grades: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  export: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  import: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  del: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
  eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  grip: '<circle cx="9" cy="8" r="1"/><circle cx="15" cy="8" r="1"/><circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/>',
  note: '<path d="M4 6h16"/><path d="M4 12h10"/><path d="M4 18h7"/>',
  fit: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  fitw: '<path d="M3 12h18"/><path d="m7 8-4 4 4 4"/><path d="m17 8 4 4-4 4"/>',
  eyeoff: '<path d="M10.7 5.1A10.7 10.7 0 0 1 22 12a13 13 0 0 1-1.7 2.7"/><path d="M14.1 14.2a3 3 0 0 1-4.2-4.2"/><path d="M17.5 17.5A10.8 10.8 0 0 1 2 12a13.2 13.2 0 0 1 4.5-5.5"/><path d="m2 2 20 20"/>',
  pen: '<path d="M12 20h9"/><path d="M16.38 3.62a1 1 0 0 1 3 3L7.37 18.64a2 2 0 0 1-.86.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.86z"/>',
  hl: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  eraser: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  mic: '<path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  tree: '<path d="M3 5h6"/><path d="M7 12h6"/><path d="M11 19h10"/><path d="M5 5v7h2"/><path d="M9 12v7h2"/>',
  disk: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>'
};
function svg(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICON[k] || '') + '</svg>'; }
function el(tag, cls, txt) { var x = document.createElement(tag); if (cls) x.className = cls; if (txt != null) x.textContent = txt; return x; }
function btn(text, cls, fn, icon) { var b = el('button', 'btn' + (cls ? ' ' + cls : '')); b.type = 'button'; b.innerHTML = icon ? svg(icon) : ''; b.appendChild(document.createTextNode(text)); b.onclick = fn; return b; }
function ico(k, label, fn) { var b = el('button', 'ico'); b.type = 'button'; b.innerHTML = svg(k); b.setAttribute('aria-label', label); b.setAttribute('data-tip', label); b.onclick = fn; return b; }
function pl(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
function say(t) { var x = $('#toast'); x.textContent = t; x.classList.add('on'); clearTimeout(say.h); say.h = setTimeout(function () { x.classList.remove('on'); }, 2600 + t.length * 30); }
function num(v) { var s = String(v == null ? '' : v).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x660; }).replace(',', '.').trim(); return s === '' ? null : Number(s); }
function fmt(v) { return v == null ? '' : String(Math.round(v * 100) / 100); }
function secCmp(a, b) { var x = parseFloat(a), y = parseFloat(b); if (!isNaN(x) && !isNaN(y) && x !== y) return x - y; return String(a).localeCompare(String(b), 'ar'); }
function when(t) { if (!t) return 'لم تتم بعد'; var d = new Date(t); return d.toLocaleDateString('ar-EG-u-nu-latn') + ' ' + d.toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' }); }

/* ===================== storage ===================== */
var DB = null, S = null;
function idb() {
  if (DB) return Promise.resolve(DB);
  return new Promise(function (ok, no) {
    var r = indexedDB.open('eduspace', 2);                 /* 2: the grading station's files and ink (station.js) */
    r.onupgradeneeded = function () { ['kv', 'files', 'marks'].forEach(function (n) { if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n); }); };
    r.onsuccess = function () { DB = r.result; ok(DB); }; r.onerror = function () { no(r.error); };
  });
}
function kvGet(k) { return idb().then(function (d) { return new Promise(function (ok, no) { var q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = function () { ok(q.result); }; q.onerror = function () { no(q.error); }; }); }); }
function kvPut(k, v) { return idb().then(function (d) { return new Promise(function (ok, no) { var t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = ok; t.onerror = function () { no(t.error); }; }); }); }
function persist() { clearTimeout(persist.h); persist.h = setTimeout(function () { kvPut('state', S); }, 250); }
/* one record per cell: k 'g' grade · 'sec' section · 'pub' publish · 'del' removed student. w = the value it started from. */
function same(a, b) { return (a == null || a === '' ? null : a) === (b == null || b === '' ? null : b); }
/* what this device may change in a course: a teaching assistant's device brings «can» from EduSpace (Sync v2.3) */
function may(d, what) { return !d || !d.can || d.can[what] !== false; }
function rec(course, k, i, s, v, was, text) {
  var d0 = S.data && S.data[course], what = { g: 'grade', sec: 'sec', del: 'del', pub: 'pub' }[k];
  if (!may(d0, what)) { say('لا صلاحية لهذا التغيير على هذا الجهاز'); return false; }
  var id = k + '|' + course + '|' + (i || '') + '|' + (s || ''), ex = null, at = -1;
  S.outbox.forEach(function (o, x) { if (o.id === id) { ex = o; at = x; } });
  if (ex) {
    ex.v = v; ex.text = text; ex.at = Date.now(); delete ex.cf; delete ex.cur; delete ex.err;
    if (k !== 'del' && k !== 'pub' && same(ex.v, ex.w)) S.outbox.splice(at, 1);
  } else if (k === 'del' || k === 'pub' || !same(v, was)) {
    S.seq = (S.seq || 0) + 1;
    S.outbox.push({ id: id, n: S.seq, at: Date.now(), course: course, k: k, i: i || '', s: s || '', v: v, w: was == null ? null : was, text: text });
  }
}
function change() { persist(); syncChip(); }
/* the local changes not yet sent, on top of data that has just come down */
function applyOutbox(data) {
  S.outbox.forEach(function (o) {
    var d = data[o.course]; if (!d) return;
    if (o.k === 'g') { var g = d.grades[o.i] = d.grades[o.i] || {}; if (o.v == null) delete g[o.s]; else g[o.s] = o.v; }
    else if (o.k === 'sec') { if (o.v) d.secs[o.s] = o.v; else delete d.secs[o.s]; }
    else if (o.k === 'pub') d.items.forEach(function (it) { if (it.id === o.i) it.published = o.v; });
    else if (o.k === 'del') { delete d.students[o.s]; delete d.secs[o.s]; }
  });
}
function fin(d, itId, sid) {      /* the grade after the late penalty, as EduSpace counts it */
  var v = (d.grades[itId] || {})[sid]; if (v == null) return null;
  var p = ((d.pens || {})[itId] || {})[sid] || 0;
  return Math.round(v * (100 - p)) / 100;
}

/* ===================== demo data (invented names: this repository is public) ===================== */
function demo() {
  var F = ['أحمد', 'محمد', 'سارة', 'ليان', 'يوسف', 'مريم', 'عمر', 'نور', 'خالد', 'رهف', 'آدم', 'جنى', 'إياد', 'تالا', 'كريم', 'ملك', 'سامي', 'دانة', 'زيد', 'هبة', 'مازن', 'روان', 'طارق', 'لمى'];
  var M = ['حسن', 'سالم', 'إبراهيم', 'عادل', 'ناصر', 'فؤاد', 'جمال', 'رائد', 'وليد', 'هاني'];
  var L = ['النجار', 'الحداد', 'العطار', 'الخطيب', 'الصباغ', 'المصري', 'الشامي', 'القاضي', 'البنا', 'السقا', 'الحلبي', 'الكيلاني'];
  var seed = 7; function rnd(n) { seed = (seed * 9301 + 49297) % 233280; return Math.floor(seed / 233280 * n); }
  function course(key, code, name, secs, per, items) {
    var d = { students: {}, secs: {}, items: items, grades: {} };
    secs.forEach(function (s, si) {
      for (var i = 0; i < per; i++) {
        var id = '1202' + (5 + si) + String(1000 + rnd(9000)) + rnd(10);
        if (d.students[id]) continue;
        d.students[id] = { id: id, name: F[rnd(F.length)] + ' ' + M[rnd(M.length)] + ' ' + L[rnd(L.length)], email: id + '@students.example.edu', phone: '059' + (1000000 + rnd(8999999)), gpa: 60 + rnd(380) / 10 };
        d.secs[id] = s;
      }
    });
    items.forEach(function (it) {
      var g = d.grades[it.id] = {};
      var sb = it.sub = {}, gr = it.filled || 0;
      if (it.source !== 'manual') Object.keys(d.students).forEach(function (id) { if (rnd(100) < 88) { sb[id] = 1; if (rnd(100) < gr) g[id] = Math.round((it.max * (0.5 + rnd(50) / 100)) * 2) / 2; } });
      delete it.filled;
    });
    return { meta: { key: key, code: code, name: name, sem: 'الفصل الأول 2026-2027', color: '#6f7ee0' }, data: d };
  }
  var c1 = course('EARC2214|26271', 'EARC 2214', 'نظرية عمارة (1)', ['101', '201'], 14, [
    { id: 'T1', code: 'T1', title: 'تحليل موقع', max: 10, source: 'eduspace', published: true, filled: 100 },
    { id: 'T2', code: 'T2', title: 'دراسة حالة', max: 10, source: 'eduspace', published: false, filled: 85 },
    { id: 'M1', code: 'M1', title: 'المشروع: المرحلة الأولى', max: 20, source: 'moodle', published: false, filled: 40 },
    { id: 'MID', code: 'MID', title: 'الامتحان النصفي', max: 30, source: 'manual', published: false, filled: false }]);
  var c2 = course('LARC2002|26271', 'LARC 2002', 'مبادئ التصميم المعماري والبيئي', ['101', '202'], 11, [
    { id: 'P1', code: 'P1', title: 'لوحة الفكرة', max: 15, source: 'eduspace', published: false, filled: 60 },
    { id: 'M1', code: 'M1', title: 'تمرين الواجهات', max: 10, source: 'moodle', published: false, filled: false }]);
  c2.meta.color = '#74a886';
  return { v: 2, demo: true, lastSync: null, courses: [c1.meta, c2.meta], data: { 'EARC2214|26271': c1.data, 'LARC2002|26271': c2.data }, outbox: [] };
}

/* ===================== router ===================== */
var R = { view: 'home', key: null, tab: 'students' };
var UI = { sel: {}, shut: {}, q: '', group: true, secF: '' };
function go(view, key, tab) {
  if (key !== R.key) UI = { sel: {}, shut: {}, q: '', group: UI.group, secF: '' };
  R.view = view; R.key = key || null; R.tab = tab || R.tab || 'students';
  location.hash = view === 'home' ? '' : '#c/' + encodeURIComponent(key) + '/' + R.tab;
  draw();
}
function fromHash() {
  var m = /^#c\/([^/]+)\/(\w+)/.exec(location.hash);
  if (m && S.data[decodeURIComponent(m[1])]) { R.view = 'course'; R.key = decodeURIComponent(m[1]); R.tab = m[2]; } else { R.view = 'home'; R.key = null; }
}

/* ===================== sync chip and sheet ===================== */
function syncChip() {
  var c = $('#sync'); if (!c) return;
  var n = S.outbox.length, on = navigator.onLine;
  c.className = 'sync' + (!on ? ' off' : n ? ' pend' : '');
  c.innerHTML = '<span class="dot"></span>' + (n ? pl(n, 'تغيير', 'تغييرات') + ' بانتظار الإرسال' : 'كل شيء متزامن') + (on ? '' : ' · بلا إنترنت');
}
function sheet(title, build, foot) {
  var ov = el('div', 'ov'), sh = el('div', 'sh');
  sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true');
  sh.appendChild(el('h2', '', title));
  var body = el('div'); sh.appendChild(body);
  var f = el('div', 'foot'); sh.appendChild(f);
  ov.appendChild(sh); document.body.appendChild(ov);
  var h = { body: body, close: function () { ov.remove(); } };
  ov.onclick = function (e) { if (e.target === ov) h.close(); };
  build(body, h);
  (foot || []).forEach(function (b) { f.appendChild(btn(b[0], b[1], function () { b[2](h); }, b[3])); });
  f.appendChild(btn('إغلاق', 'sec', h.close));
  return h;
}
/* the one way a grade is shown (2026-11-22): the student's grade on the right in its level's colour, «\\», the maximum */
function scoreEl(got, max) {
  var s = el('span', 'score'), g = el('span', 'got', got == null || got === '' ? '—' : fmt(got));
  if (got != null && got !== '' && max) { var p = got * 100 / max; g.style.color = p >= 90 ? '#16a34a' : p >= 80 ? '#65a30d' : p >= 70 ? '#d97706' : p >= 60 ? '#ef4444' : '#991b1b'; }
  s.appendChild(g); s.appendChild(el('span', 'sep', '\\')); s.appendChild(el('span', 'max', fmt(max)));
  return s;
}
/* ===================== the link to EduSpace (Sync.gs in the panel, through «EduSpace Sync») ===================== */
function parseCode(code) {
  var m = /^ES1\.([0-9a-f]{64})\.([A-Za-z0-9_-]{20,})$/.exec(String(code || '').replace(/\s/g, ''));
  return m ? { t: m[1], url: 'https://script.google.com/macros/s/' + m[2] + '/exec' } : null;
}
function api(link, op, extra) {
  var body = { t: link.t, op: op }; if (extra) Object.keys(extra).forEach(function (k) { body[k] = extra[k]; });
  return fetch(link.url, { method: 'POST', body: JSON.stringify(body) })
    .catch(function () { throw new Error('تعذّر الوصول إلى خدمة الربط. تأكد من الإنترنت، ومن أنك فتحت رابط الخدمة من اللوحة مرة واحدة وسمحت بالإذن.'); })
    .then(function (r) {
      if (!r.ok) throw new Error('ردّت خدمة الربط بالرقم ' + r.status + '. افتح رابطها من اللوحة («تطبيق الآيباد» ← «فتح خدمة الربط») وتأكد أنها تعرض {"ok":true}.');
      return r.text();
    })
    .then(function (t) {
      var x; try { x = JSON.parse(t); }
      catch (e) { throw new Error('ردّت Google بصفحة بدل البيانات، وغالبًا معناه أن خدمة الربط لم تُمنح الإذن بعد. في اللوحة: «تطبيق الآيباد» ← «فتح خدمة الربط»، واسمح بالإذن حتى ترى {"ok":true}، ثم أعد المحاولة.'); }
      if (!x || !x.ok) throw new Error((x && x.error) || 'ردّ غير مفهوم');
      return x;
    });
}
/* an error stays on screen (with a copy button) until it is read */
function fail(title, e) {
  var msg = String((e && e.message) || e);
  sheet(title, function (b) {
    var p = el('p', '', msg); p.setAttribute('dir', 'auto'); b.appendChild(p);
    b.appendChild(el('p', 'n12', 'إن لم يتضح السبب، انسخ الرسالة وأرسلها إلى Claude.'));
  }, [['نسخ الرسالة', 'sec', function () {
    try { navigator.clipboard.writeText(title + ': ' + msg).then(function () { say('نُسخت'); }); } catch (x) { say('انسخها يدويًا'); }
  }]]);
}
/* the courses as EduSpace has them → this app's data (read only until two-way sync) */
function pull() {
  if (!S.link) return Promise.reject(new Error('اربط الجهاز أولًا'));
  if (!navigator.onLine) return Promise.reject(new Error('لا إنترنت الآن'));
  var known = {}; Object.keys(S.data || {}).forEach(function (k) { if (S.data[k].h && !S.demo) known[k] = S.data[k].h; });
  return api(S.link, 'pull', { h: known }).then(function (x) {
    var courses = [], data = {};
    x.courses.forEach(function (c) {
      if (c.same && S.data[c.key]) {      /* 0.14: unchanged on the server: what is here stays */
        courses.push(S.courses.filter(function (o) { return o.key === c.key; })[0]); data[c.key] = S.data[c.key]; return;
      }
      courses.push({ key: c.key, code: c.code, name: c.name, sem: c.sem, color: c.color });
      var st = {}; c.students.forEach(function (s) { st[s.id] = s; });
      var old = (S.data || {})[c.key] || {};
      data[c.key] = { students: st, secs: c.secs || {}, grades: c.grades || {}, pens: c.pens || {}, can: c.can || null,
        tree: c.tree || null, values: c.values || {}, nums: c.nums || {}, st: old.st || {}, h: c.h || '',
        items: c.items.map(function (it) { it.sub = (c.subs || {})[it.id] || {}; return it; }) };
      /* which subjects have feedback on the server (1 the file, 2 the voice note) */
      Object.keys(c.fbs || {}).forEach(function (code) {
        var t = data[c.key].st[code] = data[c.key].st[code] || { list: [], sent: {}, at: 0 }; t.sent = {};
        Object.keys(c.fbs[code]).forEach(function (s) { var v = c.fbs[code][s]; t.sent[s] = { pdf: !!(v & 1), audio: !!(v & 2), hl: !!(v & 4), note: !!(v & 8) }; });
      });
    });
    var keep = S.demo ? [] : (S.outbox || []);
    if (x.ver && String(x.ver).replace(/^v/, '').split('.')[0] !== VERSION.split('.')[0]) say('إصدار اللوحة ' + x.ver + ' وإصدار التطبيق ' + VERSION + ': حدّث التطبيق أو اللوحة');
    S = { v: 2, demo: false, readonly: false, link: S.link, owner: x.owner || '', serverVer: x.ver || '', lastSync: x.at, lastMs: x.ms || 0, courses: courses, data: data, outbox: keep, seq: S.seq || 0 };
    applyOutbox(data);
    persist(); return x;
  });
}
/* send the outbox, then download; returns { sent, conflicts, errors } */
/* how long it took, shown after every sync (0.16): «3.2 ث» */
function secs(ms) { return (Math.round((ms || 0) / 100) / 10) + ' ث'; }
function syncNow() {
  if (!S.link || S.demo) return Promise.reject(new Error('اربط الجهاز أولًا'));
  if (!navigator.onLine) return Promise.reject(new Error('لا إنترنت الآن. التغييرات محفوظة وستُرسل عند الاتصال.'));
  var send = S.outbox.filter(function (o) { return !o.cf; }), sum = { sent: 0, conflicts: 0, errors: 0 }, t0 = Date.now();
  var p = send.length ? api(S.link, 'push', { changes: send.map(function (o) { return { n: o.n, k: o.k, c: o.course, i: o.i, s: o.s, v: o.v, w: o.w, f: !!o.f }; }) })
    : Promise.resolve({ results: [] });
  return p.then(function (res) {
    res.results.forEach(function (r) {
      var at = -1; S.outbox.forEach(function (o, x) { if (o.n === r.n) at = x; });
      if (at < 0) return;
      var o = S.outbox[at];
      if (r.st === 'ok') { S.outbox.splice(at, 1); sum.sent++; }
      else if (r.st === 'conflict') { o.cf = true; o.cur = r.cur == null ? null : r.cur; sum.conflicts++; }
      else { o.err = r.err || 'خطأ'; sum.errors++; }
    });
    persist();
    return sendReady().then(function (n) { sum.fb = n; }, function () { /* tried again at the next sync */ });
  }).then(function () { return pull(); }).then(function () { stAfterSync(); sum.ms = Date.now() - t0; sum.server = S.lastMs || 0; return sum; });
}
function openLink() {
  sheet('الربط بـ EduSpace', function (b) {
    if (S.link) {
      b.appendChild(el('p', 'n14', 'هذا الجهاز مربوط باسم «' + (S.link.device || 'الآيباد') + '»' + (S.owner ? ' لمساعد التدريس ' + S.owner + ' (مساقاته وصلاحياته فقط)' : '') + '. آخر تنزيل: ' + when(S.lastSync) + (S.lastMs ? ' (حضّرته اللوحة في ' + (Math.round(S.lastMs / 100) / 10) + ' ث)' : '') + '.'));
      b.appendChild(el('p', 'n12', 'تعدّل هنا بلا إنترنت، و«مزامنة الآن» ترسل تعديلاتك إلى EduSpace ثم تنزّل آخر ما فيها.'));
      return;
    }
    b.appendChild(el('p', 'n14', 'في اللوحة: بطاقة «تطبيق الآيباد» ← «إنشاء كود ربط». انسخ الكود والصقه هنا.'));
    var f = el('div', 'field'); f.appendChild(el('label', '', 'كود الربط'));
    var t = el('textarea', 'inp'); t.id = 'lk-code'; t.dir = 'ltr'; t.style.cssText = 'min-height:96px;border-radius:18px;padding:12px 16px;font-size:14px;width:100%';
    f.appendChild(t); b.appendChild(f);
  }, S.link ? [['مزامنة الآن', '', function (h) {
    h.body.appendChild(el('p', 'n14', 'جارٍ المزامنة…'));
    (S.demo ? pull() : syncNow()).then(function (x) { h.close(); go('home'); say('تمت المزامنة مع EduSpace' + (x && x.ms ? ' · ' + secs(x.ms) + (x.server ? ' (اللوحة ' + secs(x.server) + ')' : '') : '') + '.'); })
      .catch(function (e) { h.close(); fail('تعذّر التنزيل', e); });
  }, 'import'], ['إلغاء الربط', 'sec', function (h) {
    if (!confirm('إلغاء ربط هذا الجهاز؟ تبقى البيانات النازلة عليه، ولا يتصل بعدها حتى تربطه بكود جديد.')) return;
    delete S.link; persist(); h.close(); draw();
  }]] : [['ربط', '', function (h) {
    var lk = parseCode($('#lk-code').value);
    if (!lk) { say('الكود غير صحيح. انسخه كاملًا من اللوحة.'); return; }
    if (!navigator.onLine) { say('الربط يحتاج إنترنت مرة واحدة.'); return; }
    api(lk, 'ping').then(function (x) {
      lk.device = x.device; S.link = lk; persist();
      if (!confirm('رُبط الجهاز باسم «' + x.device + '». تنزيل بياناتك الآن؟ تُستبدل البيانات التجريبية.')) { h.close(); draw(); return; }
      return pull().then(function (y) { h.close(); go('home'); say('نزلت ' + pl(y.courses.length, 'مساق', 'مساقات') + ' من EduSpace.'); });
    }).catch(function (e) { h.close(); fail('تعذّر الربط', e); });
  }, 'link']]);
}
function openSync() {
  sheet('المزامنة', function (b) {
    b.appendChild(el('p', 'n14', navigator.onLine ? 'متصل بالإنترنت.' : 'لا إنترنت الآن. تعمل كالمعتاد، وكل التغييرات محفوظة على الجهاز إلى أن تتصل.'));
    b.appendChild(el('p', 'n14', 'آخر مزامنة: ' + when(S.lastSync)));
    if (S.demo) b.appendChild(el('p', 'banner', 'بيانات تجريبية: المزامنة هنا محاكاة. اربط الجهاز بـ EduSpace من زر النقاط الثلاث.'));
    var cfs = S.outbox.filter(function (o) { return o.cf; });
    if (cfs.length) {
      b.appendChild(el('p', 'lab', 'تعارض: تغيّرت هذه في EduSpace أيضًا بعد آخر تنزيل (' + cfs.length + ')'));
      cfs.forEach(function (o) {
        var r = el('div', 'ch'); r.style.flexWrap = 'wrap';
        r.appendChild(el('span', 'tag', courseOf(o.course).code)); r.appendChild(el('span', 'sp', o.text));
        r.appendChild(el('span', 'n12', 'قيمتك ' + (o.v == null || o.v === '' ? '—' : o.v) + ' · في EduSpace ' + (o.cur == null || o.cur === '' ? '—' : o.cur)));
        var mine = btn('اعتمد قيمتي', 'sec', function () { o.f = true; delete o.cf; persist(); document.querySelector('.ov').remove(); openSync(); });
        var theirs = btn('خذ قيمة EduSpace', 'sec', function () {
          S.outbox = S.outbox.filter(function (x) { return x !== o; });
          var d = S.data[o.course];
          if (d && o.k === 'g') { var g = d.grades[o.i] = d.grades[o.i] || {}; if (o.cur == null) delete g[o.s]; else g[o.s] = o.cur; }
          if (d && o.k === 'sec') { if (o.cur) d.secs[o.s] = o.cur; else delete d.secs[o.s]; }
          persist(); document.querySelector('.ov').remove(); openSync(); draw();
        });
        r.appendChild(mine); r.appendChild(theirs); b.appendChild(r);
      });
    }
    b.appendChild(el('p', 'lab', S.outbox.length ? 'بانتظار الإرسال (' + S.outbox.length + ')' : 'لا تغييرات بانتظار الإرسال'));
    S.outbox.slice(-40).reverse().forEach(function (c) {
      if (c.cf) return;
      var r = el('div', 'ch'); r.appendChild(el('span', 'tag', courseOf(c.course).code)); r.appendChild(el('span', 'sp', c.text + (c.err ? ' · لم يُرسل: ' + c.err : ''))); r.appendChild(el('span', 'n12', new Date(c.at).toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' }))); b.appendChild(r);
    });
  }, [['مزامنة الآن', '', function (h) {
    if (!navigator.onLine) { say('لا إنترنت الآن. التغييرات محفوظة وستُرسل عند الاتصال.'); return; }
    if (S.link && !S.demo) {
      h.body.textContent = 'جارٍ الإرسال ثم التنزيل…';
      syncNow().then(function (x) {
        h.close(); draw();
        say((x.sent ? 'أُرسل ' + pl(x.sent, 'تغيير', 'تغييرات') + ' وحُدّثت البيانات' : 'حُدّثت البيانات من EduSpace') +
          (x.conflicts ? ' · ' + pl(x.conflicts, 'تعارض', 'تعارضات') + ': افتح المزامنة لتقرر' : '') + (x.errors ? ' · لم يُرسل ' + x.errors : '') + (x.fb ? ' · يُرسل في الخلفية ' + pl(x.fb, 'تصحيح', 'تصحيحات') : '') + ' · ' + secs(x.ms) + (x.server ? ' (اللوحة ' + secs(x.server) + ')' : '') + '.');
        if (x.conflicts) openSync();
      }).catch(function (e) { h.close(); fail('تعذّرت المزامنة', e); });
      return;
    }
    h.body.textContent = 'جارٍ الإرسال…';
    setTimeout(function () { var n = S.outbox.length; S.outbox = []; S.lastSync = Date.now(); persist(); h.close(); draw(); say(n ? 'أُرسل ' + pl(n, 'تغيير', 'تغييرات') + ' (محاكاة).' : 'لا جديد للإرسال.'); }, 900);
  }, 'sync']]);
}

/* ===================== backup ===================== */
function share(blob, name) {
  var f = new File([blob], name, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: name }).catch(function () {});
  var a = el('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
function openMenu() {
  sheet('البيانات على هذا الجهاز', function (b) {
    b.appendChild(el('p', 'n14', 'كل بياناتك محفوظة داخل هذا الآيباد. احفظ نسخة في «الملفات» من وقت لآخر.'));
    var sb = btn('التخزين', 'sec', function () { document.querySelector('.ov').remove(); openStorage(); }, 'disk'); sb.style.marginInlineEnd = '8px';
    var lb = btn(S.link ? 'الربط بـ EduSpace · مربوط' : 'الربط بـ EduSpace', S.link ? 'sec' : '', function () { document.querySelector('.ov').remove(); openLink(); }, 'link');
    lb.style.marginInlineEnd = '8px'; b.appendChild(lb);
    b.appendChild(sb);
    b.appendChild(btn('حفظ نسخة احتياطية', 'sec', function () {
      share(new Blob([JSON.stringify(S)], { type: 'application/json' }), 'EduSpace-backup-' + new Date().toISOString().slice(0, 10) + '.json');
    }, 'save'));
    var f = el('div', 'field'); f.style.marginTop = '12px'; f.appendChild(el('span', 'lab', 'استعادة من نسخة'));
    var i = el('input'); i.type = 'file'; i.accept = '.json,application/json'; f.appendChild(i); b.appendChild(f);
    i.onchange = function () {
      var file = i.files[0]; if (!file) return;
      file.text().then(function (t) {
        var x = JSON.parse(t); if (!x || !x.data || !x.courses) throw new Error('ليس ملف نسخة من EduSpace');
        if (!confirm('تُستبدل كل البيانات على الجهاز بهذه النسخة. متابعة؟')) return;
        S = x; persist(); $('.ov').remove(); go('home'); say('استُعيدت النسخة.');
      }).catch(function (e) { say('تعذّرت الاستعادة: ' + e.message); });
    };
    b.appendChild(el('p', 'n12', 'الإصدار ' + VERSION + (S.demo ? ' · بيانات تجريبية بأسماء مخترعة' : '') + ' · ')).appendChild((function () { var a = el('a', '', 'صفحة الاختبار'); a.href = 'test.html'; return a; })());
  }, S.demo ? [['إعادة البيانات التجريبية', 'sec', function (h) { if (!confirm('تُمحى التغييرات وتعود البيانات التجريبية الأولى. متابعة؟')) return; S = demo(); persist(); h.close(); go('home'); }]] : []);
}

/* ===================== home ===================== */
function courseOf(key) { return S.courses.filter(function (c) { return c.key === key; })[0] || { code: '?' }; }
/* the eight course colours (handoff/brand_rules.md §5): deep (stored with the course) → [light, middle, deep] */
var FAMILY = { '#6f7ee0': ['#eceefc', '#b3bcf5', '#6f7ee0'], '#d97aa0': ['#fbeef3', '#f3bfd2', '#d97aa0'], '#6fa3b8': ['#e8f2f6', '#b9d6e2', '#6fa3b8'],
  '#74a886': ['#edf5ef', '#c4dfcc', '#74a886'], '#e08a5a': ['#fdf0e8', '#f6c9ac', '#e08a5a'], '#c49a2c': ['#f8f3e3', '#ead79c', '#c49a2c'],
  '#9b7cc9': ['#f4eefa', '#d3c0ec', '#9b7cc9'], '#7c879a': ['#eef0f4', '#c7cdd8', '#7c879a'] };
var OLDCOL = { '#2563eb': '#6f7ee0', '#16a34a': '#74a886', '#9333ea': '#9b7cc9', '#ea580c': '#e08a5a', '#db2777': '#d97aa0', '#0891b2': '#6fa3b8', '#ca8a04': '#c49a2c', '#475569': '#7c879a' };
function family(color) { return FAMILY[OLDCOL[color] || color] || FAMILY['#6f7ee0']; }
function tint(node, color) { var f = family(color); node.style.setProperty('--t', f[0]); node.style.setProperty('--m', f[1]); node.style.setProperty('--d', f[2]); return node; }
function brand() { var b = el('span', 'brand'); b.innerHTML = '<span class="w">EduSpace<sup>™</sup></span>'; b.appendChild(el('span', 'ver', 'v' + VERSION)); return b; }
/* the top bar: the round buttons on the right (the menu first, then back), the EduSpace™ mark alone on the far left */
function topBar(backFn) {
  var t = el('div', 'bar');
  t.appendChild(ico('more', 'البيانات والنسخ الاحتياطي', openMenu));
  if (backFn) t.appendChild(ico('back', 'رجوع', backFn));
  t.appendChild(el('span', 'sp'));
  t.appendChild(brand());
  return t;
}
/* the page title, and under it on the right the sync state */
function title(app, main, sub) {
  var h = el('h1', '', main); if (sub) h.appendChild(el('span', '', sub)); app.appendChild(h);
  var r = el('div', 'syncrow'), c = el('button', 'sync'); c.id = 'sync'; c.type = 'button'; c.onclick = openSync; r.appendChild(c); app.appendChild(r);
}
/* progress: three layered rounded rectangles — hatched track, submitted, graded */
function prog(total, sub, graded, small) {
  var p = el('div', 'prog' + (small ? ' sm' : '')), pc = function (n) { return total ? Math.max(n ? 4 : 0, Math.round(n / total * 100)) : 0; };
  var a = el('i', 's'); a.style.width = pc(sub) + '%'; p.appendChild(a);
  var b = el('i', 'g'); b.style.width = pc(graded) + '%'; p.appendChild(b);
  /* each layer speaks for itself: a tap on a layer shows a bubble about that layer only */
  var layers = [
    { to: pc(graded), tip: 'صُحّح ' + graded + ' من ' + total },
    { to: pc(sub), tip: 'سلّم ' + sub + ' من ' + total + (sub > graded ? ' · ' + (sub - graded) + ' بانتظار التصحيح' : '') },
    { to: 100, tip: 'لم يصل ' + Math.max(0, total - sub) + ' من ' + total }
  ];
  p.setAttribute('role', 'button'); p.setAttribute('aria-label', layers.map(function (l) { return l.tip; }).join(' · ')); p.tabIndex = 0;
  p.onclick = function (e) {
    e.stopPropagation();
    var r = p.getBoundingClientRect(), rtl = getComputedStyle(p).direction === 'rtl';
    var at = ((rtl ? r.right - e.clientX : e.clientX - r.left) / r.width) * 100, from = 0, L = layers[2];
    for (var i = 0; i < layers.length; i++) { if (at <= layers[i].to && layers[i].to > from) { L = layers[i]; break; } from = Math.max(from, layers[i].to); }
    var start = 0; for (var j = 0; j < layers.indexOf(L); j++) start = Math.max(start, layers[j].to);
    var old = p.querySelector('.tipb'), same = old && old.textContent === L.tip;
    hideTips(); if (same) return;
    var t = el('span', 'tipb', L.tip), mid = (start + L.to) / 2;
    if (mid < 20) t.style.insetInlineStart = '0';                 /* near the start: open from the edge */
    else if (mid > 80) t.style.insetInlineEnd = '0';
    else { t.style.insetInlineStart = mid + '%'; t.style.transform = 'translateX(' + (rtl ? '50%' : '-50%') + ')'; }
    p.appendChild(t);
  };
  return p;
}
function hideTips() { [].forEach.call(document.querySelectorAll('.tipb'), function (x) { x.remove(); }); }
document.addEventListener('click', hideTips);
function itemStats(d, it) {
  var ids = Object.keys(d.students), g = d.grades[it.id] || {}, s = it.sub || {};
  var graded = ids.filter(function (id) { return g[id] != null; }).length;
  var sub = it.source === 'manual' ? graded : ids.filter(function (id) { return s[id] || g[id] != null; }).length;
  return { total: ids.length, sub: sub, graded: graded };
}
function currentItem(d) {   /* the newest item that still has work to grade, else the last one */
  var open = d.items.filter(function (it) { var x = itemStats(d, it); return x.sub > x.graded; });
  return open[open.length - 1] || d.items[d.items.length - 1];
}
function drawHome(app) {
  tint(document.body, '#7c879a');
  app.appendChild(topBar());
  var h = new Date().getHours();
  title(app, h < 12 ? 'صباح الخير' : 'مساء الخير', 'لديك ' + pl(S.courses.length, 'مساق', 'مساقات') + ' على هذا الجهاز');
  var g = el('div', 'grid');
  S.courses.forEach(function (c, i) {
    var d = S.data[c.key], it = currentItem(d), x = it ? itemStats(d, it) : { total: Object.keys(d.students).length, sub: 0, graded: 0 };
    var pend = S.outbox.filter(function (o) { return o.course === c.key; }).length;
    var k = tint(el('div', 'cc'), c.color); k.tabIndex = 0; k.setAttribute('role', 'button');
    var hd = el('div', 'hd'), av = ico('users', c.name, null); av.tabIndex = -1; hd.appendChild(av);
    var t = el('div', 't'); t.appendChild(el('span', 'code', c.code)); t.appendChild(el('span', 'n14', c.name)); hd.appendChild(t);
    if (pend) hd.appendChild(el('span', 'badge', pl(pend, 'تغيير', 'تغييرات')));
    k.appendChild(hd);
    if (it) {
      k.appendChild(el('span', 'n14', it.code + ' · ' + it.title));
      var big = el('div', 'big', String(x.graded)); big.appendChild(el('small', '', ' / ' + x.sub + ' صُحّح')); k.appendChild(big);
      k.appendChild(prog(x.total, x.sub, x.graded));
    }
    k.onclick = function () { go('course', c.key, 'grades'); };
    k.onkeydown = function (e) { if (e.key === 'Enter') k.onclick(); };
    g.appendChild(k);
  });
  app.appendChild(g);
  app.classList.add('home');       /* the cards sit at the bottom; the space between the title and the cards grows */
}

/* ===================== course ===================== */
function drawCourse(app) {
  var c = courseOf(R.key), d = S.data[R.key];
  tint(document.body, c.color);
  app.appendChild(topBar(function () { go('home'); }));
  title(app, c.code, c.name);
  var tabs = el('div', 'pills');
  [['students', 'الطلاب', 'users'], ['grades', 'سجل الدرجات', 'grades'], ['subs', 'التسليمات', 'inbox']].forEach(function (t) {
    var b = el('button', 'pill' + (R.tab === t[0] ? ' on' : '')); b.type = 'button'; b.innerHTML = svg(t[2]); b.appendChild(document.createTextNode(t[1]));
    b.onclick = function () { go('course', R.key, t[0]); }; tabs.appendChild(b);
  });
  app.appendChild(tabs);
  if (R.tab === 'grades') drawGrades(app, d);
  else if (R.tab === 'subs') drawStation(app, d);
  else drawStudents(app, d);
}
function secsOf(d) { var o = {}; Object.keys(d.secs).forEach(function (id) { if (d.students[id]) o[d.secs[id]] = 1; }); return Object.keys(o).sort(secCmp); }
function visible(d) {
  var q = UI.q.trim();
  return Object.keys(d.students).map(function (id) { return d.students[id]; }).filter(function (s) {
    if (UI.secF && (d.secs[s.id] || '') !== UI.secF) return false;
    return !q || (s.id + ' ' + s.name).indexOf(q) > -1;
  }).sort(function (a, b) { return secCmp(d.secs[a.id] || 'zzz', d.secs[b.id] || 'zzz') || a.name.localeCompare(b.name, 'ar'); });
}
function selIds(d) { return Object.keys(UI.sel).filter(function (id) { return d.students[id]; }); }
function toolbar(app, d, extra) {
  var r = el('div', 'row'); r.style.marginBottom = '12px';
  var q = el('input'); q.type = 'search'; q.placeholder = 'بحث بالاسم أو الرقم'; q.value = UI.q;
  q.className = 'inp'; q.style.cssText = 'flex:1;min-width:180px;background:#fff;box-shadow:inset 0 0 0 1px var(--line)';
  q.oninput = function () { UI.q = q.value; clearTimeout(q.h); q.h = setTimeout(function () { draw(); var x = $('input[type=search]'); x.focus(); x.setSelectionRange(x.value.length, x.value.length); }, 250); };
  r.appendChild(q);
  var sel = el('select', 'inp'); sel.style.cssText = 'background-color:#fff;box-shadow:inset 0 0 0 1px var(--line)';
  [['', 'كل الشعب']].concat(secsOf(d).map(function (s) { return [s, 'الشعبة ' + s]; })).forEach(function (o) { var x = el('option', '', o[1]); x.value = o[0]; sel.appendChild(x); });
  sel.value = UI.secF; sel.onchange = function () { UI.secF = sel.value; draw(); };
  r.appendChild(sel);
  (extra || []).forEach(function (x) { r.appendChild(x); });
  app.appendChild(r);
}

/* ----- students ----- */
function drawStudents(app, d) {
  toolbar(app, d, [btn(UI.group ? 'قائمة واحدة' : 'حسب الشعبة', 'sec', function () { UI.group = !UI.group; draw(); }, 'list')]);
  var list = visible(d), tw = el('div', 'tw'), t = el('table');
  var head = el('tr'), ck = el('th', 'ck'), all = el('input'); all.type = 'checkbox'; all.setAttribute('aria-label', 'تحديد كل الظاهرين');
  var nsel = list.filter(function (s) { return UI.sel[s.id]; }).length;
  all.checked = nsel && nsel === list.length; all.indeterminate = nsel > 0 && nsel < list.length;
  all.onchange = function () { list.forEach(function (s) { if (all.checked) UI.sel[s.id] = 1; else delete UI.sel[s.id]; }); draw(); };
  ck.appendChild(all); head.appendChild(ck);
  ['الرقم الجامعي', 'اسم الطالب', 'الشعبة', 'المعدل', 'الهاتف', 'البريد'].forEach(function (h) { head.appendChild(el('th', '', h)); });
  var th = el('thead'); th.appendChild(head); t.appendChild(th);
  var tb = el('tbody');
  if (!list.length) { var e = el('tr'), td = el('td', 'empty', 'لا نتائج.'); td.colSpan = 7; e.appendChild(td); tb.appendChild(e); }
  var groups = {}; list.forEach(function (s) { var k = UI.group ? (d.secs[s.id] || '') : '*'; (groups[k] = groups[k] || []).push(s); });
  Object.keys(groups).sort(function (a, b) { return !a ? 1 : !b ? -1 : secCmp(a, b); }).forEach(function (k) {
    var g = groups[k];
    if (UI.group) {
      var gr = el('tr', 'grp' + (UI.shut[k] ? ' shut' : '')), gtd = el('td'); gtd.colSpan = 7;
      var gh = el('div', 'gh'), gk = el('input'); gk.type = 'checkbox';
      var n = g.filter(function (s) { return UI.sel[s.id]; }).length; gk.checked = n && n === g.length; gk.indeterminate = n > 0 && n < g.length;
      gk.onclick = function (e) { e.stopPropagation(); };
      gk.onchange = function () { g.forEach(function (s) { if (gk.checked) UI.sel[s.id] = 1; else delete UI.sel[s.id]; }); draw(); };
      gh.appendChild(gk); gh.appendChild(el('span', '', k ? 'الشعبة ' + k : 'بلا شعبة')); gh.appendChild(el('span', 'n12', pl(g.length, 'طالب', 'طالبًا') + (n ? ' · محدد ' + n : '')));
      gh.appendChild(el('span', 'sp')); var ch = el('span', 'chev'); ch.innerHTML = svg('down'); gh.appendChild(ch);
      gtd.appendChild(gh); gr.appendChild(gtd); gr.onclick = function () { UI.shut[k] = !UI.shut[k]; draw(); }; tb.appendChild(gr);
      if (UI.shut[k]) return;
    }
    g.forEach(function (s) {
      var tr = el('tr', UI.sel[s.id] ? 'sel' : ''), c0 = el('td', 'ck'), k2 = el('input'); k2.type = 'checkbox'; k2.checked = !!UI.sel[s.id];
      k2.onchange = function () { if (k2.checked) UI.sel[s.id] = 1; else delete UI.sel[s.id]; draw(); };
      c0.appendChild(k2); tr.appendChild(c0);
      tr.appendChild(el('td', 'ltr', s.id)); tr.appendChild(el('td', '', s.name)); tr.appendChild(el('td', '', d.secs[s.id] || '—'));
      tr.appendChild(el('td', '', s.gpa == null ? '' : fmt(s.gpa))); tr.appendChild(el('td', 'ltr', s.phone || '')); tr.appendChild(el('td', 'ltr', s.email || ''));
      tb.appendChild(tr);
    });
  });
  t.appendChild(tb); tw.appendChild(t); app.appendChild(tw);
  bulkBar(app, d);
}
function bulkBar(app, d) {
  var ids = selIds(d); if (!ids.length) return;
  var b = el('div', 'bulk'); b.appendChild(el('b', '', 'محدد ' + pl(ids.length, 'طالب', 'طالبًا')));
  if (S.readonly) {
    b.appendChild(btn('تصدير', '', function () { openExport(d, ids); }, 'export'));
    b.appendChild(btn('إلغاء', '', function () { UI.sel = {}; draw(); }, 'x'));
    app.appendChild(b); return;
  }
  if (may(d, 'sec')) b.appendChild(btn('الشعبة', '', function () { bulkSection(d, ids); }, 'list'));
  if (may(d, 'grade')) b.appendChild(btn('درجة موحّدة', '', function () { bulkGrade(d, ids, ''); }, 'grades'));
  if (may(d, 'grade')) b.appendChild(btn('صفر', '', function () { bulkGrade(d, ids, '0'); }));
  b.appendChild(btn('تصدير', '', function () { openExport(d, ids); }, 'export'));
  if (may(d, 'del')) b.appendChild(btn('حذف', 'dz', function () {
    if (!confirm('حذف ' + pl(ids.length, 'طالب', 'طالبًا') + ' من هذا المساق؟')) return;
    ids.forEach(function (id) { rec(R.key, 'del', '', id, true, null, 'حذف ' + d.students[id].name); delete d.students[id]; delete d.secs[id]; }); UI.sel = {};
    change(); draw();
  }, 'del'));
  b.appendChild(btn('إلغاء', '', function () { UI.sel = {}; draw(); }, 'x'));
  app.appendChild(b);
}
function bulkSection(d, ids) {
  sheet('شعبة ' + pl(ids.length, 'طالب', 'طالبًا'), function (b) {
    var f = el('div', 'field'); f.appendChild(el('label', '', 'الشعبة (فارغة = بلا شعبة)'));
    var i = el('input'); i.id = 'bs'; i.setAttribute('list', 'bs-l'); f.appendChild(i);
    var dl = el('datalist'); dl.id = 'bs-l'; secsOf(d).forEach(function (s) { var o = el('option'); o.value = s; dl.appendChild(o); }); f.appendChild(dl);
    b.appendChild(f);
  }, [['حفظ', '', function (h) {
    var v = $('#bs').value.trim();
    ids.forEach(function (id) { rec(R.key, 'sec', '', id, v, d.secs[id] || '', 'الشعبة ' + (v || '—') + ' · ' + d.students[id].name); if (v) d.secs[id] = v; else delete d.secs[id]; });
    change(); h.close(); draw();
  }]]);
}
function bulkGrade(d, ids, preset) {
  sheet((preset === '0' ? 'صفر لـ ' : 'درجة موحّدة لـ ') + pl(ids.length, 'طالب', 'طالبًا'), function (b) {
    var f = el('div', 'field'); f.appendChild(el('label', '', 'على'));
    var s = el('select'); s.id = 'bg-i'; d.items.filter(function (it) { return !it.ro; }).forEach(function (it) { var o = el('option', '', it.code + ' · ' + it.title + ' (من ' + it.max + ')' + (it.source === 'moodle' ? ' · Moodle' : '')); o.value = it.id; s.appendChild(o); });
    f.appendChild(s); b.appendChild(f);
    var f2 = el('div', 'field'); f2.appendChild(el('label', '', 'الدرجة (فارغة = مسح)')); var v = el('input'); v.id = 'bg-v'; v.value = preset; v.inputMode = 'decimal'; v.dir = 'ltr'; f2.appendChild(v); b.appendChild(f2);
    var o = el('label', 'opt'), k = el('input'); k.type = 'checkbox'; k.id = 'bg-k'; k.checked = true; o.appendChild(k); o.appendChild(document.createTextNode('أبقِ الدرجات المدخلة كما هي (للفارغين فقط)')); b.appendChild(o);
  }, [['تطبيق', '', function (h) {
    var it = d.items.filter(function (x) { return x.id === $('#bg-i').value; })[0], v = num($('#bg-v').value), keep = $('#bg-k').checked;
    if (v != null && (isNaN(v) || v < 0 || v > it.max)) { say('الدرجة بين 0 و' + it.max); return; }
    var g = d.grades[it.id] = d.grades[it.id] || {}, n = 0, kept = 0;
    ids.forEach(function (id) {
      if (keep && g[id] != null) { kept++; return; }
      rec(R.key, 'g', it.id, id, v, g[id] == null ? null : g[id], it.code + ' · ' + d.students[id].name + ': ' + (v == null ? 'مسح' : v));
      if (v == null) delete g[id]; else g[id] = v; n++;
    });
    change();
    h.close(); draw(); say('رُصد لـ ' + pl(n, 'طالب', 'طالبًا') + (kept ? '، وبقيت ' + kept + ' درجة كما هي' : ''));
  }]]);
}

/* ----- grades ----- */
function srcTag(it) { return it.source === 'moodle' ? el('span', 'tag moodle', 'Moodle') : it.source === 'manual' ? el('span', 'tag', 'يدوي') : el('span', 'tag', 'EduSpace'); }
function drawGrades(app, d) {
  var two = !!(d.nums && Object.keys(d.nums).length);   /* 0.12: the two numbers of EduSpace (the record, the performance) */
  toolbar(app, d, (may(d, 'pub') ? [btn('نشر', 'sec', function () { openPublish(d); }, 'export')] : []).concat([btn('التوزيع', 'sec', function () { treeSheet(d); }, 'tree'), btn('استيراد من مودل', 'sec', function () { importInfo(); }, 'import'), btn('تصدير', '', function () { openExport(d, null); }, 'export')]));
  var list = visible(d), tw = el('div', 'tw'), t = el('table', 'gb');
  var hr = el('tr'), h0 = el('th', 'st', 'الطالب'); hr.appendChild(h0);
  var of = 0;
  d.items.forEach(function (it) {
    of += it.max;
    /* 0.15: the code, a small crossed eye when not published, «\ max» under it; the source tag only for Moodle */
    var th = el('th'), box = el('div', 'it'), cd = el('b', '', it.code);
    if (!it.published) { var ey = el('span', 'off'); ey.innerHTML = svg('eyeoff'); ey.title = 'غير منشور للطلاب'; cd.appendChild(ey); }
    box.appendChild(cd); box.appendChild(el('span', '', '\\ ' + fmt(it.max)));
    if (it.source === 'moodle') box.appendChild(srcTag(it));
    var xs = itemStats(d, it); box.appendChild(prog(xs.total, xs.sub, xs.graded, true));
    box.title = it.title; box.onclick = function () { itemSheet(d, it); }; th.appendChild(box); hr.appendChild(th);
  });
  if (two) { var h1 = el('th', '', 'السجل من 100'), h2 = el('th', '', 'الأداء'); h1.title = 'ما جمعه من درجة المساق، كما في EduSpace عند آخر مزامنة'; h2.title = 'مستواه فيما حُسم حتى الآن'; hr.appendChild(h1); hr.appendChild(h2); }
  else hr.appendChild(el('th', '', 'المجموع من ' + of));
  var thead = el('thead'); thead.appendChild(hr); t.appendChild(thead);
  var tb = el('tbody');
  list.forEach(function (s) {
    var tr = el('tr'), n = el('td', 'st'); n.appendChild(el('div', '', s.name)); n.appendChild(el('div', 'n12 ltr', s.id + (d.secs[s.id] ? ' · ' + d.secs[s.id] : ''))); tr.appendChild(n);
    var tot = 0;
    d.items.forEach(function (it) {
      var g = (d.grades[it.id] = d.grades[it.id] || {}), td = el('td', 'g'), inp = el('input', 'cell');
      inp.value = fmt(g[s.id]); inp.inputMode = 'decimal'; inp.setAttribute('aria-label', it.code + ' ' + s.name);
      if (it.ro || !may(d, 'grade')) { inp.readOnly = true; inp.title = 'للعرض فقط على هذا الجهاز'; }
      var pen = ((d.pens || {})[it.id] || {})[s.id];
      if (pen) { inp.title = 'خصم تأخير ' + pen + '%: تُحسب ' + fmt(fin(d, it.id, s.id)); inp.style.boxShadow = 'inset 0 -3px 0 var(--d)'; }
      if (g[s.id] != null) tot += fin(d, it.id, s.id);
      inp.onchange = function () {
        var v = num(inp.value);
        if (v != null && (isNaN(v) || v < 0 || v > it.max)) { say('الدرجة بين 0 و' + it.max); inp.value = fmt(g[s.id]); return; }
        rec(R.key, 'g', it.id, s.id, v, g[s.id] == null ? null : g[s.id], it.code + ' · ' + s.name + ': ' + (v == null ? 'مسح' : v));
        if (v == null) delete g[s.id]; else g[s.id] = v;
        inp.classList.add('dirty'); change();
        if (two) { tr.lastChild.previousSibling.classList.add('stale'); tr.lastChild.classList.add('stale'); tr.lastChild.previousSibling.title = 'تتحدّث بعد المزامنة'; }
        else { var sum = 0; d.items.forEach(function (x) { var y = fin(d, x.id, s.id); if (y != null) sum += y; }); tr.lastChild.textContent = fmt(sum); }
      };
      inp.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); var nx = tr.nextSibling && tr.nextSibling.children[d.items.indexOf(it) + 1]; if (nx) nx.firstChild.focus(); } };
      td.appendChild(inp); tr.appendChild(td);
    });
    if (two) {
      var nm = d.nums[s.id] || {}, pend = S.outbox.some(function (o) { return o.course === R.key && o.k === 'g' && o.s === s.id; });
      var c1 = el('td', 'tot' + (pend ? ' stale' : ''), nm.earned == null ? '—' : fmt(nm.earned) + (nm.bonus ? ' + ' + fmt(nm.bonus) : ''));
      var c2 = el('td', 'tot' + (pend ? ' stale' : ''), nm.perf == null ? '—' : '%' + fmt(nm.perf));
      if (pend) c1.title = c2.title = 'تتحدّث بعد المزامنة';
      tr.appendChild(c1); tr.appendChild(c2);
    } else tr.appendChild(el('td', 'tot', fmt(tot)));
    tb.appendChild(tr);
  });
  t.appendChild(tb); tw.appendChild(t); app.appendChild(tw);
  app.appendChild(el('p', 'n12', '«نشر» يُظهر الدرجات للطلاب في صفحتهم في EduSpace فقط؛ ولـ Moodle استعمل «تصدير».'));
}
/* «نشر» (0.14): every item in the order of the activities page. Not published: a box to tick (with «الكل»).
   Published: the box ticked and off, the row faded, and «سحب» on the left takes it back (after a confirmation).
   Applied at once when online, else at the next sync. */
function openPublish(d) {
  var pick = {}, n = Object.keys(d.students).length;
  sheet('نشر الدرجات', function (b, h) {
    function graded(it) { var g = d.grades[it.id] || {}; return Object.keys(g).filter(function (id) { return d.students[id] && g[id] != null; }).length; }
    function draw2() {
      b.textContent = '';
      var open = d.items.filter(function (it) { return !it.published && !it.ro; });
      var all = el('label', 'pb-row pb-all'), ac = el('input'); ac.type = 'checkbox';
      ac.checked = open.length > 0 && open.every(function (it) { return pick[it.id]; }); ac.disabled = !open.length;
      ac.onchange = function () { open.forEach(function (it) { if (ac.checked) pick[it.id] = 1; else delete pick[it.id]; }); draw2(); };
      all.appendChild(ac); all.appendChild(el('span', 'sp', 'الكل')); b.appendChild(all);
      d.items.forEach(function (it) {
        var r = el('div', 'pb-row' + (it.published ? ' off' : '')), c = el('input'); c.type = 'checkbox';
        c.checked = it.published || !!pick[it.id]; c.disabled = it.published || !!it.ro;
        c.onchange = function () { if (c.checked) pick[it.id] = 1; else delete pick[it.id]; draw2(); };
        r.appendChild(c);
        var t = el('div', 'sp'); t.appendChild(el('b', '', it.code + ' · ' + it.title));
        t.appendChild(el('div', 'n12', 'مصحَّح ' + graded(it) + ' من ' + n + (it.ro ? ' · للعرض فقط' : '')));
        r.appendChild(t);
        if (it.published) r.appendChild(el('span', 'tag ok', 'منشور'));
        if (it.published && !it.ro) r.appendChild(btn('سحب', 'sec', function () {
          if (!confirm('سحب نشر ' + it.code + '؟ يختفي التمرين ودرجاته عن الطلاب.')) return;
          it.published = false; rec(R.key, 'pub', it.id, '', false, null, 'سحب نشر ' + it.code); change(); pubNow(); draw2();
        }));
        b.appendChild(r);
      });
    }
    draw2();
  }, [['نشر', '', function (h) {
    var ids = Object.keys(pick); if (!ids.length) return say('اختر تمرينًا واحدًا على الأقل');
    d.items.forEach(function (it) { if (pick[it.id]) { it.published = true; rec(R.key, 'pub', it.id, '', true, null, 'نشر ' + it.code); } });
    change(); h.close(); draw(); pubNow(); say('نُشر ' + pl(ids.length, 'تمرين', 'تمارين') + (navigator.onLine && S.link && !S.demo ? '' : ' · يُرسل عند المزامنة'));
  }]]);
}
function pubNow() {   /* the publishing goes now when it can (it is the student's page that changes) */
  if (!S.link || S.demo || !navigator.onLine) return;
  syncNow().then(function () { draw(); }, function () { /* stays in the outbox */ });
}
/* the grade distribution as EduSpace has it (read only here; it is edited in the panel) */
function treeSheet(d) {
  sheet('توزيع الدرجات', function (b) {
    if (!d.tree || !d.tree.length) { b.appendChild(el('p', 'n14', 'لا توزيع بعد، أو أن اللوحة أقدم من 0.12. زامن بعد تحديث اللوحة.')); return; }
    var val = d.values || {}, byCode = {}; d.items.forEach(function (it) { byCode[it.code] = it; });
    function walk(list, depth) {
      list.forEach(function (n) {
        var r = el('div', 'trow d' + depth), nm = el('span', 'sp', n.name || '—');
        if (n.kind === 'extra') nm.appendChild(el('span', 'tag', 'إضافي'));
        var lk = /^a:(.+)/.exec(n.link || ''); if (lk) nm.appendChild(el('span', 'tag', byCode[lk[1]] ? lk[1] : lk[1] + ' (غير منشور)'));
        if (n.link === 'part') nm.appendChild(el('span', 'tag', 'الحضور والمشاركة'));
        r.appendChild(nm);
        r.appendChild(el('span', 'n14 ltr', n.unit === 'pts' ? fmt(n.w) + ' درجة' : '%' + fmt(n.w)));
        r.appendChild(el('b', 'ltr', fmt(val[n.id])));
        b.appendChild(r);
        if (n.kids) walk(n.kids, depth + 1);
      });
    }
    var h = el('div', 'trow hd'); h.appendChild(el('span', 'sp', 'البند')); h.appendChild(el('span', '', 'الوزن')); h.appendChild(el('span', '', 'من 100')); b.appendChild(h);
    walk(d.tree, 0);
    b.appendChild(el('p', 'n12', 'يُعدَّل التوزيع من اللوحة. «السجل» ما جمعه الطالب من 100، و«الأداء» مستواه فيما حُسم حتى الآن.'));
  });
}
function itemSheet(d, it) {
  var g = d.grades[it.id] || {}, ids = Object.keys(d.students), done = ids.filter(function (id) { return g[id] != null; }).length;
  sheet(it.code + ' · ' + it.title, function (b) {
    var r = el('div', 'row'); r.appendChild(srcTag(it)); r.appendChild(el('span', 'n14', 'من ' + it.max)); b.appendChild(r);
    var xs = itemStats(d, it), big = el('div', 'big', String(xs.graded)); big.appendChild(el('small', '', ' / ' + xs.sub + ' صُحّح من ' + xs.total)); big.style.margin = '12px 0';
    b.appendChild(big); var pg = prog(xs.total, xs.sub, xs.graded); pg.style.marginBottom = '12px'; b.appendChild(pg);
    b.appendChild(el('p', 'n14', it.published ? 'منشور: يرى الطلاب درجاتهم فيه في EduSpace بعد المزامنة.' : 'غير منشور: لا يراه الطلاب في EduSpace.'));
    if (it.source === 'moodle') b.appendChild(el('p', 'n12', 'تكليف مستورد من Moodle. نشره هنا يُظهره للطلاب في EduSpace أيضًا، ولا يرسل شيئًا إلى Moodle.'));
  }, may(d, 'pub') ? [[it.published ? 'إخفاء من EduSpace' : 'نشر في EduSpace', '', function (h) {
    it.published = !it.published; rec(R.key, 'pub', it.id, '', it.published, null, (it.published ? 'نشر ' : 'إخفاء ') + it.code); change(); h.close(); draw();
  }, 'eye']] : []);
}
function importInfo() {
  sheet('استيراد من مودل', function (b) {
    b.appendChild(el('p', 'n14', 'المرحلة الثالثة: تختار ملف zip نزّلته من Moodle، فيُفك على الجهاز، ويُنشأ تكليف مستورد بوسم Moodle، وتُطابق التسليمات بالطلاب، وتدخل محطة التصحيح.'));
    b.appendChild(el('p', 'n12', 'لبنائها أحتاج zip تسليمات حقيقيًا من Moodle (أو لقطة لأسماء المجلدات داخله).'));
  });
}

/* ----- export ----- */
function csvOf(rows) { return '﻿' + rows.map(function (r) { return r.map(function (c) { c = c == null ? '' : String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\r\n'); }
function openExport(d, ids) {
  var c = courseOf(R.key);
  sheet('تصدير الدرجات', function (b) {
    b.appendChild(el('p', 'lab', 'التكليفات'));
    var short = el('div', 'row'); b.appendChild(short);
    var boxes = d.items.map(function (it) {
      var o = el('label', 'opt'), k = el('input'); k.type = 'checkbox'; k.checked = true; k.value = it.id;
      o.appendChild(k); o.appendChild(document.createTextNode(it.code + ' · ' + it.title + ' (من ' + it.max + ')')); o.appendChild(srcTag(it)); b.appendChild(o); return k;
    });
    short.appendChild(btn('تكليفات Moodle فقط', 'sec', function () { boxes.forEach(function (k, i) { k.checked = d.items[i].source === 'moodle'; }); }));
    short.appendChild(btn('الكل', 'sec', function () { boxes.forEach(function (k) { k.checked = true; }); }));
    var f = el('div', 'field'); f.style.marginTop = '12px'; f.appendChild(el('label', '', 'الصيغة'));
    var s = el('select'); s.id = 'ex-f';
    [['moodle', 'ملف لرفعه إلى Moodle (CSV)'], ['full', 'كشف درجات كامل (CSV يفتح في Excel)']].forEach(function (o) { var x = el('option', '', o[1]); x.value = o[0]; s.appendChild(x); });
    f.appendChild(s); b.appendChild(f);
    var f2 = el('div', 'field'); f2.appendChild(el('label', '', 'الطلاب'));
    var sc = el('select'); sc.id = 'ex-s';
    (ids ? [['sel', 'المحددون (' + ids.length + ')']] : []).concat([['all', 'كل الطلاب']]).concat(secsOf(d).map(function (x) { return ['s:' + x, 'الشعبة ' + x]; }))
      .forEach(function (o) { var x = el('option', '', o[1]); x.value = o[0]; sc.appendChild(x); });
    f2.appendChild(sc); b.appendChild(f2);
    b.appendChild(el('p', 'n12', 'صيغة Moodle مؤقتة (اسم المستخدم = الرقم الجامعي) إلى أن تصلني ورقة التصحيح من Moodle عندكم. نموذج الجامعة يُضاف حين يصل ملفه.'));
    b._boxes = boxes;
  }, [['تصدير', '', function (h) {
    var pick = d.items.filter(function (it, i) { return h.body._boxes[i].checked; });
    if (!pick.length) { say('اختر تكليفًا واحدًا على الأقل'); return; }
    var scope = $('#ex-s').value, fmtSel = $('#ex-f').value;
    var who = Object.keys(d.students).filter(function (id) { return scope === 'all' ? true : scope === 'sel' ? UI.sel[id] : d.secs[id] === scope.slice(2); })
      .map(function (id) { return d.students[id]; }).sort(function (a, b) { return secCmp(d.secs[a.id] || 'zzz', d.secs[b.id] || 'zzz') || a.name.localeCompare(b.name, 'ar'); });
    var rows;
    if (fmtSel === 'moodle') {
      rows = [['اسم المستخدم', 'البريد الإلكتروني'].concat(pick.map(function (it) { return it.title; }))];
      who.forEach(function (s) { rows.push([s.id, s.email || ''].concat(pick.map(function (it) { return fmt(fin(d, it.id, s.id)); }))); });
    } else {
      var of = pick.reduce(function (a, it) { return a + it.max; }, 0);
      rows = [['الرقم الجامعي', 'الاسم', 'الشعبة'].concat(pick.map(function (it) { return it.code + ' ' + it.title + ' (' + it.max + ')'; })).concat(['المجموع (' + of + ')', 'النسبة'])];
      who.forEach(function (s) {
        var tot = 0, r = [s.id, s.name, d.secs[s.id] || ''].concat(pick.map(function (it) { var v = fin(d, it.id, s.id); if (v != null) tot += v; return fmt(v); }));
        rows.push(r.concat([fmt(tot), of ? fmt(tot / of * 100) + '%' : '']));
      });
    }
    share(new Blob([csvOf(rows)], { type: 'text/csv' }), c.code.replace(/\s/g, '') + '-' + (fmtSel === 'moodle' ? 'moodle' : 'gradesheet') + '-' + new Date().toISOString().slice(0, 10) + '.csv');
    h.close(); say('صُدّر ' + pl(who.length, 'طالب', 'طالبًا') + ' و' + pl(pick.length, 'تكليف', 'تكليفات') + ' (على الجهاز، بلا إنترنت).');
  }, 'export']]);
}

/* ===================== draw / start ===================== */
function draw() {
  var app = $('#app'), y = window.scrollY; app.textContent = ''; app.classList.remove('home');
  if (R.view === 'course' && S.data[R.key]) drawCourse(app); else drawHome(app);
  syncChip(); window.scrollTo(0, y);
}
addEventListener('online', syncChip); addEventListener('offline', syncChip);
addEventListener('hashchange', function () { fromHash(); draw(); });
if ('serviceWorker' in navigator) {
  var hadSW = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(function (r) { try { r.update(); } catch (e) { /* offline */ } }).catch(function () {});
  /* a new version took over: reload once, so it shows now and not at the next opening */
  navigator.serviceWorker.addEventListener('controllerchange', function () { if (hadSW && !window.__reloaded) { window.__reloaded = true; location.reload(); } });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.update(); }).catch(function () {}); });
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
kvGet('state').then(function (s) { S = (s && s.v >= 2) ? s : demo(); if (S !== s) persist(); fromHash(); draw(); })
  .catch(function (e) { $('#app').textContent = 'تعذّر فتح التخزين على الجهاز: ' + e.message; });
/* 0.15.1: copying gives only what is seen. The invisible direction marks kept around numbers (so a number keeps its
   place in Arabic text) never leave the page; one cell gives its value alone; several cells of a table give their
   values, a tab between cells and a line between rows, ready for Excel. */
(function () {
  var MARKS = /[‎‏‪-‮⁦-⁩؜﻿]/g;
  function clean(t) { return String(t || '').replace(MARKS, '').replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').trim(); }
  function cellText(c) { var i = c.querySelector('input,select,textarea'); return clean(i ? (i.value != null ? i.value : '') : (c.innerText || c.textContent)).replace(/\n+/g, ' '); }
  document.addEventListener('copy', function (e) {
    var a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName)) {          /* inside a field: its own selection, cleaned */
      var v = a.value.slice(a.selectionStart || 0, a.selectionEnd || 0);
      if (v && e.clipboardData) { e.clipboardData.setData('text/plain', clean(v)); e.preventDefault(); }
      return;
    }
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount || !e.clipboardData) return;
    var r = sel.getRangeAt(0), box = r.commonAncestorContainer;
    if (box.nodeType !== 1) box = box.parentNode;
    var table = box.closest ? box.closest('table') : null, text;
    var inCell = box.closest ? box.closest('td,th') : null;
    if (table && !inCell) {
      var rows = [];
      [].forEach.call(table.rows, function (tr) {
        var cells = [].filter.call(tr.cells, function (c) { return r.intersectsNode(c); });
        if (cells.length) rows.push(cells.map(cellText).join('\t'));
      });
      text = rows.join('\n');
    } else text = clean(sel.toString());
    e.clipboardData.setData('text/plain', text);
    e.preventDefault();
  });
})();
/* 0.16: keys for the whole app, only when no field has the cursor: «/» search, Alt+N (⌥N) add, «?» the list of keys.
   Esc closes a pop-up; ← → and ↑ ↓ move between students and assignments where there is a next one. */
(function () {
  var KEYS = [['/', 'البحث'], ['Alt + N', 'إضافة (حيث يوجد زر «إضافة»)'], ['Esc', 'إغلاق النافذة'], ['← →', 'الطالب التالي والسابق في التصحيح'], ['↑ ↓', 'التمرين التالي والسابق للطالب نفسه (الآيباد)'], ['Enter', 'حفظ الدرجة والنزول إلى التالي'], ['Ctrl/⌘ + B, I, U', 'عريض، مائل، تسطير في المحرر'], ['?', 'هذه القائمة']];
  function seen(e) { return e && e.offsetParent !== null; }
  function typing(t) { return t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable); }
  function showKeys() {
    var old = document.getElementById('kbd-help'); if (old) { old.remove(); return; }
    var w = document.createElement('div'); w.id = 'kbd-help';
    w.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center';
    var b = document.createElement('div'); b.style.cssText = 'background:#fff;border-radius:24px;padding:20px 24px;min-width:320px;max-width:90vw;font-size:14px;box-shadow:0 10px 40px rgba(0,0,0,.25)';
    var h = document.createElement('b'); h.textContent = 'اختصارات لوحة المفاتيح'; h.style.cssText = 'display:block;font-size:18px;margin-bottom:12px'; b.appendChild(h);
    KEYS.forEach(function (k) {
      var r = document.createElement('div'); r.style.cssText = 'display:flex;justify-content:space-between;gap:24px;padding:6px 0;border-top:1px solid #eee';
      var a = document.createElement('span'); a.textContent = k[1]; var c = document.createElement('code'); c.textContent = k[0]; c.dir = 'ltr'; c.style.cssText = 'background:#f1f2f6;border-radius:6px;padding:0 8px';
      r.appendChild(a); r.appendChild(c); b.appendChild(r);
    });
    w.appendChild(b); w.onclick = function () { w.remove(); }; document.body.appendChild(w);
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { var hp = document.getElementById('kbd-help'); if (hp) { hp.remove(); return; } }
    if (typing(e.target) || e.ctrlKey || e.metaKey) return;
    if (e.key === '/') {
      var q = [].filter.call(document.querySelectorAll('input[type=search]'), seen)[0];
      if (q) { e.preventDefault(); q.focus(); q.select(); }
    } else if (e.altKey && e.code === 'KeyN') {
      var add = [].filter.call(document.querySelectorAll('button'), function (b) { return seen(b) && !b.disabled && /^\s*(إضافة|جديد|إضافة مساق|مساق جديد)\s*$/.test(b.textContent); })[0];
      if (add) { e.preventDefault(); add.click(); }
    } else if (e.key === '?') { e.preventDefault(); showKeys(); }
  });
})();
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !VW) { var o = document.querySelector('.ov'); if (o) o.remove(); } });
