/* EduSpace offline — the whole course on the iPad (0.18.0, new): «المساق» «المحاضرات» «الأنشطة» «التوزيع» «الحضور والمشاركة»
   «المناقشة» «الإعدادات», beside «الطلاب» «التسليمات» «سجل الدرجات» (app.js, station.js). Everything is prepared
   offline: each change is applied here at once and kept in the outbox; the sync sends it (the panel's SyncContent.gs),
   the latest edit wins item by item, with a notice. A lecture or an activity made here has an id «t…» until the panel
   gives it its own. Files of lectures and activities wait in the upload queue (IndexedDB «up») and go up in chunks after
   the item is on the server; a video is a link. What is prepared stays a draft (or scheduled) until it is published.
     IndexedDB  up  <uid> → { uid, course, kind:'lec'|'asg', id, name, mime, title, size, blob, at, err }
     outbox     { id:'C|<k>|<course>|<item>|<op>[|…]', n, at, course, k, op, i, d, b, s, wk, v, w, text } */
'use strict';

ICON.info = '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>';
ICON.play = '<path d="M10 7.75a.75.75 0 0 1 1.142-.638l3.664 2.249a.75.75 0 0 1 0 1.278l-3.664 2.25a.75.75 0 0 1-1.142-.64z"/><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4"/><path d="M8 21h8"/>';
ICON.task = '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>';
ICON.check = '<path d="M20 6 9 17l-5-5"/>';
ICON.zap = '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>';
ICON.gear = '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>';
ICON.hand2 = '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>';
ICON.home2 = '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>';
ICON.lock = '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>';
ICON.unlock = '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>';
ICON.file = '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>';
ICON.archive = '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>';

/* the buttons of a course, in the panel's order (backlog أ; 0.19: eight in the row, the distribution and the settings elsewhere) */
var CTABS = [['info', 'المساق', 'home2'], ['lec', 'المحاضرات', 'play'], ['asg', 'الأنشطة', 'task'], ['students', 'الطلاب', 'users'],
  ['subs', 'التسليمات', 'inbox'], ['grades', 'السجل', 'grades'], ['part', 'المشاركة', 'hand2'],
  ['qk', 'مناقشة', 'zap']];
/* 0.19 (ui_notes 32): «التوزيع» opens from the gradebook's row, ⚙ «الإعدادات» is a round button beside the back arrow */
var CTAB_TIP = { grades: 'سجل الدرجات', part: 'الحضور والمشاركة', qk: 'المناقشات' };
function codeShow(code) { return String(code || '').replace(/\s+/g, '').replace(/^([A-Z]+)(\d+)$/, '$1 $2'); }

/* ===================== content: what came down, with the changes not sent yet on top ===================== */
function CT(d) { d.content = d.content || { lec: [], asg: [], dist: { tree: [], acts: [] }, part: null, quick: { items: [], sections: [] }, set: null, can: {} }; return d.content; }
function cmay(d, w) { var c = CT(d).can || {}; return c[w] !== false; }
function stampOf(x) { var t = x && x.updatedAt; if (!t) return 0; if (typeof t === 'number') return t; var m = Date.parse(t); return isNaN(m) ? 0 : m; }
function tmpId() { return 't' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); }
function findLec(c, id) { return c.lec.filter(function (x) { return x.id === id; })[0] || null; }
function findAsg(c, id) { return c.asg.filter(function (x) { return (x.tmp || x.code) === id || x.code === id; })[0] || null; }
function findQk(c, id) { return (c.quick.items || []).filter(function (x) { return x.id === id; })[0] || null; }

/* one change: applied here now, and kept for the sync */
function recC(key, k, op, i, extra, text) {
  var d = S.data[key];
  if (!d) return;
  var need = { lec: 'content', asg: 'content', dist: 'dist', set: 'set', part: 'part', plock: 'part', pon: 'part', qk: 'quick' }[k];
  if (!cmay(d, need)) { say('لا صلاحية لهذا التغيير على هذا الجهاز'); return false; }
  extra = extra || {};
  var parts = ['C', k, key, i || '', op || ''];
  if (k === 'part') parts.push(extra.s, extra.wk);
  if (k === 'qk' && op === 'rate') parts.push(extra.s);
  if (k === 'lec' || k === 'asg') { if (op === 'link' || op === 'rmmat') parts.push(Date.now() + Math.random()); }
  var id = parts.join('|'), ex = S.outbox.filter(function (o) { return o.id === id; })[0];
  var o = ex || { id: id, n: 0, course: key, k: k, op: op || '', i: i || '' };
  if (!ex) {
    S.seq = (S.seq || 0) + 1; o.n = S.seq;
    if (extra.b != null) o.b = extra.b;
    if (k === 'part') o.w = extra.w == null ? null : extra.w;
    S.outbox.push(o);
  }
  o.at = Date.now(); o.text = text || o.text || '';
  ['d', 's', 'wk', 'v'].forEach(function (f) { if (extra[f] !== undefined) o[f] = extra[f]; });
  delete o.cf; delete o.err; delete o.cur;
  if (k === 'part' && same(o.v, o.w)) S.outbox = S.outbox.filter(function (x) { return x !== o; });
  applyC(CT(d), o);
  change();
  return true;
}
/* a deleted item that never reached the panel: its changes and files go, nothing is sent */
function dropTmp(key, k, i) {
  S.outbox = S.outbox.filter(function (o) { return !(o.course === key && o.k === k && o.i === i); });
  fAll('up').then(function (all) { all.forEach(function (x) { if (x.v.course === key && x.v.id === i) fDel('up', x.k); }); }).catch(function () {});
  var c = CT(S.data[key]);
  if (k === 'lec') c.lec = c.lec.filter(function (x) { return x.id !== i; });
  if (k === 'asg') c.asg = c.asg.filter(function (x) { return (x.tmp || x.code) !== i; });
  if (k === 'qk') c.quick.items = c.quick.items.filter(function (x) { return x.id !== i; });
  change();
}
/* one change on the content as it is here */
function applyC(c, o) {
  var d = o.d || {}, x;
  if (o.k === 'lec') {
    x = findLec(c, o.i);
    if (o.op === 'save') {
      if (!x) { x = { id: o.i, status: 'draft', materials: [] }; c.lec.push(x); }
      ['title', 'description', 'pubDate', 'week', 'timeFrom', 'timeTo'].forEach(function (f) { if (d[f] !== undefined) x[f] = d[f]; });
      if (d.status && o.i.charAt(0) === 't') x.status = d.status;
      if (x.pubDate && x.pubDate > isoDay(new Date()) && x.status !== 'archived') x.status = 'scheduled';
      x.local = true;
    } else if (!x) return;
    else if (o.op === 'status') x.status = o.v;
    else if (o.op === 'del') c.lec = c.lec.filter(function (y) { return y !== x; });
    else if (o.op === 'link') x.materials = (x.materials || []).concat([{ id: 'l' + o.n, kind: d.kind, title: d.title || d.url, url: d.url, local: true }]);
    else if (o.op === 'rmmat') x.materials = (x.materials || []).filter(function (m) { return m.id !== o.v; });
    c.lec.sort(function (a, b) { return (a.week - b.week) || String(a.pubDate || '').localeCompare(String(b.pubDate || '')); });
  } else if (o.k === 'asg') {
    x = findAsg(c, o.i);
    if (o.op === 'save') {
      if (!x) { x = { code: d.code, status: 'draft', materials: [] }; if (o.i.charAt(0) === 't') x.tmp = o.i; c.asg.push(x); }
      Object.keys(d).forEach(function (f) { x[f] = d[f]; });
      x.local = true;
    } else if (!x) return;
    else if (o.op === 'status') x.status = o.v;
    else if (o.op === 'del') c.asg = c.asg.filter(function (y) { return y !== x; });
    else if (o.op === 'link') x.materials = (x.materials || []).concat([{ id: 'l' + o.n, kind: d.kind, title: d.title || d.url, url: d.url, local: true }]);
    else if (o.op === 'rmmat') x.materials = (x.materials || []).filter(function (m) { return m.id !== o.v; });
  } else if (o.k === 'dist') { c.dist.tree = d.tree || []; c.dist.local = true; }
  else if (o.k === 'part' && c.part) { var m = c.part.marks[o.s] = c.part.marks[o.s] || {}; if (o.v == null || o.v === '') delete m[o.wk]; else m[o.wk] = +o.v; }
  else if (o.k === 'plock' && c.part) { if (o.v) c.part.unlocked[o.wk] = true; else delete c.part.unlocked[o.wk]; }
  else if (o.k === 'pon' && c.part) c.part.enabled = !!o.v;
  else if (o.k === 'set' && c.set) { Object.keys(d).forEach(function (f) { if (f === 'perWeek') c.set.perWeek = +d[f]; else c.set.settings[f] = d[f]; }); }
  else if (o.k === 'qk') {
    x = findQk(c, o.i);
    if (o.op === 'save') {
      if (!x) { x = { id: o.i, rows: [], total: 0, done: 0, status: { k: 'soon', t: 'لم يُرسل بعد' } }; c.quick.items.unshift(x); }
      Object.keys(d).forEach(function (f) { if (f !== 'slots') x[f] = d[f]; });
      x.slots = (d.slots || []).map(function (l, n) { return { k: 's' + n, label: l }; });
      x.local = true;
    } else if (!x) return;
    else if (o.op === 'mode') { x.mode = o.v; x.status = { k: o.v === 'closed' ? 'closed' : 'open', t: o.v === 'closed' ? 'مغلق الآن' : o.v === 'open' ? 'مفتوح الآن' : 'تلقائي' }; }
    else if (o.op === 'del') c.quick.items = c.quick.items.filter(function (y) { return y !== x; });
    else if (o.op === 'rate') (x.rows || []).forEach(function (r) { if (r.id === o.s) r.rate = +o.v || 0; });
  }
}
/* after a download: the changes still waiting go back on top */
function applyContentOutbox(data) {
  S.outbox.forEach(function (o) { if (o.k && o.id && String(o.id).indexOf('C|') === 0 && data[o.course]) applyC(CT(data[o.course]), o); });
}
function isoDay(dt) { return dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + dt.getDate()).slice(-2); }

/* the push of one change: what the panel needs (SyncContent.gs) */
function wireC(o) { return { n: o.n, k: o.k, c: o.course, op: o.op, id: o.i, d: o.d, at: o.at, b: o.b || 0, s: o.s, wk: o.wk, v: o.v, w: o.w, f: !!o.f, what: o.text }; }
/* the replies: real ids for «t…», what the panel kept (stale), what replaced a change made in the panel (over) */
function afterPushC(results) {
  var notes = [], map = [];
  results.forEach(function (r) {
    var o = S.outbox.filter(function (x) { return x.n === r.n; })[0];
    if (!o || String(o.id).indexOf('C|') !== 0) return;
    if (r.st === 'ok' && r.id && o.i && o.i.charAt(0) === 't') map.push([o.course, o.i, r.id]);
    if (r.st === 'stale') notes.push('«' + (o.text || o.k) + '»: عُدّل في اللوحة بعدك، فبقيت نسخة اللوحة');
    if (r.st === 'ok' && r.over) notes.push('«' + (o.text || o.k) + '»: استبدل تعديلك تعديلًا أقدم في اللوحة');
  });
  map.forEach(function (m) {
    var course = m[0], tmp = m[1], real = m[2];
    S.outbox.forEach(function (o) { if (o.course === course && o.i === tmp) o.i = real; });
    fAll('up').then(function (all) { all.forEach(function (x) { if (x.v.course === course && x.v.id === tmp) { x.v.id = real; fPut('up', x.k, x.v); } }); }).catch(function () {});
  });
  return { notes: notes, map: map };
}
/* ===================== the upload queue: files of lectures and activities, in chunks ===================== */
var UP_CHUNK = 393216;                   /* 384 KB: a multiple of 3, so the base64 pieces join on the server */
var UP_LIMIT = { jpg: 10, jpeg: 10, png: 10, gif: 10, webp: 10, heic: 10, pdf: 10, doc: 10, docx: 10, txt: 10, xls: 10, xlsx: 10, csv: 10, ppt: 20, pptx: 20, key: 20, zip: 30 };
var UPPING = false;
function upAdd(key, kind, id, file, title) {
  var ext = String(file.name.split('.').pop() || '').toLowerCase(), lim = UP_LIMIT[ext];
  if (!lim) { say('نوع الملف غير مدعوم: ' + ext); return Promise.resolve(false); }
  if (file.size > lim * 1048576) { say('الملف أكبر من ' + lim + ' م.ب'); return Promise.resolve(false); }
  var uid = 'u' + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36);
  return fPut('up', uid, { uid: uid, course: key, kind: kind, id: id, name: file.name, mime: file.type || 'application/octet-stream', title: title || file.name, size: file.size, blob: file, at: Date.now() })
    .then(function () { UPS = null; upList(); return true; });
}
var UPS = null;                          /* the queue as it is now, for drawing */
function upList() { return fAll('up').then(function (a) { UPS = a.map(function (x) { return x.v; }); if (R.view === 'course' && !document.querySelector('.ov') && !VW) draw(); return UPS; }).catch(function () { UPS = []; return []; }); }
function upFor(key, id) { return (UPS || []).filter(function (u) { return u.course === key && u.id === id; }); }
function b64Part(blob) { return blob.arrayBuffer().then(function (b) { return b64of(b); }); }
/* every queued file whose item is on the panel already; one after the other */
function upRun() {
  if (UPPING || !S.link || S.demo || !navigator.onLine) return Promise.resolve(0);
  UPPING = true;
  var done = 0;
  return fAll('up').then(function (all) {
    var live = {}; S.courses.forEach(function (c) { live[c.key] = 1; });
    var list = all.filter(function (x) { return live[x.v.course] && String(x.v.id).charAt(0) !== 't'; });
    return list.reduce(function (p, x) {
      return p.then(function () {
        var u = x.v, n = Math.max(1, Math.ceil(u.size / UP_CHUNK));
        return api(S.link, 'upst', { c: u.course, u: u.uid }).then(function (st) {
          var have = {}; (st.have || []).forEach(function (i) { have[i] = 1; });
          var chain = Promise.resolve();
          for (var i = 0; i < n; i++) (function (i) {
            if (have[i]) return;
            chain = chain.then(function () { return b64Part(u.blob.slice(i * UP_CHUNK, (i + 1) * UP_CHUNK)).then(function (b) { return api(S.link, 'up', { c: u.course, u: u.uid, i: i, b: b }); }); });
          })(i);
          return chain.then(function () { return api(S.link, 'upend', { c: u.course, u: u.uid, n: n, kind: u.kind, id: u.id, name: u.name, mime: u.mime, title: u.title }); });
        }).then(function () { done++; return fDel('up', x.k); })
          .catch(function (e) { u.err = String((e && e.message) || e); return fPut('up', x.k, u); });
      });
    }, Promise.resolve());
  }).then(function () { UPPING = false; upList(); return done; }, function () { UPPING = false; return done; });
}

/* ===================== small builders ===================== */
function fld(label, input, tip) {
  var f = el('div', 'field'), l = el('label', '', label); if (input.id) l.setAttribute('for', input.id);
  if (tip) { var t = el('span', 'n12', ' · ' + tip); l.appendChild(t); }
  f.appendChild(l); f.appendChild(input); return f;
}
function inp(type, value, ph, id) { var i = el('input', 'inp'); i.type = type || 'text'; if (value != null) i.value = value; if (ph) i.placeholder = ph; if (id) i.id = id; if (/date|time/.test(i.type)) i.style.textAlign = 'center'; return i; }
function area(value, ph) { var t = el('textarea', 'inp ta'); t.value = value || ''; if (ph) t.placeholder = ph; t.rows = 4; return t; }
function selOf(list, cur) { var s = el('select', 'inp'); list.forEach(function (o) { var x = el('option', '', o[1]); x.value = o[0]; if (String(o[0]) === String(cur)) x.selected = true; s.appendChild(x); }); return s; }
function chk(label, on) { var l = el('label', 'opt'), c = el('input'); c.type = 'checkbox'; c.checked = !!on; l.appendChild(c); l.appendChild(document.createTextNode(label)); l.box = c; return l; }
function rico(k, tip, fn, cls) { var b = ico(k, tip, function (e) { e.stopPropagation(); fn(e); }); if (cls) b.classList.add(cls); return b; }
var STAT_NAME = { draft: 'مسودة', scheduled: 'مجدول', published: 'منشور', archived: 'مؤرشف' };
function stTag(s) { return el('span', 'tag' + (s === 'published' ? ' ok' : s === 'archived' ? '' : ' warn'), STAT_NAME[s] || s); }
function pendTag() { return el('span', 'tag warn', 'لم يُرسل'); }
function hasPend(key, k, i) { return S.outbox.some(function (o) { return o.course === key && o.k === k && o.i === i; }); }
function head(app, t, actions) {
  var h = el('div', 'chead'); h.appendChild(el('h2', '', t));
  var a = el('div', 'row'); (actions || []).forEach(function (x) { a.appendChild(x); }); h.appendChild(a);
  app.appendChild(h);
}
function emptyNote(app, t) { app.appendChild(el('p', 'empty', t)); }

/* ===================== «المساق» ===================== */
function drawInfo(app, d) {
  var c = CT(d), co = courseOf(R.key);
  head(app, 'المساق');
  var g = el('div', 'grid');
  function tile(n, of, label, tab) {
    var k = el('div', 'card stat go'); var b = el('div', 'big', String(n)); if (of != null) b.appendChild(el('small', '', ' \\ ' + of)); k.appendChild(b);
    k.appendChild(el('span', 'n14', label)); if (tab) k.onclick = function () { go('course', R.key, tab); }; return k;
  }
  var lp = c.lec.filter(function (l) { return l.status === 'published'; }).length, la = c.lec.filter(function (l) { return l.status !== 'archived'; }).length;
  var ap = c.asg.filter(function (a) { return a.status === 'published'; }).length, aa = c.asg.filter(function (a) { return a.status !== 'archived'; }).length;
  g.appendChild(tile(Object.keys(d.students).length, null, 'الطلاب', 'students'));
  g.appendChild(tile(lp, la, 'المحاضرات المنشورة', 'lec'));
  g.appendChild(tile(ap, aa, 'الأنشطة المنشورة', 'asg'));
  g.appendChild(tile((c.quick.items || []).length, null, 'المناقشات', 'qk'));
  app.appendChild(g);
  var pend = S.outbox.filter(function (o) { return o.course === R.key; }).length, ups = (UPS || []).filter(function (u) { return u.course === R.key; }).length;
  var p = el('div', 'card'); p.style.marginTop = '16px';
  p.appendChild(el('p', 'n14', co.name + ' · ' + co.sem));
  p.appendChild(el('p', 'n14', pend ? pl(pend, 'تغيير', 'تغييرات') + ' بانتظار الإرسال' : 'كل تغييرات هذا المساق أُرسلت'));
  if (ups) p.appendChild(el('p', 'n14', pl(ups, 'ملف', 'ملفات') + ' في طابور الرفع'));
  p.appendChild(el('p', 'n12', 'كل ما تجهّزه هنا يعمل بلا إنترنت، ويُرسل وحده عند المزامنة (كل 10 دقائق، وعند فتح التطبيق، وعند عودة الاتصال).'));
  app.appendChild(p);
}

/* ===================== lectures ===================== */
function drawLec(app, d) {
  var c = CT(d), can = cmay(d, 'content');
  head(app, 'المحاضرات', can ? [btn('إضافة', '', function () { lecForm(d, null); }, 'plus')] : []);
  if (!c.lec.length) return emptyNote(app, 'لا محاضرات بعد.');
  var wk = null, box = el('div', 'list');
  c.lec.forEach(function (l) {
    if (l.week !== wk) { wk = l.week; box.appendChild(el('div', 'wkh', 'الأسبوع ' + (wk || '—'))); }
    var k = el('div', 'card item'), h = el('div', 'ih'), t = el('div', 'it');
    var h3 = el('h3', '', l.title || '—'); t.appendChild(h3);
    t.appendChild(stTag(l.status)); if (hasPend(R.key, 'lec', l.id) || l.id.charAt(0) === 't') t.appendChild(pendTag());
    h.appendChild(t);
    var a = el('div', 'ia');
    if (can) {
      a.appendChild(rico('plus', 'إضافة ملف أو رابط', function () { matAdd(d, 'lec', l.id); }));
      a.appendChild(rico('pen', 'تعديل', function () { lecForm(d, l); }));
      a.appendChild(rico(l.status === 'published' ? 'eyeoff' : 'eye', l.status === 'published' ? 'إخفاء' : 'نشر', function () { recC(R.key, 'lec', 'status', l.id, { v: l.status === 'published' ? 'draft' : 'published', b: stampOf(l) }, (l.status === 'published' ? 'إخفاء ' : 'نشر ') + l.title); draw(); }));
      a.appendChild(rico('archive', 'أرشفة', function () { recC(R.key, 'lec', 'status', l.id, { v: 'archived', b: stampOf(l) }, 'أرشفة ' + l.title); draw(); }));
      a.appendChild(rico('del', 'حذف', function () { itemDel(d, 'lec', l.id, l.title, stampOf(l), (l.materials || []).length); }, 'red'));
    }
    h.appendChild(a); k.appendChild(h);
    var m = [l.pubDate ? l.pubDate : '', l.timeFrom ? l.timeFrom + (l.timeTo ? '–' + l.timeTo : '') : ''].filter(Boolean).join(' · ');
    if (m) k.appendChild(el('div', 'n12 ltr', m));
    matList(k, d, 'lec', l.id, l.materials, can);
    box.appendChild(k);
  });
  app.appendChild(box);
}
function lecForm(d, l) {
  var isNew = !l, id = isNew ? tmpId() : l.id;
  sheet(isNew ? 'محاضرة جديدة' : 'تعديل المحاضرة', function (b) {
    var ti = inp('text', l && l.title, 'العنوان'), wk = inp('number', l ? l.week : '', '1'), dt = inp('date', l && l.pubDate), t1 = inp('time', l && l.timeFrom), t2 = inp('time', l && l.timeTo), ds = area(l && l.description, 'وصف قصير');
    b.appendChild(fld('العنوان', ti));
    var r = el('div', 'cols3'); r.appendChild(fld('الأسبوع', wk, 'يُحسب من التاريخ إن كان للفصل تاريخ بداية')); r.appendChild(fld('تاريخ النشر', dt)); b.appendChild(r);
    var r2 = el('div', 'cols3'); r2.appendChild(fld('من', t1)); r2.appendChild(fld('إلى', t2)); b.appendChild(r2);
    b.appendChild(fld('الوصف', ds));
    b._get = function () { return { title: ti.value.trim(), week: wk.value, pubDate: dt.value, timeFrom: t1.value, timeTo: t2.value, description: ds.value }; };
  }, [['حفظ', '', function (h) {
    var x = h.body._get();
    if (!x.title) return say('العنوان مطلوب');
    if (!x.pubDate && !(+x.week >= 1 && +x.week <= 30)) return say('اكتب رقم الأسبوع (1–30) أو تاريخ النشر');
    recC(R.key, 'lec', 'save', id, { d: x, b: isNew ? 0 : stampOf(l) }, (isNew ? 'محاضرة جديدة: ' : 'تعديل: ') + x.title);
    h.close(); draw(); say('حُفظت على الجهاز، وتُرسل عند المزامنة');
  }, 'check']]);
}
function itemDel(d, k, id, name, b, n) {
  function go2() {
    if (String(id).charAt(0) === 't') dropTmp(R.key, k, id);
    else recC(R.key, k, 'del', id, { b: b }, 'حذف ' + name);
    draw(); say('حُذف. يُنقل إلى سلة Drive عند المزامنة');
  }
  if (!n) return go2();
  sheet('حذف «' + name + '»؟', function (bx) { bx.appendChild(el('p', 'n14', 'يُحذف ومعه ' + pl(n, 'مرفق', 'مرفقات') + '، ويُنقل إلى سلة Drive عند المزامنة.')); },
    [['حذف', 'dz', function (h) { h.close(); go2(); }, 'del']]);
}
/* materials: links and videos at once; files through the upload queue */
function matList(k, d, kind, id, list, can) {
  var ups = upFor(R.key, id);
  if (!(list || []).length && !ups.length) return;
  var w = el('div', 'mats');
  (list || []).forEach(function (m) {
    var r = el('div', 'mat'); r.appendChild(el('span', 'tag', m.kind === 'video' ? 'فيديو' : m.kind === 'file' ? 'ملف' : 'رابط'));
    var a = el('a', 'sp', m.title || m.url); if (m.url) { a.href = m.url; a.target = '_blank'; a.rel = 'noopener'; } r.appendChild(a);
    if (m.local) r.appendChild(pendTag());
    if (can) r.appendChild(rico('x', 'إزالة', function () { recC(R.key, kind, 'rmmat', id, { v: m.id }, 'إزالة مرفق: ' + (m.title || '')); draw(); }));
    w.appendChild(r);
  });
  ups.forEach(function (u) {
    var r = el('div', 'mat'); r.appendChild(el('span', 'tag warn', 'بانتظار الرفع')); r.appendChild(el('span', 'sp', u.title + ' · ' + size(u.size)));
    if (u.err) r.appendChild(el('span', 'n12', u.err));
    r.appendChild(rico('x', 'إلغاء الرفع', function () { fDel('up', u.uid).then(upList); }));
    w.appendChild(r);
  });
  k.appendChild(w);
}
function matAdd(d, kind, id) {
  sheet('إضافة مرفق', function (b) {
    var ty = selOf([['file', 'ملف'], ['video', 'فيديو (رابط)'], ['link', 'رابط']], 'file'), ti = inp('text', '', 'اسم يظهر للطلاب (اختياري)'), u = inp('url', '', 'https://'), f = el('input'); f.type = 'file';
    var fu = fld('الرابط', u), ff = fld('الملف', f, 'حتى 10 م.ب (العروض 20، zip 30)');
    function sw() { fu.hidden = ty.value === 'file'; ff.hidden = ty.value !== 'file'; }
    ty.onchange = sw; b.appendChild(fld('النوع', ty)); b.appendChild(fld('الاسم', ti)); b.appendChild(fu); b.appendChild(ff); sw();
    b._get = function () { return { kind: ty.value, title: ti.value.trim(), url: u.value.trim(), file: f.files && f.files[0] }; };
  }, [['إضافة', '', function (h) {
    var x = h.body._get();
    if (x.kind === 'file') {
      if (!x.file) return say('اختر ملفًا');
      upAdd(R.key, kind, id, x.file, x.title).then(function (ok) { if (ok) { h.close(); draw(); say('في طابور الرفع: يُرفع عند المزامنة'); } });
      return;
    }
    if (!/^https:\/\/\S+$/i.test(x.url)) return say('الرابط يبدأ بـ https://');
    recC(R.key, kind, 'link', id, { d: { kind: x.kind, url: x.url, title: x.title } }, 'رابط: ' + (x.title || x.url)); h.close(); draw();
  }, 'plus']]);
}

/* ===================== activities ===================== */
var ATYPES = [['text', 'نص'], ['link', 'رابط'], ['pdf', 'PDF'], ['image', 'صور'], ['doc', 'مستندات'], ['sheet', 'جداول'], ['slides', 'عروض'], ['zip', 'ZIP']];
function drawAsg(app, d) {
  var c = CT(d), can = cmay(d, 'content');
  head(app, 'الأنشطة', can ? [btn('إضافة', '', function () { asgForm(d, null); }, 'plus')] : []);
  if (!c.asg.length) return emptyNote(app, 'لا أنشطة بعد.');
  var box = el('div', 'list');
  c.asg.forEach(function (a) {
    var id = a.tmp || a.code, k = el('div', 'card item'), h = el('div', 'ih'), t = el('div', 'it');
    t.appendChild(el('h3', '', a.code + ' · ' + (a.title || '')));
    t.appendChild(stTag(a.status)); t.appendChild(el('span', 'tag', a.mode === 'group' ? 'جماعي' : 'فردي'));
    if (hasPend(R.key, 'asg', id) || a.tmp) t.appendChild(pendTag());
    h.appendChild(t);
    var ac = el('div', 'ia');
    if (can) {
      ac.appendChild(rico('plus', 'إضافة ملف أو رابط', function () { matAdd(d, 'asg', id); }));
      ac.appendChild(rico('pen', 'تعديل', function () { asgForm(d, a); }));
      ac.appendChild(rico(a.status === 'published' ? 'eyeoff' : 'eye', a.status === 'published' ? 'إخفاء' : 'نشر', function () { recC(R.key, 'asg', 'status', id, { v: a.status === 'published' ? 'draft' : 'published', b: stampOf(a) }, (a.status === 'published' ? 'إخفاء ' : 'نشر ') + a.code); draw(); }));
      ac.appendChild(rico('archive', 'أرشفة', function () { recC(R.key, 'asg', 'status', id, { v: 'archived', b: stampOf(a) }, 'أرشفة ' + a.code); draw(); }));
      ac.appendChild(rico('del', 'حذف', function () { itemDel(d, 'asg', id, a.code, stampOf(a), (a.materials || []).length); }, 'red'));
    }
    h.appendChild(ac); k.appendChild(h);
    var m = ['من ' + (a.maxGrade || 10), a.week ? 'الأسبوع ' + a.week : '', a.dueAt ? 'الاستحقاق ' + String(a.dueAt).replace('T', ' ') : '', (a.types || []).map(function (x) { return (ATYPES.filter(function (y) { return y[0] === x; })[0] || [x, x])[1]; }).join('، ')].filter(Boolean).join(' · ');
    k.appendChild(el('div', 'n12', m));
    matList(k, d, 'asg', id, a.materials, can);
    box.appendChild(k);
  });
  app.appendChild(box);
}
function asgForm(d, a) {
  var isNew = !a, id = isNew ? tmpId() : (a.tmp || a.code);
  sheet(isNew ? 'نشاط جديد' : 'تعديل ' + a.code, function (b) {
    var code = inp('text', a && a.code, 'T1'), ti = inp('text', a && a.title), ds = area(a && a.description), wk = inp('number', a && a.week), mx = inp('number', a ? a.maxGrade : 10);
    if (!isNew) code.disabled = true; code.dir = 'ltr';
    var r = el('div', 'cols3'); r.appendChild(fld('الرمز', code, 'حروف وأرقام')); r.appendChild(fld('الأسبوع', wk)); r.appendChild(fld('من', mx)); b.appendChild(r);
    b.appendChild(fld('العنوان', ti)); b.appendChild(fld('الوصف', ds));
    var md = selOf([['individual', 'فردي'], ['group', 'جماعي']], a ? a.mode : 'individual'); b.appendChild(fld('النوع', md));
    var g1 = inp('number', a && a.groupMin || 2), g2 = inp('number', a && a.groupMax || 4), gc = inp('datetime-local', a && a.groupClose);
    var gr = el('div', 'cols3'); gr.appendChild(fld('أدنى المجموعة', g1)); gr.appendChild(fld('أقصاها', g2)); gr.appendChild(fld('إغلاق التشكيل', gc)); b.appendChild(gr);
    md.onchange = function () { gr.hidden = md.value !== 'group'; }; md.onchange();
    b.appendChild(el('span', 'lab', 'ما يُسلَّم'));
    var tw = el('div', 'row'), boxes = ATYPES.map(function (x) { var c2 = chk(x[1], a ? (a.types || []).indexOf(x[0]) > -1 : x[0] === 'pdf'); tw.appendChild(c2); return [x[0], c2.box]; }); b.appendChild(tw);
    var nf = inp('number', a ? a.maxFiles : 1); b.appendChild(fld('عدد الملفات', nf));
    var av = inp('datetime-local', a && a.availableFrom), du = inp('datetime-local', a && a.dueAt), cl = inp('datetime-local', a && a.closeAt);
    var r3 = el('div', 'cols3'); r3.appendChild(fld('يُتاح', av)); r3.appendChild(fld('الاستحقاق', du)); r3.appendChild(fld('الإغلاق النهائي', cl, 'يسمح بالتأخير حتى هنا')); b.appendChild(r3);
    var rs = chk('يسمح بإعادة التسليم', a && a.resubmit); b.appendChild(rs);
    b._get = function () {
      return { code: code.value.trim().toUpperCase(), title: ti.value.trim(), description: ds.value, week: wk.value, maxGrade: mx.value, mode: md.value,
        groupMin: g1.value, groupMax: g2.value, groupClose: gc.value, types: boxes.filter(function (x) { return x[1].checked; }).map(function (x) { return x[0]; }),
        maxFiles: nf.value, availableFrom: av.value, dueAt: du.value, closeAt: cl.value, resubmit: rs.box.checked };
    };
  }, [['حفظ', '', function (h) {
    var x = h.body._get();
    if (!/^[A-Z0-9_-]{1,10}$/.test(x.code)) return say('الرمز: حروف إنجليزية وأرقام (حتى 10)');
    if (!x.title) return say('العنوان مطلوب');
    if (!x.types.length) return say('اختر ما يُسلَّم');
    if (isNew && CT(d).asg.some(function (y) { return y.code === x.code; })) return say('الرمز ' + x.code + ' مستعمل في هذا المساق');
    recC(R.key, 'asg', 'save', id, { d: x, b: isNew ? 0 : stampOf(a) }, (isNew ? 'نشاط جديد: ' : 'تعديل: ') + x.code);
    h.close(); draw(); say('حُفظ على الجهاز، ويُرسل عند المزامنة');
  }, 'check']]);
}

/* ===================== the grade distribution (editable offline, sent whole: the latest wins) ===================== */
var DT = null;      /* the tree being edited: a copy */
function drawDist(app, d) {
  var c = CT(d), can = cmay(d, 'dist');
  if (!DT || DT.key !== R.key) DT = { key: R.key, tree: JSON.parse(JSON.stringify(c.dist.tree || [])), dirty: false };
  head(app, 'التوزيع', can ? [btn('قسم', 'sec', function () { DT.tree.push({ name: 'قسم جديد', unit: 'pct', w: 0, kind: 'main', kids: [] }); DT.dirty = true; draw(); }, 'plus'),
    btn('حفظ', DT.dirty ? '' : 'sec', function () { recC(R.key, 'dist', 'save', 'tree', { d: { tree: DT.tree }, b: c.dist.at || 0 }, 'توزيع الدرجات'); DT.dirty = false; draw(); say('حُفظ التوزيع، ويُرسل عند المزامنة'); }, 'check')] : []);
  if (c.dist.local || hasPend(R.key, 'dist', 'tree')) app.appendChild(el('p', 'banner', 'التوزيع المعروض لم يُرسل بعد. عند المزامنة يفوز الأحدث بينه وبين ما في اللوحة.'));
  var acts = [['', 'بلا ربط (يُرصد باليد)']].concat((c.dist.acts || []).map(function (x) { return [x.link, x.link === 'part' ? 'الحضور والمشاركة' : x.code + ' · ' + x.title]; }))
    .concat(c.asg.filter(function (x) { return !(c.dist.acts || []).some(function (y) { return y.link === 'a:' + x.code; }); }).map(function (x) { return ['a:' + x.code, x.code + ' · ' + x.title]; }));
  var box = el('div', 'card');
  function row(list, n, depth) {
    var r = el('div', 'drow d' + depth), name = inp('text', n.name); name.disabled = !can;
    name.oninput = function () { n.name = name.value; DT.dirty = true; };
    var w = inp('number', n.w); w.className = 'inp w'; w.disabled = !can; w.oninput = function () { n.w = w.value; DT.dirty = true; };
    var u = selOf([['pct', '%'], ['pts', 'درجة']], n.unit); u.className = 'inp u'; u.disabled = !can;
    u.onchange = function () { list.forEach(function (x) { x.unit = u.value; }); DT.dirty = true; draw(); };
    r.appendChild(name); r.appendChild(w); r.appendChild(u);
    if (depth === 0) { var kd = selOf([['main', 'أساسي'], ['extra', 'إضافي']], n.kind || 'main'); kd.className = 'inp u'; kd.disabled = !can; kd.onchange = function () { n.kind = kd.value; DT.dirty = true; }; r.appendChild(kd); }
    if (!(n.kids && n.kids.length)) { var lk = selOf(acts, n.link || ''); lk.className = 'inp lk'; lk.disabled = !can; lk.onchange = function () { n.link = lk.value; DT.dirty = true; }; r.appendChild(lk); }
    if (can) {
      if (depth < 2) r.appendChild(rico('plus', 'بند داخله', function () { n.kids = n.kids || []; n.kids.push({ name: 'بند', unit: (n.kids[0] || {}).unit || 'pct', w: 0, link: '' }); delete n.link; DT.dirty = true; draw(); }));
      r.appendChild(rico('del', 'حذف', function () { list.splice(list.indexOf(n), 1); DT.dirty = true; draw(); }, 'red'));
    }
    box.appendChild(r);
    (n.kids || []).forEach(function (k2) { row(n.kids, k2, depth + 1); });
  }
  DT.tree.forEach(function (n) { row(DT.tree, n, 0); });
  if (!DT.tree.length) box.appendChild(el('p', 'n14', 'لا توزيع بعد. أضف قسمًا.'));
  app.appendChild(box);
  app.appendChild(el('p', 'n12', 'ثلاثة مستويات: قسم ← قسم فرعي ← بند. كل مستوى بوحدة واحدة (% من الأعلى أو درجة من 100). البند يُربط بنشاط أو بالحضور والمشاركة، أو يُرصد باليد في السجل.'));
}

/* ===================== attendance and participation ===================== */
function drawPart(app, d) {
  var c = CT(d), p = c.part, can = cmay(d, 'part');
  head(app, 'الحضور والمشاركة', p && can ? [btn(p.enabled ? 'إيقاف' : 'تفعيل', 'sec', function () { recC(R.key, 'pon', '', 'on', { v: !p.enabled }, p.enabled ? 'إيقاف المشاركة' : 'تفعيل المشاركة'); draw(); }, p.enabled ? 'eyeoff' : 'eye')] : []);
  if (!p) return emptyNote(app, 'زامن مرة بعد تحديث اللوحة إلى 0.18 لتظهر المشاركة هنا.');
  if (!p.enabled) return emptyNote(app, 'الحضور والمشاركة غير مفعّلة في هذا المساق.');
  var per = (p.cfg && p.cfg.perWeek) || 2, cur = p.curWeek || 1, weeks = [];
  for (var w = 1; w <= cur; w++) weeks.push(w);
  var tw = el('div', 'tw'), t = el('table', 'gb part'), hr = el('tr');
  hr.appendChild(el('th', 'st', 'الطالب'));
  weeks.forEach(function (w) {
    var th = el('th'), open = w === cur || p.unlocked[w];
    var b2 = el('button', 'wkb' + (open ? '' : ' lk'), 'أ' + w); b2.type = 'button'; b2.title = open ? 'مفتوح' : 'مقفل · اضغط لفتحه';
    if (w < cur && can) b2.onclick = function () { recC(R.key, 'plock', '', 'w' + w, { wk: w, v: !p.unlocked[w] }, (p.unlocked[w] ? 'قفل' : 'فتح') + ' الأسبوع ' + w); draw(); };
    th.appendChild(b2); hr.appendChild(th);
  });
  hr.appendChild(el('th', '', 'المجموع')); t.appendChild(hr);
  Object.keys(d.students).map(function (id) { return d.students[id]; }).sort(function (a, b) { return a.name.localeCompare(b.name, 'ar'); }).forEach(function (s) {
    var tr = el('tr'), m = p.marks[s.id] || {}, sum = 0;
    tr.appendChild(el('td', 'st', s.name));
    weeks.forEach(function (w) {
      var td = el('td', 'g'), v = m[w], open = (w === cur || p.unlocked[w]) && can;
      if (v != null) sum += +v;
      var i = el('input', 'cell'); i.inputMode = 'decimal'; i.value = v == null ? '' : v; i.disabled = !open;
      i.onchange = function () {
        var n = num(i.value);
        if (n != null && (isNaN(n) || n < 0 || n > per)) { say('بين 0 و' + per); i.value = v == null ? '' : v; return; }
        var server = S.outbox.filter(function (o) { return o.id === ['C', 'part', R.key, 's', '', s.id, w].join('|'); })[0];
        recC(R.key, 'part', '', 's', { s: s.id, wk: w, v: n, w: server ? server.w : (v == null ? null : +v) }, 'مشاركة ' + s.name + ' أ' + w);
      };
      td.appendChild(i); tr.appendChild(td);
    });
    tr.appendChild(el('td', 'tot', fmt(sum))); t.appendChild(tr);
  });
  tw.appendChild(t); app.appendChild(tw);
  app.appendChild(el('p', 'n12', 'درجة الأسبوع من ' + per + '. الأسابيع المنتهية مقفلة، والأسبوع الحالي ' + cur + ' مفتوح.'));
}

/* ===================== quick submissions ===================== */
var QK_OPEN = {};
function drawQuick(app, d) {
  var c = CT(d), q = c.quick || { items: [] }, can = cmay(d, 'quick');
  head(app, 'المناقشات', can ? [btn('إضافة', '', function () { qkForm(d, null); }, 'plus')] : []);
  if (!q.items.length) return emptyNote(app, 'لا مناقشات بعد.');
  q.items.forEach(function (it) {
    var k = el('div', 'card item'), h = el('div', 'ih'), t = el('div', 'it');
    t.appendChild(el('h3', '', it.title || '—'));
    t.appendChild(el('span', 'tag' + (it.status && it.status.k === 'open' ? ' ok' : ''), (it.status && it.status.t) || ''));
    if (it.section) t.appendChild(el('span', 'tag', 'الشعبة ' + it.section));
    if (it.local || hasPend(R.key, 'qk', it.id)) t.appendChild(pendTag());
    h.appendChild(t);
    var a = el('div', 'ia');
    if (can) {
      a.appendChild(selMode(it));
      a.appendChild(rico('pen', 'تعديل', function () { qkForm(d, it); }));
      a.appendChild(rico('del', 'حذف', function () { if (it.id.charAt(0) === 't') dropTmp(R.key, 'qk', it.id); else recC(R.key, 'qk', 'del', it.id, {}, 'حذف ' + it.title); draw(); }, 'red'));
    }
    a.appendChild(rico('down', 'التسليمات', function () { QK_OPEN[it.id] = !QK_OPEN[it.id]; draw(); }));
    h.appendChild(a); k.appendChild(h);
    var rows = (it.rows || []).filter(function (r) { return r.count || r.text; });          /* ui_notes 22: who submitted only */
    k.appendChild(el('div', 'n12', pl(rows.length, 'سلّم', 'سلّموا') + ' من ' + (it.total || 0)));
    if (QK_OPEN[it.id]) {
      if (!rows.length) k.appendChild(el('p', 'n14', 'لم يسلّم أحد بعد.'));
      rows.forEach(function (r) {
        var rr = el('div', 'mat'); rr.appendChild(el('span', 'sp', r.name + (r.late ? ' · متأخر' : '')));
        rr.appendChild(el('span', 'n12', pl(r.count, 'ملف', 'ملفات')));
        var rate = el('div', 'stars');
        [1, 2, 3, 4, 5].forEach(function (n) {
          var s = el('button', 'star' + ((r.rate || 0) >= n ? ' on' : ''), String(n)); s.type = 'button';
          s.onclick = function () { if (!can) return; recC(R.key, 'qk', 'rate', it.id, { s: r.id, v: r.rate === n ? 0 : n }, 'تقدير ' + r.name); draw(); };
          rate.appendChild(s);
        });
        rr.appendChild(rate); k.appendChild(rr);
      });
      k.appendChild(el('p', 'n12', 'الصور والملف المجمّع في اللوحة (تحتاج الإنترنت).'));
    }
    app.appendChild(k);
  });
}
function selMode(it) {
  var s = selOf([['auto', 'تلقائي'], ['open', 'مفتوح'], ['closed', 'مغلق']], it.mode || 'auto'); s.className = 'inp mini';
  s.onclick = function (e) { e.stopPropagation(); };
  s.onchange = function () { recC(R.key, 'qk', 'mode', it.id, { v: s.value }, 'وضع ' + it.title); draw(); };
  return s;
}
function qkForm(d, it) {
  var isNew = !it, id = isNew ? tmpId() : it.id, secs = (CT(d).quick.sections || []).map(function (x) { return [x.name, 'الشعبة ' + x.name]; });
  sheet(isNew ? 'مناقشة جديدة' : 'تعديل المناقشة', function (b) {
    var ti = inp('text', it && it.title), sc = selOf([['', 'كل الشعب']].concat(secs), it ? it.section : ''), md = selOf([['auto', 'تلقائي حسب الوقت'], ['open', 'مفتوح الآن'], ['closed', 'مغلق']], it ? it.mode : 'auto');
    var o1 = inp('datetime-local', it && it.openAt), o2 = inp('datetime-local', it && it.closeAt), gr = inp('number', it ? it.graceMin : 0);
    var sl = area(it ? (it.slots || []).map(function (s) { return s.label; }).join('\n') : 'الفكرة\nالمسقط الأفقي', 'لوحة في كل سطر');
    var ix = chk('نص الفكرة', it && it.ideaText), au = chk('شرح صوتي', it && it.audio), mo = inp('number', it ? it.maxOpt : 1);
    b.appendChild(fld('العنوان', ti));
    var r = el('div', 'cols3'); r.appendChild(fld('الشعبة', sc)); r.appendChild(fld('الوضع', md)); r.appendChild(fld('مهلة بالدقائق', gr)); b.appendChild(r);
    var r2 = el('div', 'cols3'); r2.appendChild(fld('يُفتح', o1)); r2.appendChild(fld('يُغلق', o2)); b.appendChild(r2);
    b.appendChild(fld('اللوحات المطلوبة', sl)); b.appendChild(fld('خيارات لكل لوحة (1–3)', mo));
    var r3 = el('div', 'row'); r3.appendChild(ix); r3.appendChild(au); b.appendChild(r3);
    b._get = function () {
      return { title: ti.value.trim(), section: sc.value, mode: md.value, openAt: o1.value, closeAt: o2.value, graceMin: gr.value,
        slots: sl.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean), ideaText: ix.box.checked, audio: au.box.checked, audioMax: it ? it.audioMax : 120, maxOpt: mo.value,
        exc: it ? (it.exc || []).map(function (e) { return { id: e.id, at: e.at }; }) : [] };
    };
  }, [['حفظ', '', function (h) {
    var x = h.body._get();
    if (!x.title) return say('العنوان مطلوب');
    if (x.mode === 'auto' && !x.closeAt) return say('حدّد وقت الإغلاق، أو اختر «مفتوح الآن»');
    if (!x.slots.length && !x.ideaText && !x.audio) return say('أضف لوحة واحدة على الأقل');
    recC(R.key, 'qk', 'save', id, { d: x }, (isNew ? 'مناقشة جديدة: ' : 'تعديل: ') + x.title);
    h.close(); draw(); say('حُفظ على الجهاز، ويُرسل عند المزامنة');
  }, 'check']]);
}

/* ===================== course settings ===================== */
function drawSet(app, d) {
  var c = CT(d), s = c.set, can = cmay(d, 'set');
  head(app, 'الإعدادات');
  if (!s) return emptyNote(app, 'زامن مرة بعد تحديث اللوحة إلى 0.18 لتظهر الإعدادات هنا.');
  var k = el('div', 'card');
  var rd = selOf([['d0', 'عدد صحيح'], ['d1', 'منزلة عشرية واحدة'], ['d2', 'منزلتان'], ['half', 'لأقرب نصف']], s.settings.round), lp = selOf((s.penalties || [0, 5, 10, 20, 25, 50]).map(function (x) { return [x, '%' + x]; }), s.settings.latePenalty);
  var pw = selOf((s.perWeekOptions || [1, 2, 5, 10]).map(function (x) { return [x, String(x)]; }), s.perWeek);
  [rd, lp, pw].forEach(function (x) { x.disabled = !can; });
  k.appendChild(fld('تقريب الدرجات', rd)); k.appendChild(fld('خصم التأخير', lp)); k.appendChild(fld('درجة الأسبوع في المشاركة', pw));
  if (can) k.appendChild(btn('حفظ', '', function () { recC(R.key, 'set', 'save', 'set', { d: { round: rd.value, latePenalty: +lp.value, perWeek: +pw.value } }, 'إعدادات المساق'); draw(); say('حُفظت، وتُرسل عند المزامنة'); }, 'check'));
  app.appendChild(k);
  app.appendChild(el('p', 'n12', 'استيراد الطلاب والأرشفة وحذف المساق في اللوحة، أو بزر الحذف أعلى صفحة المساق (يحتاج الإنترنت).'));
}

/* ===================== automatic sync: on opening, when the network comes back, every 10 minutes, and by the button ===================== */
var AUTO = { busy: false, last: 0, h: null };
function autoSync(why) {
  if (AUTO.busy || !S || !S.link || S.demo || !navigator.onLine || document.hidden) return;
  AUTO.busy = true; syncChip();
  syncNow().then(function (x) {
    AUTO.busy = false; AUTO.last = Date.now();
    if (!document.querySelector('.ov') && !VW) draw(); else syncChip();
    var bits = [];
    if (x.sent) bits.push('أُرسل ' + pl(x.sent, 'تغيير', 'تغييرات'));
    if (x.ups) bits.push('رُفع ' + pl(x.ups, 'ملف', 'ملفات'));
    if (x.conflicts) bits.push(pl(x.conflicts, 'تعارض', 'تعارضات') + ': افتح المزامنة');
    if (x.notes && x.notes.length) notesSheet(x.notes);
    else if (bits.length) say('مزامنة تلقائية: ' + bits.join(' · '));
  }).catch(function () { AUTO.busy = false; syncChip(); });
}
function notesSheet(list) {
  if (document.querySelector('.ov') || VW) { say(list[0]); return; }
  sheet('تنبيه المزامنة', function (b) { list.forEach(function (t) { b.appendChild(el('p', 'n14', t)); }); });
}
setInterval(function () { autoSync('timer'); }, 600000);
addEventListener('online', function () { setTimeout(function () { autoSync('online'); }, 2000); });
document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - AUTO.last > 120000) autoSync('back'); });