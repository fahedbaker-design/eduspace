/* EduSpace offline — the grading station (0.14.0: a background queue — files come down a few at a time and the
   student opened jumps the queue; «إرسال» sends in the background; lighter annotated pages. 0.13.0: a submitted text is shown as text — selectable, copyable — and the
   teacher highlights parts of it with a note on each (hl); links open; a written note for the whole submission;
   Word / Excel / PowerPoint files are opened in their own apps. 0.12.0).
   The EduSpace submissions of one assignment come down to the iPad (Sync: files / file), the teacher writes on them
   with the Apple Pencil (a finger scrolls; «الرسم بالإصبع» lets a finger draw), may record a voice note, and sends
   back one annotated PDF and the voice note (Sync: fb). The student sees them on his page once the assignment's
   grades are published.
     IndexedDB  files  <file id>                  → { id, name, mime, size, blob, course, code, s, at }
                marks  <course>|<code>|<subject>   → { ink: { <file id>: { <page>: [stroke] } }, hl: [{ a, b, c, n }], note, audio, amime, sec, state, sentAt, err }
     hl     = the highlights on the submitted text: from / to in the characters of its textContent, colour, note
     stroke = { t:'pen'|'hl', c:<colour>, w:<width, of the page width>, p:[x, y, pressure, …] (x, y of the page, 0..1) }
     state  = 'draft' (changed, not sent) | 'ready' (send at the next sync) | 'sent'
   pdf.js (vendor/pdfjs, Mozilla, Apache 2.0) draws the PDF pages; the annotated PDF is written here: each page as a
   JPEG with the ink on it (pdfOf). */

/* ===================== storage ===================== */
function tx(store, mode, fn) {
  return idb().then(function (d) {
    return new Promise(function (ok, no) {
      var t = d.transaction(store, mode || 'readonly'), s = t.objectStore(store), out = fn(s);
      t.oncomplete = function () { ok(out instanceof IDBRequest ? out.result : out); };
      t.onerror = function () { no(t.error); }; t.onabort = function () { no(t.error || new Error('تعذّر الحفظ على الجهاز')); };
    });
  });
}
function fGet(store, k) { return tx(store, 'readonly', function (s) { return s.get(k); }); }
function fPut(store, k, v) { return tx(store, 'readwrite', function (s) { s.put(v, k); }); }
function fDel(store, k) { return tx(store, 'readwrite', function (s) { s.delete(k); }); }
function fAll(store) {
  return idb().then(function (d) {
    return new Promise(function (ok, no) {
      var out = [], q = d.transaction(store).objectStore(store).openCursor();
      q.onsuccess = function () { var c = q.result; if (c) { out.push({ k: c.key, v: c.value }); c.continue(); } else ok(out); };
      q.onerror = function () { no(q.error); };
    });
  });
}
function mKey(course, code, s) { return course + '|' + code + '|' + s; }
function size(n) { return n >= 1048576 ? (Math.round(n / 104857.6) / 10) + ' م.ب' : Math.max(1, Math.round(n / 1024)) + ' ك.ب'; }

/* ===================== the server ===================== */
function b64of(buf) {
  var u = new Uint8Array(buf), s = '', CH = 0x8000;
  for (var i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH));
  return btoa(s);
}
function blobOf(b64, mime) { var bin = atob(b64), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime || 'application/octet-stream' }); }
function stOf(d, code) { d.st = d.st || {}; return d.st[code] = d.st[code] || { list: [], sent: {}, at: 0 }; }
function stList(key, code) {
  return api(S.link, 'files', { c: key, i: code }).then(function (x) {
    var st = stOf(S.data[key], code); st.list = x.list || []; st.sent = x.sent || {}; st.at = Date.now(); persist(); return st;
  });
}
function stFetch(key, code, f) {
  return fGet('files', f.id).then(function (have) {
    if (have) return have;
    return new Promise(function (ok, no) { (Q.wait[f.id] = Q.wait[f.id] || []).push([ok, no]); qDown(key, code, [f], 9); });
  });
}

/* ===================== the background queue (0.14): downloads and sends, one after the other =====================
   Files come down a few at a time (files2, about 4 MB a call); a student opened in the viewer jumps the queue with the
   next three; «إرسال» puts the feedback here and the teacher moves on. Stops without internet, goes on when it is back. */
var Q = { jobs: [], busy: false, wait: {}, done: 0, fail: 0 };
function qDown(key, code, files, pri) {
  files.forEach(function (f) {
    var j = Q.jobs.filter(function (x) { return x.t === 'down' && x.f.id === f.id; })[0];
    if (j) { j.pri = Math.max(j.pri, pri); return; }
    Q.jobs.push({ t: 'down', key: key, code: code, f: f, pri: pri, at: Q.jobs.length });
  });
  qRun();
}
function qSend(k) { if (!Q.jobs.some(function (x) { return x.t === 'send' && x.k === k; })) Q.jobs.push({ t: 'send', k: k, pri: 8, at: Q.jobs.length }); qRun(); }
function qNext() {
  Q.jobs.sort(function (a, b) { return b.pri - a.pri || a.at - b.at; });
  return Q.jobs[0];
}
function qRun() {
  qBar();
  if (Q.busy || !Q.jobs.length || !S.link || S.demo) return;
  if (!navigator.onLine) return;
  Q.busy = true;
  var j = qNext(), p;
  if (j.t === 'send') { Q.jobs.splice(Q.jobs.indexOf(j), 1); p = qDoSend(j.k); }
  else {
    /* the first job decides the assignment; up to 8 of its files go in one call */
    var batch = Q.jobs.filter(function (x) { return x.t === 'down' && x.key === j.key && x.code === j.code; }).slice(0, 8);
    batch.forEach(function (x) { Q.jobs.splice(Q.jobs.indexOf(x), 1); });
    p = onDevice().then(function (have) {
      var need = batch.filter(function (x) { if (have[x.f.id]) { qWake(x.f.id); return false; } return true; });
      if (!need.length) return;
      return api(S.link, 'files2', { c: j.key, i: j.code, f: need.map(function (x) { return x.f.id; }) }).then(function (r) {
        var by = {}; need.forEach(function (x) { by[x.f.id] = x; });
        return Promise.all((r.got || []).map(function (g) {
          var x = by[g.id]; if (!x) return;
          if (g.err) { Q.fail++; qWake(g.id, new Error(g.err)); return; }
          var rec = { id: g.id, name: g.name || x.f.name, mime: g.mime || x.f.mime, size: g.size || x.f.size, blob: blobOf(g.b64, g.mime || x.f.mime), course: x.key, code: x.code, at: Date.now() };
          return fPut('files', g.id, rec).then(function () { Q.done++; qWake(g.id, null, rec); stRowReady(x.key, x.code, g.id); });
        })).then(function () { (r.left || []).forEach(function (id) { if (by[id]) Q.jobs.push(by[id]); }); });
      }, function (e) {       /* the call failed: back to the queue, a little later */
        need.forEach(function (x) { x.pri = Math.min(x.pri, 1); Q.jobs.push(x); });
        throw e;
      });
    });
  }
  p.catch(function () { return new Promise(function (ok) { setTimeout(ok, 4000); }); })
    .then(function () { Q.busy = false; qRun(); });
}
function qWake(id, err, rec) {
  (Q.wait[id] || []).forEach(function (w) { if (err) w[1](err); else if (rec) w[0](rec); else fGet('files', id).then(w[0], w[1]); });
  delete Q.wait[id];
}
function qDoSend(k) {
  return fGet('marks', k).then(function (m) {
    if (!m || m.state !== 'ready') return;
    var q = k.split('|'), d = S.data[q[0]]; if (!d) return;
    var row = (stOf(d, q[1]).list || []).filter(function (r) { return r.s === q[2]; })[0];
    if (!row) return;
    m.state = 'sending'; qBar();
    return sendFeedback(q[0], q[1], row, m).then(function () { stRowReady(q[0], q[1]); if (VW && mKey(VW.key, VW.code, VW.row.s) === k && VW.m) { VW.m.state = 'sent'; VW.m.sentAt = m.sentAt; } },
      function (e) { m.state = 'ready'; m.err = String(e.message || e); Q.fail++; return fPut('marks', k, strip(m)).then(function () { stRowReady(q[0], q[1]); throw e; }); });
  });
}
/* the small capsule that says what the queue is doing */
function qBar() {
  var b = document.getElementById('qbar');
  if (!b) { b = el('div', 'qbar'); b.id = 'qbar'; document.body.appendChild(b); }
  var d = Q.jobs.filter(function (x) { return x.t === 'down'; }).length + (Q.busy ? 1 : 0), sd = Q.jobs.filter(function (x) { return x.t === 'send'; }).length;
  if (!Q.jobs.length && !Q.busy) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = !navigator.onLine ? 'متوقف: لا إنترنت · ' + (d + sd) + ' بالانتظار' : (d ? 'ينزل ' + d : '') + (d && sd ? ' · ' : '') + (sd ? 'يُرسل ' + sd : '') + (Q.done ? ' · وصل ' + Q.done : '');
}
window.addEventListener('online', function () { qRun(); });
window.addEventListener('offline', function () { qBar(); });
/* a row of the station's list changes as soon as its file arrives or its feedback is sent (no full redraw while working) */
var ST_T;
function stRowReady() { if (VW) return; clearTimeout(ST_T); ST_T = setTimeout(function () { if (R.view === 'course' && R.tab === 'subs' && !document.querySelector('.ov')) draw(); }, 600); }
/* every file of one assignment, in the order of the list */
function stQueueAll(key, code) {
  var st = stOf(S.data[key], code), files = [];
  st.list.slice().sort(function (a, b) { return subjName(S.data[key], a).localeCompare(subjName(S.data[key], b), 'ar'); })
    .forEach(function (r) { r.files.forEach(function (f) { files.push(f); }); });
  qDown(key, code, files, 1);
}
/* after each sync: the lists the teacher has opened are refreshed, and their new files start coming down */
function stAfterSync() {
  Object.keys(S.data || {}).forEach(function (key) {
    var d = S.data[key]; Object.keys(d.st || {}).forEach(function (code) {
      if (!d.st[code].at || !d.items.some(function (it) { return it.id === code; })) return;
      stList(key, code).then(function () { stQueueAll(key, code); }).catch(function () {});
    });
  });
}
function onDevice() {   /* the ids of every file kept on the iPad */
  return idb().then(function (d) { return new Promise(function (ok) { var q = d.transaction('files').objectStore('files').getAllKeys(); q.onsuccess = function () { var o = {}; q.result.forEach(function (k) { o[k] = 1; }); ok(o); }; q.onerror = function () { ok({}); }; }); });
}

/* ===================== the station tab ===================== */
var STN = { code: null };
function stItems(d) { return d.items.filter(function (it) { return it.source === 'eduspace'; }); }
function subjName(d, r) {
  if (r.s.indexOf('g:') === 0) return 'مجموعة ' + r.s.slice(2) + ' · ' + r.sids.map(function (id) { return (d.students[id] || {}).name || id; }).join('، ');
  return (d.students[r.s] || {}).name || r.s;
}
function drawStation(app, d) {
  var items = stItems(d);
  if (!items.length) { var p = el('div', 'ph'); p.appendChild(el('p', '', 'لا تكليفات EduSpace في هذا المساق بعد.')); app.appendChild(p); return; }
  if (!STN.code || !items.some(function (it) { return it.id === STN.code; })) {
    var c = items.filter(function (it) { var x = itemStats(d, it); return x.sub > x.graded; }); STN.code = (c[c.length - 1] || items[items.length - 1]).id;
  }
  var pills = el('div', 'pills');
  items.forEach(function (it) {
    var b = el('button', 'pill' + (it.id === STN.code ? ' on' : ''), it.code); b.type = 'button'; b.title = it.title;
    b.onclick = function () { STN.code = it.id; draw(); }; pills.appendChild(b);
  });
  app.appendChild(pills);
  var it = items.filter(function (x) { return x.id === STN.code; })[0], st = stOf(d, it.id);
  var bar = el('div', 'row'); bar.style.margin = '0 0 12px';
  var info = el('span', 'n14 sp', it.title + ' · من ' + it.max); bar.appendChild(info);
  if (S.demo) { app.appendChild(bar); var q = el('div', 'ph'); q.appendChild(el('p', '', 'محطة التصحيح تعمل مع EduSpace: اربط الجهاز أولًا.')); app.appendChild(q); return; }
  if (!may(d, 'grade') || it.ro) { bar.appendChild(el('span', 'tag', 'للعرض فقط')); }
  bar.appendChild(btn('تحديث', 'sec', function () { busy(stList(R.key, it.id), 'تُحدَّث القائمة…').then(function () { stQueueAll(R.key, it.id); draw(); }); }, 'sync'));
  bar.appendChild(btn('تنزيل', 'sec', function () { downloadAll(R.key, it.id); }, 'import'));
  app.appendChild(bar);
  var box = el('div', 'tw'), t = el('table', 'stn'); box.appendChild(t); app.appendChild(box);
  if (!st.at) { busy(stList(R.key, it.id), 'تُجلب قائمة التسليمات…').then(function () { stQueueAll(R.key, it.id); draw(); }).catch(function () {}); }
  Promise.all([onDevice(), fAll('marks')]).then(function (r) {
    var have = r[0], marks = {}; r[1].forEach(function (x) { marks[x.k] = x.v; });
    var hr = el('tr'); ['الطالب', 'التسليم', 'ما سُلِّم', 'الحالة', 'الدرجة'].forEach(function (h) { hr.appendChild(el('th', '', h)); }); t.appendChild(hr);
    if (!st.list.length) { var e = el('tr'), td = el('td', 'n14', st.at ? 'لا تسليمات بعد.' : 'جارٍ التحميل…'); td.colSpan = 5; e.appendChild(td); t.appendChild(e); }
    st.list.slice().sort(function (a, b) { return subjName(d, a).localeCompare(subjName(d, b), 'ar'); }).forEach(function (row, i, all) {
      var tr = el('tr', 'link'), m = marks[mKey(R.key, it.id, row.s)], sent = st.sent[row.s];
      var nm = el('td'); nm.appendChild(el('div', '', subjName(d, row))); nm.appendChild(el('div', 'n12 ltr', row.s.indexOf('g:') ? row.s : '')); tr.appendChild(nm);
      var w = el('td', 'n14', when(row.atMs)); if (row.late) w.appendChild(el('span', 'tag warn', 'متأخر')); tr.appendChild(w);
      var down = row.files.filter(function (f) { return have[f.id]; }).length, sz = row.files.reduce(function (a, f) { return a + (f.size || 0); }, 0), what = [];
      if (row.text) what.push('نص · ' + words(row.text) + ' كلمة');
      if ((row.links || []).length) what.push(pl(row.links.length, 'رابط', 'روابط'));
      if (row.files.length) what.push(pl(row.files.length, 'ملف', 'ملفات') + ' · ' + size(sz) + (down === row.files.length ? ' · على الجهاز' : down ? ' · ' + down + ' على الجهاز' : ''));
      tr.appendChild(el('td', 'n14', what.join(' · ')));
      var sending = Q.jobs.some(function (x) { return x.t === 'send' && x.k === mKey(R.key, it.id, row.s); });
      var s = el('td'), k = sending ? ['يُرسل', 'warn'] : m && m.state === 'ready' ? ['جاهز للإرسال', 'warn'] : m && m.state === 'draft' ? ['مسودة', ''] : m && m.state === 'sent' || sent ? ['أُرسل', 'ok'] : null;
      if (k) s.appendChild(el('span', 'tag ' + k[1], k[0])); if (m && m.err) s.appendChild(el('span', 'tag bad', 'لم يُرسل'));
      if (m && m.audio || sent && sent.audio) s.appendChild(el('span', 'tag', 'صوت'));
      if (m && m.hl && m.hl.length || sent && sent.hl) s.appendChild(el('span', 'tag', 'تظليل'));
      tr.appendChild(s);
      var g = (d.grades[it.id] || {})[row.sids[0]], gtd = el('td', 'num'); gtd.appendChild(scoreEl(g, it.max)); tr.appendChild(gtd);
      tr.onclick = function () { openViewer(R.key, it.id, all, i); };
      t.appendChild(tr);
    });
  });
  app.appendChild(el('p', 'n12', 'اضغط الطالب لفتح تسليمه. اكتب بقلم Apple، ويحرّك الإصبع الصفحة. ما تكتبه يبقى على الجهاز حتى ترسله؛ ويراه الطالب بعد نشر درجات التكليف.'));
}
function words(html) { var d = document.createElement('div'); d.innerHTML = html; return (d.textContent || '').trim().split(/\s+/).filter(Boolean).length; }
function busy(p, text) {
  if (text) say(text);
  return p.catch(function (e) { fail('محطة التصحيح', e); throw e; });
}
function downloadAll(key, code) {
  if (!navigator.onLine) return say('لا إنترنت الآن');
  var st = stOf(S.data[key], code);
  (st.at ? Promise.resolve() : stList(key, code)).then(function () { stQueueAll(key, code); say('بدأ التنزيل في الخلفية. افتح أي طالب وصل ملفه.'); })
    .catch(function (e) { fail('تنزيل التسليمات', e); });
}

/* ===================== pdf.js ===================== */
var PDFJS = null;
function pdfjs() {
  if (PDFJS) return PDFJS;
  PDFJS = import('./vendor/pdfjs/pdf.mjs').then(function (m) { m.GlobalWorkerOptions.workerSrc = './vendor/pdfjs/pdf.worker.mjs'; return m; });
  PDFJS.catch(function () { PDFJS = null; });
  return PDFJS;
}
function kindOf(f) {
  var n = String(f.name || '').toLowerCase(), m = String(f.mime || '');
  if (m === 'application/pdf' || /\.pdf$/.test(n)) return 'pdf';
  if (/^image\/(png|jpe?g|gif|webp|heic|heif)/.test(m) || /\.(png|jpe?g|gif|webp|heic|heif)$/.test(n)) return 'img';
  return 'other';
}
/* every page of one file → [{ w, h (points), draw(canvas, scale) }] */
function pagesOf(rec) {
  var k = kindOf(rec);
  if (k === 'pdf') return pdfjs().then(function (lib) {
    return rec.blob.arrayBuffer().then(function (buf) {
      return lib.getDocument({ data: buf, standardFontDataUrl: './vendor/pdfjs/standard_fonts/', isEvalSupported: false }).promise;
    }).then(function (doc) {
      var out = [], n = Math.min(doc.numPages, 80), chain = Promise.resolve();
      for (var i = 1; i <= n; i++) (function (i) {
        chain = chain.then(function () { return doc.getPage(i); }).then(function (pg) {
          var vp = pg.getViewport({ scale: 1 });
          out.push({ w: vp.width, h: vp.height, draw: function (cv, sc) {
            var v = pg.getViewport({ scale: sc }); cv.width = Math.round(v.width); cv.height = Math.round(v.height);
            var c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);
            return pg.render({ canvasContext: c, viewport: v }).promise;
          } });
        });
      })(i);
      return chain.then(function () { return out; });
    });
  });
  if (k === 'img') return new Promise(function (ok, no) {
    var im = new Image(), u = URL.createObjectURL(rec.blob);
    im.onload = function () {
      var w = 595, h = Math.round(595 * im.naturalHeight / im.naturalWidth);
      ok([{ w: w, h: h, draw: function (cv, sc) { cv.width = Math.round(w * sc); cv.height = Math.round(h * sc); var c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height); c.drawImage(im, 0, 0, cv.width, cv.height); return Promise.resolve(); } }]);
    };
    im.onerror = function () { URL.revokeObjectURL(u); no(new Error('تعذّر فتح الصورة ' + rec.name)); };
    im.src = u;
  });
  return Promise.resolve(null);
}

/* ===================== ink ===================== */
function inkDraw(c, strokes, W, H) {
  c.clearRect(0, 0, W, H);
  (strokes || []).forEach(function (s) { stroke(c, s, W, H, 0); });
}
function stroke(c, s, W, H, from) {
  var p = s.p, n = p.length / 3;
  if (!n) return;
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = s.c;
  if (s.t === 'hl') { c.globalAlpha = 0.32; c.globalCompositeOperation = 'multiply'; c.lineWidth = s.w * W; c.beginPath(); c.moveTo(p[0] * W, p[1] * H); for (var j = 1; j < n; j++) c.lineTo(p[j * 3] * W, p[j * 3 + 1] * H); if (n === 1) c.lineTo(p[0] * W + 0.1, p[1] * H); c.stroke(); c.restore(); return; }
  for (var i = Math.max(1, from || 1); i < n; i++) {
    var x0 = p[(i - 1) * 3] * W, y0 = p[(i - 1) * 3 + 1] * H, x1 = p[i * 3] * W, y1 = p[i * 3 + 1] * H, pr = (p[(i - 1) * 3 + 2] + p[i * 3 + 2]) / 2;
    c.lineWidth = Math.max(0.6, s.w * W * (0.35 + pr * 1.1));
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  }
  if (n === 1) { c.fillStyle = s.c; c.beginPath(); c.arc(p[0] * W, p[1] * H, s.w * W * 0.6, 0, 7); c.fill(); }
  c.restore();
}
function hits(s, x, y, r) { for (var i = 0; i < s.p.length; i += 3) { var dx = s.p[i] - x, dy = s.p[i + 1] - y; if (dx * dx + dy * dy < r * r) return true; } return false; }

/* ===================== the viewer ===================== */
var VW = null;
var PENS = [['#d92d20', 'أحمر'], ['#1d4ed8', 'أزرق'], ['#1d1e24', 'أسود'], ['#16a34a', 'أخضر']];
function openViewer(key, code, list, idx) {
  if (VW) VW.close(true);
  var d = S.data[key], it = d.items.filter(function (x) { return x.id === code; })[0], row = list[idx], mk = mKey(key, code, row.s);
  var ov = el('div', 'vw'), top = el('div', 'vbar'), tools = el('div', 'vtools'), pages = el('div', 'vpages');
  ov.appendChild(top); ov.appendChild(tools); ov.appendChild(pages); document.body.appendChild(ov); document.body.classList.add('noscroll');
  var V = VW = { key: key, code: code, row: row, m: null, tool: 'pen', color: PENS[0][0], finger: false, zoom: 1, undo: [], pages: [], closed: false };
  V.close = function (quiet) {
    V.closed = true; stopRec(); save(); if (V.offSel) V.offSel(); ov.remove(); document.body.classList.remove('noscroll'); VW = null;
    if (!quiet) draw();
  };
  /* top: back, who, previous / next, grade, send */
  top.appendChild(ico('x', 'إغلاق', function () { V.close(); }));
  var who = el('div', 'who'); who.appendChild(el('b', '', subjName(d, row))); who.appendChild(el('span', 'n12', it.code + ' · ' + it.title + ' · ' + when(row.atMs) + (row.late ? ' · متأخر' : ''))); top.appendChild(who);
  var prev = ico('back', 'السابق', function () { openViewer(key, code, list, idx - 1); }); prev.disabled = idx <= 0; top.appendChild(prev);
  var nxt = ico('back', 'التالي', function () { openViewer(key, code, list, idx + 1); }); nxt.classList.add('flip'); nxt.disabled = idx >= list.length - 1; top.appendChild(nxt);
  var gw = el('label', 'vg');      /* 0.15: «[ 8 ] \ 10» */
  var gi = el('input', 'cell'); gi.inputMode = 'decimal'; gi.value = fmt((d.grades[code] || {})[row.sids[0]]); gi.setAttribute('aria-label', 'الدرجة من ' + it.max);
  gw.appendChild(gi); gw.appendChild(el('span', 'gmax', '\\ ' + fmt(it.max))); top.appendChild(gw);
  if (it.ro || !may(d, 'grade')) { gi.readOnly = true; gi.title = 'للعرض فقط على هذا الجهاز'; }
  gi.onchange = function () {
    var v = num(gi.value), g = (d.grades[code] = d.grades[code] || {});
    if (v != null && (isNaN(v) || v < 0 || v > it.max)) { say('الدرجة بين 0 و' + it.max); gi.value = fmt(g[row.sids[0]]); return; }
    row.sids.filter(function (id) { return d.students[id]; }).forEach(function (id) {
      if (rec(key, 'g', code, id, v, g[id] == null ? null : g[id], it.code + ' · ' + (d.students[id].name) + ': ' + (v == null ? 'مسح' : v)) === false) return;
      if (v == null) delete g[id]; else g[id] = v;
    });
    change(); say('حُفظت الدرجة على الجهاز');
  };
  gi.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); gi.blur(); } };
  var sendB = btn('إرسال', '', function () { sendOne(V); }, 'export'); top.appendChild(sendB);
  V.sendB = sendB;
  /* tools */
  function tb(k, label, html, fn) { var b = el('button', 'tl'); b.type = 'button'; b.innerHTML = html; b.title = label; b.setAttribute('aria-label', label); b.onclick = fn; b.dataset.k = k; tools.appendChild(b); return b; }
  function mark() { [].forEach.call(tools.querySelectorAll('.tl'), function (b) { b.classList.toggle('on', b.dataset.k === V.tool || b.dataset.k === 'c' + V.color && V.tool !== 'eraser' || b.dataset.k === 'finger' && V.finger); }); }
  tb('pen', 'قلم', svg('pen'), function () { V.tool = 'pen'; mark(); });
  tb('hl', 'تظليل', svg('hl'), function () { V.tool = 'hl'; mark(); });
  tb('eraser', 'ممحاة', svg('eraser'), function () { V.tool = 'eraser'; mark(); });
  PENS.forEach(function (p) { var b = tb('c' + p[0], p[1], '<i style="background:' + p[0] + '"></i>', function () { V.color = p[0]; if (V.tool === 'eraser') V.tool = 'pen'; mark(); }); b.classList.add('dotb'); });
  tb('undo', 'تراجع', svg('undo'), function () { undo(); });
  tb('finger', 'الرسم بالإصبع', svg('hand'), function () { V.finger = !V.finger; mark(); say(V.finger ? 'الإصبع يرسم الآن' : 'الإصبع يحرّك الصفحة'); });
  tb('zout', 'تصغير', svg('minus'), function () { setZoom(V.zoom / 1.25); });
  tb('zin', 'تكبير', svg('plus'), function () { setZoom(V.zoom * 1.25); });
  tools.appendChild(el('span', 'sp'));
  var au = el('div', 'vau'); tools.appendChild(au); V.au = au;
  mark();
  /* the pencil writes, the finger scrolls (unless «الرسم بالإصبع») */
  pages.addEventListener('touchstart', function (e) { var t = e.touches[0]; if (e.target.classList.contains('ink') && (V.finger || (t && t.touchType === 'stylus'))) e.preventDefault(); }, { passive: false });
  pages.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (e.target.classList.contains('ink') && (V.finger || (t && t.touchType === 'stylus'))) e.preventDefault(); }, { passive: false });

  /* this student first, then the next three */
  qDown(key, code, row.files, 9);
  list.slice(idx + 1, idx + 4).forEach(function (r) { qDown(key, code, r.files, 5); });
  fGet('marks', mk).then(function (m) {
    V.m = m || { ink: {}, hl: [], note: '', audio: null, amime: '', sec: 0, state: '' };
    V.m.hl = V.m.hl || []; V.m.note = V.m.note || '';
    drawAudio(V);
    /* a written note for the whole submission */
    var nw = el('div', 'vnote'), nl = el('label', 'n12', 'ملاحظة للطالب (يراها مع الدرجة)'), nt = el('textarea');
    nt.dir = 'auto'; nt.rows = 2; nt.value = V.m.note; nt.oninput = function () { V.m.note = nt.value; dirty(V); };
    nw.appendChild(nl); nw.appendChild(nt); pages.appendChild(nw);
    if (row.text) textBlock(V, pages, row.text);
    if ((row.links || []).length) {
      var lw = el('div', 'vlinks'); lw.appendChild(el('div', 'n12', 'الروابط'));
      row.links.forEach(function (u) { var a = el('a', '', u); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer'; lw.appendChild(a); });
      pages.appendChild(lw);
    }
    var any = !!(row.text || (row.links || []).length);
    return row.files.reduce(function (p, f) {
      return p.then(function () {
        if (V.closed) return;
        var hd = el('div', 'vfile n12', '\u2068' + f.name + '\u2069 · ' + size(f.size || 0)); pages.appendChild(hd);
        var hold = el('div', 'vload n14', 'جارٍ الفتح…'); pages.appendChild(hold);
        return stFetch(key, code, f)
          .then(function (r) { return pagesOf(r).then(function (pp) { return { r: r, pp: pp }; }); })
          .then(function (x) {
            hold.remove();
            if (!x.pp) {
              var o = el('div', 'vother'); o.appendChild(el('p', 'n14', 'هذا الملف يُفتح في تطبيقه (Word أو Excel أو PowerPoint أو غيرها)، ولا يُكتب عليه هنا.'));
              o.appendChild(btn('فتح / مشاركة', 'sec', function () { share(x.r.blob, x.r.name); }, 'export')); pages.appendChild(o); return;
            }
            any = true;
            x.pp.forEach(function (pg, i) { addPage(V, pages, f.id, i, pg); });
          }).catch(function (e) { hold.textContent = 'تعذّر الفتح: ' + ((e && e.message) || e); hold.classList.add('err'); });
      });
    }, Promise.resolve()).then(function () { if (!any && !row.files.length) pages.appendChild(el('div', 'vload n14', 'لا ملفات في هذا التسليم.')); });
  });

  function setZoom(z) { V.zoom = Math.max(0.5, Math.min(3, z)); V.pages.forEach(function (P) { sizePage(V, P); }); }
  function undo() {
    var u = V.undo.pop(); if (!u) return say('لا شيء للتراجع');
    if (u.hl) { if (u.add) { var j = V.m.hl.indexOf(u.h); if (j > -1) V.m.hl.splice(j, 1); } else V.m.hl.splice(Math.min(u.at, V.m.hl.length), 0, u.h); dirty(V); if (V.paintText) V.paintText(); return; }
    var arr = pageInk(V, u.f, u.i);
    if (u.add) { var at = arr.indexOf(u.s); if (at > -1) arr.splice(at, 1); } else arr.splice(Math.min(u.at, arr.length), 0, u.s);
    dirty(V); V.pages.forEach(function (P) { if (P.f === u.f && P.i === u.i) P.redraw(); });
  }
  var t; function save() { if (V.m && V.m.changed) { V.m.changed = false; fPut('marks', mk, strip(V.m)); } }
  V.save = function () { clearTimeout(t); t = setTimeout(save, 400); };
  V.saveNow = function () { clearTimeout(t); V.m.changed = true; save(); };
}
function strip(m) { return { ink: m.ink, hl: m.hl || [], note: m.note || '', audio: m.audio, amime: m.amime, sec: m.sec, state: m.state, sentAt: m.sentAt || 0, err: m.err || '' }; }

/* ===================== the submitted text: read only, highlighted ===================== */
var HL_COLORS = [['#fde047', 'أصفر'], ['#86efac', 'أخضر'], ['#f9a8d4', 'وردي']];
function markText(root, hl, onTap) {
  function nodes() { var out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n, pos = 0; while ((n = w.nextNode())) { out.push({ n: n, a: pos, b: pos + n.data.length }); pos += n.data.length; } return out; }
  hl.map(function (h, k) { return { h: h, k: k }; }).sort(function (x, y) { return y.h.a - x.h.a; }).forEach(function (x) {
    var ns = nodes();
    for (var i = ns.length - 1; i >= 0; i--) {
      var t = ns[i], s0 = Math.max(x.h.a, t.a), e0 = Math.min(x.h.b, t.b);
      if (s0 >= e0) continue;
      var r = document.createRange(); r.setStart(t.n, s0 - t.a); r.setEnd(t.n, e0 - t.a);
      var m = document.createElement('mark'); m.style.background = x.h.c + '99'; m.dataset.k = x.k; if (x.h.n) m.className = 'has-n';
      m.onclick = function (e) { e.stopPropagation(); onTap && onTap(+this.dataset.k); };
      try { r.surroundContents(m); } catch (e) { /* crosses a tag */ }
    }
  });
}
function offsetIn(root, node, off) { var r = document.createRange(); r.setStart(root, 0); r.setEnd(node, off); return r.toString().length; }
function textBlock(V, host, html) {
  var card = el('div', 'vtextw'), tx = el('div', 'vtext'), bar = el('div', 'hlbar'), ed = el('div', 'hled');
  card.appendChild(el('div', 'n12', 'النص · ' + words(html) + ' كلمة · حدّد جملة لتظليلها، والمس الجملة المظلَّلة لتكتب ملاحظتك'));
  card.appendChild(tx); card.appendChild(ed); host.appendChild(card); document.body.appendChild(bar); bar.hidden = true;
  V.hlbar = bar;
  function paint() { tx.innerHTML = html; tx.dir = 'auto'; markText(tx, V.m.hl, open); }
  function open(k) {
    var h = V.m.hl[k]; ed.textContent = ''; if (!h) return;
    ed.appendChild(el('div', 'n12', '«' + (tx.textContent || '').slice(h.a, h.b).slice(0, 80) + ((h.b - h.a) > 80 ? '…' : '') + '»'));
    var ta = el('textarea'); ta.dir = 'auto'; ta.rows = 2; ta.placeholder = 'ملاحظتك على هذه الجملة'; ta.value = h.n || '';
    ta.oninput = function () { h.n = ta.value; dirty(V); }; ta.onblur = function () { paint(); };
    ed.appendChild(ta);
    var row = el('div', 'row'); row.style.gap = '8px';
    HL_COLORS.forEach(function (c) { var b = el('button', 'hlc'); b.type = 'button'; b.title = c[1]; b.style.background = c[0]; b.onclick = function () { h.c = c[0]; dirty(V); paint(); }; row.appendChild(b); });
    row.appendChild(el('span', 'sp'));
    row.appendChild(btn('إزالة التظليل', 'sec', function () { V.m.hl.splice(k, 1); V.undo.push({ hl: true, h: h, at: k }); dirty(V); ed.textContent = ''; paint(); }, 'del'));
    ed.appendChild(row); setTimeout(function () { ta.focus(); }, 30);
  }
  V.paintText = paint;
  paint();
  /* a selection inside the text → the colours appear above it */
  function sel() {
    var s = window.getSelection();
    if (!s || s.isCollapsed || !s.rangeCount || !tx.contains(s.anchorNode) || !tx.contains(s.focusNode)) { bar.hidden = true; return; }
    var r = s.getRangeAt(0).getBoundingClientRect();
    bar.hidden = false; bar.style.top = Math.max(8, r.top - 52) + 'px'; bar.style.left = Math.max(8, Math.min(window.innerWidth - 180, r.left + r.width / 2 - 80)) + 'px';
  }
  document.addEventListener('selectionchange', sel);
  V.offSel = function () { document.removeEventListener('selectionchange', sel); bar.remove(); };
  HL_COLORS.forEach(function (c) {
    var b = el('button', 'hlc'); b.type = 'button'; b.title = 'ظلّل ' + c[1]; b.style.background = c[0];
    b.onmousedown = function (e) { e.preventDefault(); };
    b.onclick = function () {
      var s = window.getSelection(); if (!s.rangeCount) return;
      var r = s.getRangeAt(0), a = offsetIn(tx, r.startContainer, r.startOffset), z = offsetIn(tx, r.endContainer, r.endOffset);
      if (z <= a) return;
      var h = { a: a, b: z, c: c[0], n: '' };
      V.m.hl = V.m.hl.filter(function (x) { return x.b <= a || x.a >= z; });   /* a new highlight replaces what it covers */
      V.m.hl.push(h); V.undo.push({ hl: true, add: true, h: h });
      s.removeAllRanges(); bar.hidden = true; dirty(V); paint(); open(V.m.hl.indexOf(h));
    };
    bar.appendChild(b);
  });
}
function pageInk(V, f, i) { var a = V.m.ink[f] = V.m.ink[f] || {}; return a[i] = a[i] || []; }
function dirty(V) { V.m.state = 'draft'; V.m.err = ''; V.m.changed = true; V.save(); }
function addPage(V, host, f, i, pg) {
  var box = el('div', 'vpage'), base = el('canvas', 'base'), ink = el('canvas', 'ink');
  box.appendChild(base); box.appendChild(ink); host.appendChild(box);
  var P = { f: f, i: i, pg: pg, box: box, base: base, ink: ink, rendered: 0 };
  V.pages.push(P);
  P.redraw = function () { inkDraw(ink.getContext('2d'), pageInk(V, f, i), ink.width, ink.height); };
  sizePage(V, P);
  /* drawing */
  var cur = null, dpr = window.devicePixelRatio || 1;
  function at(e) { var r = ink.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, e.pressure && e.pointerType === 'pen' ? e.pressure : 0.5]; }
  ink.addEventListener('pointerdown', function (e) {
    if (!(e.pointerType === 'pen' || e.pointerType === 'mouse' || V.finger)) return;
    e.preventDefault(); ink.setPointerCapture(e.pointerId);
    var p = at(e);
    if (V.tool === 'eraser') { cur = { erase: true }; erase(p); return; }
    cur = { t: V.tool, c: V.tool === 'hl' ? '#facc15' : V.color, w: V.tool === 'hl' ? 0.022 : 0.0028, p: p };
    pageInk(V, f, i).push(cur); V.undo.push({ add: true, f: f, i: i, s: cur });
    if (cur.t === 'pen') stroke(ink.getContext('2d'), cur, ink.width, ink.height, 1);
  });
  ink.addEventListener('pointermove', function (e) {
    if (!cur) return;
    var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    if (!evs.length) evs = [e];
    evs.forEach(function (ev) {
      var p = at(ev);
      if (cur.erase) return erase(p);
      var n = cur.p.length / 3, lx = cur.p[(n - 1) * 3], ly = cur.p[(n - 1) * 3 + 1];
      if (Math.abs(p[0] - lx) + Math.abs(p[1] - ly) < 0.0015) return;
      cur.p.push(Math.round(p[0] * 1e4) / 1e4, Math.round(p[1] * 1e4) / 1e4, Math.round(p[2] * 100) / 100);
      if (cur.t === 'pen') stroke(ink.getContext('2d'), cur, ink.width, ink.height, cur.p.length / 3 - 1);
      else P.redraw();
    });
  });
  function end() { if (!cur) return; if (!cur.erase) { if (cur.t === 'hl') P.redraw(); dirty(V); } cur = null; }
  ink.addEventListener('pointerup', end); ink.addEventListener('pointercancel', end);
  function erase(p) {
    var arr = pageInk(V, f, i), r = 0.012, gone = false;
    for (var k = arr.length - 1; k >= 0; k--) if (hits(arr[k], p[0], p[1], r)) { V.undo.push({ add: false, f: f, i: i, s: arr[k], at: k }); arr.splice(k, 1); gone = true; }
    if (gone) { P.redraw(); dirty(V); }
  }
  return P;
}
function sizePage(V, P) {
  var full = Math.min(document.documentElement.clientWidth - 32, 980), w = Math.round(full * V.zoom), h = Math.round(w * P.pg.h / P.pg.w), dpr = window.devicePixelRatio || 1;
  P.box.style.width = w + 'px'; P.box.style.height = h + 'px';
  P.ink.width = Math.round(w * dpr); P.ink.height = Math.round(h * dpr); P.redraw();
  var sc = Math.min(4, w * dpr / P.pg.w);
  if (Math.abs(sc - P.rendered) < 0.05) return;
  P.rendered = sc;
  clearTimeout(P.t); P.t = setTimeout(function () { P.pg.draw(P.base, sc).catch(function () {}); }, P.base.width ? 250 : 0);
}

/* ===================== the voice note ===================== */
function drawAudio(V) {
  var au = V.au; au.textContent = '';
  if (V.rec) {
    au.appendChild(el('span', 'recdot'));
    var tm = el('span', 'n14 ltr', '0:00'); au.appendChild(tm); V.rec.tm = tm;
    au.appendChild(btn('إيقاف', 'dz', function () { stopRec(); }, 'stop'));
    return;
  }
  if (V.m && V.m.audio) {
    var a = document.createElement('audio'); a.controls = true; a.src = URL.createObjectURL(V.m.audio); a.className = 'vaudio'; au.appendChild(a);
    au.appendChild(ico('del', 'حذف الملاحظة الصوتية', function () { if (!confirm('تُحذف الملاحظة الصوتية من الجهاز. متابعة؟')) return; V.m.audio = null; V.m.sec = 0; V.m.dropAudio = true; dirty(V); V.saveNow(); drawAudio(V); }));
  }
  au.appendChild(btn(V.m && V.m.audio ? 'إعادة التسجيل' : 'ملاحظة صوتية', 'sec', function () { startRec(V); }, 'mic'));
}
function startRec(V) {
  if (!navigator.mediaDevices || !window.MediaRecorder) return say('التسجيل غير متاح على هذا الجهاز');
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (ms) {
    var type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].filter(function (t) { return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t); })[0];
    var mr = new MediaRecorder(ms, type ? { mimeType: type, audioBitsPerSecond: 48000 } : undefined), parts = [], t0 = Date.now();
    V.rec = { mr: mr, ms: ms };
    mr.ondataavailable = function (e) { if (e.data && e.data.size) parts.push(e.data); };
    mr.onstop = function () {
      ms.getTracks().forEach(function (t) { t.stop(); });
      clearInterval(V.rec && V.rec.h);
      var mime = (mr.mimeType || type || 'audio/mp4').split(';')[0];
      V.m.audio = new Blob(parts, { type: mime }); V.m.amime = mime; V.m.sec = Math.round((Date.now() - t0) / 1000); delete V.m.dropAudio;
      V.rec = null; dirty(V); V.saveNow(); if (!V.closed) drawAudio(V);
    };
    mr.start(1000); drawAudio(V);
    V.rec.h = setInterval(function () { var s = Math.round((Date.now() - t0) / 1000); if (V.rec && V.rec.tm) V.rec.tm.textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); if (s >= 300) stopRec(); }, 500);
  }).catch(function () { say('لم يُسمح باستعمال الميكروفون. اسمح به من إعدادات Safari.'); });
}
function stopRec() { var V = VW; if (V && V.rec && V.rec.mr.state !== 'inactive') V.rec.mr.stop(); }

/* ===================== the annotated PDF ===================== */
/* a small PDF writer: every page is one JPEG (the page with its ink), at the page's own size in points */
function pdfOf(pages) {
  var enc = new TextEncoder(), parts = [], off = 0, xref = [];
  function put(x) { var b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); off += b.length; }
  function obj(n, body, stream) {
    xref[n] = off; put(n + ' 0 obj\n' + body);
    if (stream) { put('\nstream\n'); put(stream); put('\nendstream'); }
    put('\nendobj\n');
  }
  put('%PDF-1.4\n');
  var n = pages.length, kids = [];
  for (var i = 0; i < n; i++) kids.push((3 + i * 3) + ' 0 R');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Count ' + n + ' /Kids [' + kids.join(' ') + '] >>');
  pages.forEach(function (p, i) {
    var o = 3 + i * 3, W = p.w.toFixed(2), H = p.h.toFixed(2), cs = enc.encode('q ' + W + ' 0 0 ' + H + ' 0 0 cm /Im0 Do Q');
    obj(o, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /XObject << /Im0 ' + (o + 2) + ' 0 R >> >> /Contents ' + (o + 1) + ' 0 R >>');
    obj(o + 1, '<< /Length ' + cs.length + ' >>', cs);
    obj(o + 2, '<< /Type /XObject /Subtype /Image /Width ' + p.pw + ' /Height ' + p.ph + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.jpg.length + ' >>', p.jpg);
  });
  var x0 = off, total = 3 + n * 3;
  var t = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
  for (var k = 1; k < total; k++) t += String(xref[k]).padStart(10, '0') + ' 00000 n \n';
  put(t + 'trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + x0 + '\n%%EOF\n');
  return new Blob(parts, { type: 'application/pdf' });
}
function jpegOf(cv, q) { return new Promise(function (ok, no) { cv.toBlob(function (b) { if (!b) return no(new Error('تعذّر تجهيز الصفحة')); b.arrayBuffer().then(function (x) { ok(new Uint8Array(x)); }); }, 'image/jpeg', q || 0.62); }); }
/* the submission's pages with the teacher's ink; null if nothing was written */
function annotated(key, code, row, m) {
  var anyInk = Object.keys(m.ink || {}).some(function (f) { return Object.keys(m.ink[f]).some(function (i) { return m.ink[f][i].length; }); });
  if (!anyInk) return Promise.resolve(null);
  var out = [];
  return row.files.reduce(function (p, f) {
    return p.then(function () { return fGet('files', f.id); }).then(function (r) {
      if (!r) throw new Error('الملف ' + f.name + ' ليس على الجهاز. نزّله أولًا');
      return pagesOf(r);
    }).then(function (pp) {
      return (pp || []).reduce(function (q, pg, i) {
        return q.then(function () {
          /* 0.14: a page with ink stays sharp (1400 px); a page without ink is lighter (1000 px); every page under ~400 KB */
          var strokes = ((m.ink || {})[f.id] || {})[i] || [], inked = strokes.length > 0;
          var cv = document.createElement('canvas'), sc = Math.min(2, (inked ? 1400 : 1000) / Math.max(pg.w, pg.h));
          return pg.draw(cv, sc).then(function () {
            var ic = document.createElement('canvas'); ic.width = cv.width; ic.height = cv.height;
            inkDraw(ic.getContext('2d'), strokes, ic.width, ic.height); cv.getContext('2d').drawImage(ic, 0, 0);
            return jpegOf(cv, inked ? 0.62 : 0.5).then(function (jpg) { return jpg.length > 400000 ? jpegOf(cv, 0.42) : jpg; }).then(function (jpg) { out.push({ w: pg.w, h: pg.h, pw: cv.width, ph: cv.height, jpg: jpg }); cv.width = cv.height = ic.width = ic.height = 0; });
          });
        });
      }, Promise.resolve());
    });
  }, Promise.resolve()).then(function () { return out.length ? pdfOf(out) : null; });
}

/* ===================== sending ===================== */
function sendFeedback(key, code, row, m) {
  var pdfSent = false;
  return annotated(key, code, row, m).then(function (pdf) {
    pdfSent = !!pdf;
    if (!pdf && !m.audio && !m.dropAudio && !(m.hl || []).length && !(m.note || '').trim() && !m.sentAt) throw new Error('لا شيء للإرسال: لم تكتب ولم تظلّل ولم تسجّل ملاحظة');
    return Promise.all([pdf ? pdf.arrayBuffer() : null, m.audio ? m.audio.arrayBuffer() : null]).then(function (b) {
      var body = { c: key, i: code, s: row.s };
      if (b[0]) body.pdf = b64of(b[0]);
      if (b[1]) { body.audio = b64of(b[1]); body.amime = m.amime || m.audio.type; body.sec = m.sec || 0; }
      if (!b[1] && m.dropAudio) body.drop = ['audio'];
      body.hl = m.hl || []; body.note = m.note || '';
      return api(S.link, 'fb', body);
    });
  }).then(function () {
    m.state = 'sent'; m.sentAt = Date.now(); m.err = ''; delete m.dropAudio;
    var st = stOf(S.data[key], code), was = st.sent[row.s] || {};
    st.sent[row.s] = { pdf: !!(was.pdf || pdfSent), audio: !!m.audio, sec: m.sec || 0, hl: (m.hl || []).length, note: !!(m.note || '').trim() };
    persist();
    return fPut('marks', mKey(key, code, row.s), strip(m));
  });
}
function sendOne(V) {
  if (V.rec) return say('أوقف التسجيل أولًا');
  V.m.state = 'ready'; V.m.err = ''; V.saveNow();
  var k = mKey(V.key, V.code, V.row.s);
  setTimeout(function () { qSend(k); }, 450);       /* after the save above */
  say(navigator.onLine ? 'يُرسل في الخلفية. تابع مع الطالب التالي.' : 'لا إنترنت: يُرسل حين يعود الاتصال.');
}
/* at every sync: whatever is marked «ready» */
function sendReady() {     /* at every sync: whatever is marked «ready» joins the queue → how many */
  if (!S.link || S.demo) return Promise.resolve(0);
  return fAll('marks').then(function (all) {
    var todo = all.filter(function (x) { return x.v.state === 'ready'; });
    todo.forEach(function (x) { qSend(x.k); });
    return todo.length;
  });
}

/* ===================== storage on the iPad ===================== */
function openStorage() {
  sheet('التخزين على الجهاز', function (b, h) {
    var p = el('p', 'n14', 'يُحسب…'); b.appendChild(p);
    var list = el('div'); b.appendChild(list);
    function load() {
      Promise.all([fAll('files'), fAll('marks'), navigator.storage && navigator.storage.estimate ? navigator.storage.estimate() : Promise.resolve(null)]).then(function (r) {
        var files = r[0], marks = r[1], est = r[2], by = {};
        files.forEach(function (x) { var k = x.v.course + '|' + x.v.code; (by[k] = by[k] || { f: 0, n: 0, m: 0, a: 0, ready: 0 }); by[k].f += x.v.size || 0; by[k].n++; });
        marks.forEach(function (x) { var q = x.k.split('|'), k = q[0] + '|' + q[1]; (by[k] = by[k] || { f: 0, n: 0, m: 0, a: 0, ready: 0 }); by[k].m++; by[k].a += x.v.audio ? x.v.audio.size : 0; if (x.v.state === 'ready' || x.v.state === 'draft') by[k].ready++; });
        p.textContent = est ? 'المستعمل ' + size(est.usage || 0) + (est.quota ? ' من ' + size(est.quota) + ' متاحة للتطبيق' : '') : '';
        list.textContent = '';
        if (!Object.keys(by).length) list.appendChild(el('p', 'n14', 'لا ملفات تسليمات على الجهاز.'));
        Object.keys(by).sort().forEach(function (k) {
          var q = k.split('|'), c = courseOf(q[0]), x = by[k], row = el('div', 'ch');
          var t = el('div', 'sp'); t.appendChild(el('b', '', c.code + ' · ' + q[1]));
          t.appendChild(el('div', 'n12', pl(x.n, 'ملف', 'ملفات') + ' · ' + size(x.f) + (x.m ? ' · ' + pl(x.m, 'تصحيح', 'تصحيحات') + (x.a ? ' · صوت ' + size(x.a) : '') : '') + (x.ready ? ' · ' + x.ready + ' لم يُرسل' : '')));
          row.appendChild(t);
          row.appendChild(btn('حذف الملفات', 'sec', function () {
            if (!confirm('تُحذف ملفات التسليمات المنزَّلة لهذا التكليف (تُنزَّل من جديد عند الحاجة). كتابتك عليها تبقى. متابعة؟')) return;
            Promise.all(files.filter(function (f) { return f.v.course + '|' + f.v.code === k; }).map(function (f) { return fDel('files', f.k); })).then(load);
          }, 'del'));
          if (x.m) row.appendChild(btn('حذف المُرسَل', 'sec', function () {
            if (!confirm('تُحذف من الجهاز التصحيحات التي أُرسلت لهذا التكليف (تبقى عند الطلاب). متابعة؟')) return;
            Promise.all(marks.filter(function (m) { return m.k.indexOf(k + '|') === 0 && m.v.state === 'sent'; }).map(function (m) { return fDel('marks', m.k); })).then(load);
          }, 'del'));
          list.appendChild(row);
        });
      }).catch(function (e) { p.textContent = 'تعذّر الحساب: ' + e.message; });
    }
    load();
  });
}
