/* EduSpace offline — prototype 0.2: the approved style (handoff/brand_rules.md); 0.1: demo data, simulated sync.
 * Everything is kept on the device (IndexedDB); every change is written to an outbox that the sync sends later.
 * Views: home (courses) · course: students | grades | submissions · sheets: sync, export, bulk, backup. */
'use strict';
var VERSION = '0.2';
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
  save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>'
};
function svg(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICON[k] || '') + '</svg>'; }
function el(tag, cls, txt) { var x = document.createElement(tag); if (cls) x.className = cls; if (txt != null) x.textContent = txt; return x; }
function btn(text, cls, fn, icon) { var b = el('button', 'btn' + (cls ? ' ' + cls : '')); b.type = 'button'; b.innerHTML = icon ? svg(icon) : ''; b.appendChild(document.createTextNode(text)); b.onclick = fn; return b; }
function ico(k, label, fn) { var b = el('button', 'ico'); b.type = 'button'; b.innerHTML = svg(k); b.setAttribute('aria-label', label); b.title = label; b.onclick = fn; return b; }
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
    var r = indexedDB.open('eduspace', 1);
    r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
    r.onsuccess = function () { DB = r.result; ok(DB); }; r.onerror = function () { no(r.error); };
  });
}
function kvGet(k) { return idb().then(function (d) { return new Promise(function (ok, no) { var q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = function () { ok(q.result); }; q.onerror = function () { no(q.error); }; }); }); }
function kvPut(k, v) { return idb().then(function (d) { return new Promise(function (ok, no) { var t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = ok; t.onerror = function () { no(t.error); }; }); }); }
function persist() { clearTimeout(persist.h); persist.h = setTimeout(function () { kvPut('state', S); }, 250); }
function change(course, text) { S.outbox.push({ at: Date.now(), course: course, text: text }); persist(); syncChip(); }

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
    return { meta: { key: key, code: code, name: name, sem: 'الفصل الأول 2026-2027', color: '#2563eb' }, data: d };
  }
  var c1 = course('EARC2214|26271', 'EARC 2214', 'نظرية عمارة (1)', ['101', '201'], 14, [
    { id: 'T1', code: 'T1', title: 'تحليل موقع', max: 10, source: 'eduspace', published: true, filled: 100 },
    { id: 'T2', code: 'T2', title: 'دراسة حالة', max: 10, source: 'eduspace', published: false, filled: 85 },
    { id: 'M1', code: 'M1', title: 'المشروع: المرحلة الأولى', max: 20, source: 'moodle', published: false, filled: 40 },
    { id: 'MID', code: 'MID', title: 'الامتحان النصفي', max: 30, source: 'manual', published: false, filled: false }]);
  var c2 = course('LARC2002|26271', 'LARC 2002', 'مبادئ التصميم المعماري والبيئي', ['101', '202'], 11, [
    { id: 'P1', code: 'P1', title: 'لوحة الفكرة', max: 15, source: 'eduspace', published: false, filled: 60 },
    { id: 'M1', code: 'M1', title: 'تمرين الواجهات', max: 10, source: 'moodle', published: false, filled: false }]);
  c2.meta.color = '#16a34a';
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
function openSync() {
  sheet('المزامنة', function (b) {
    b.appendChild(el('p', 'n14', navigator.onLine ? 'متصل بالإنترنت.' : 'لا إنترنت الآن. تعمل كالمعتاد، وكل التغييرات محفوظة على الجهاز إلى أن تتصل.'));
    b.appendChild(el('p', 'n14', 'آخر مزامنة: ' + when(S.lastSync)));
    if (S.demo) b.appendChild(el('p', 'banner', 'نسخة تجريبية: المزامنة هنا محاكاة، ولا اتصال بـ EduSpace بعد.'));
    b.appendChild(el('p', 'lab', S.outbox.length ? 'بانتظار الإرسال (' + S.outbox.length + ')' : 'لا تغييرات بانتظار الإرسال'));
    S.outbox.slice(-40).reverse().forEach(function (c) {
      var r = el('div', 'ch'); r.appendChild(el('span', 'tag', courseOf(c.course).code)); r.appendChild(el('span', 'sp', c.text)); r.appendChild(el('span', 'n12', new Date(c.at).toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' }))); b.appendChild(r);
    });
  }, [['مزامنة الآن', '', function (h) {
    if (!navigator.onLine) { say('لا إنترنت الآن. التغييرات محفوظة وستُرسل عند الاتصال.'); return; }
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
    b.appendChild(btn('حفظ نسخة احتياطية', 'sec', function () {
      share(new Blob([JSON.stringify(S)], { type: 'application/json' }), 'EduSpace-نسخة-' + new Date().toISOString().slice(0, 10) + '.json');
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
  }, [['إعادة البيانات التجريبية', 'sec', function (h) { if (!confirm('تُمحى التغييرات وتعود البيانات التجريبية الأولى. متابعة؟')) return; S = demo(); persist(); h.close(); go('home'); }]]);
}

/* ===================== home ===================== */
function courseOf(key) { return S.courses.filter(function (c) { return c.key === key; })[0] || { code: '?' }; }
var TINTS = ['c-lav', 'c-rose', 'c-sky', 'c-sage'];
function brand() { var b = el('span', 'brand'); b.innerHTML = 'EduSpace<sup>™</sup>'; return b; }
function topBar(backFn) {
  var t = el('div', 'bar');
  var first = backFn ? ico('back', 'رجوع', backFn) : ico('more', 'البيانات والنسخ الاحتياطي', openMenu);
  if (!backFn) first.className = 'ico dk';
  t.appendChild(first);
  var mid = el('div', 'mid'); mid.appendChild(brand()); t.appendChild(mid);
  var c = el('button', 'sync'); c.id = 'sync'; c.type = 'button'; c.onclick = openSync; t.appendChild(c);
  if (backFn) t.appendChild(ico('more', 'البيانات والنسخ الاحتياطي', openMenu));
  return t;
}
function title(app, main, sub) { var h = el('h1', '', main); if (sub) h.appendChild(el('span', '', sub)); app.appendChild(h); }
/* progress: three layered rounded rectangles — hatched track, submitted, graded */
function prog(total, sub, graded, small) {
  var p = el('div', 'prog' + (small ? ' sm' : '')), pc = function (n) { return total ? Math.max(n ? 4 : 0, Math.round(n / total * 100)) : 0; };
  var a = el('i', 's'); a.style.width = pc(sub) + '%'; p.appendChild(a);
  var b = el('i', 'g'); b.style.width = pc(graded) + '%'; p.appendChild(b);
  p.setAttribute('role', 'img'); p.setAttribute('aria-label', 'سلّم ' + sub + ' وصُحّح ' + graded + ' من ' + total);
  return p;
}
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
function legend(cls) {
  var l = el('div', 'legend');
  [['var(--hatch)', 'لم يصل'], ['', 'سلّم'], ['', 'صُحّح']].forEach(function (x, i) {
    var s = el('span', '', x[1]); s.style.setProperty('--c', i === 0 ? '#ebecf1' : i === 1 ? 'var(--rose2)' : 'var(--slate)'); l.appendChild(s);
  });
  return l;
}
function drawHome(app) {
  app.appendChild(topBar());
  var h = new Date().getHours();
  title(app, h < 12 ? 'صباح الخير' : 'مساء الخير', 'لديك ' + pl(S.courses.length, 'مساق', 'مساقات') + ' على هذا الجهاز');
  var g = el('div', 'grid');
  S.courses.forEach(function (c, i) {
    var d = S.data[c.key], it = currentItem(d), x = it ? itemStats(d, it) : { total: Object.keys(d.students).length, sub: 0, graded: 0 };
    var pend = S.outbox.filter(function (o) { return o.course === c.key; }).length;
    var k = el('div', 'cc ' + TINTS[i % TINTS.length]); k.tabIndex = 0; k.setAttribute('role', 'button');
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
  var lg = legend(); lg.style.marginTop = '12px'; app.appendChild(lg);
}

/* ===================== course ===================== */
function drawCourse(app) {
  var c = courseOf(R.key), d = S.data[R.key];
  app.appendChild(topBar(function () { go('home'); }));
  title(app, c.code, c.name);
  var tabs = el('div', 'pills');
  [['students', 'الطلاب', 'users'], ['grades', 'الدرجات', 'grades'], ['subs', 'التسليمات', 'inbox']].forEach(function (t) {
    var b = el('button', 'pill' + (R.tab === t[0] ? ' on' : '')); b.type = 'button'; b.innerHTML = svg(t[2]); b.appendChild(document.createTextNode(t[1]));
    b.onclick = function () { go('course', R.key, t[0]); }; tabs.appendChild(b);
  });
  app.appendChild(tabs);
  if (R.tab === 'grades') drawGrades(app, d);
  else if (R.tab === 'subs') {
    var p = el('div', 'ph');
    p.appendChild(el('p', '', 'محطة التصحيح: المرحلة الثالثة.'));
    p.appendChild(el('p', 'n14', 'هنا تصل تسليمات EduSpace مصنّفة، ويُفتح ملف zip من Moodle على الجهاز، وتصحّح بقلم Apple طالبًا طالبًا.'));
    app.appendChild(p);
  } else drawStudents(app, d);
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
  var sel = el('select', 'inp'); sel.style.cssText = 'background:#fff;box-shadow:inset 0 0 0 1px var(--line)';
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
  ['الرقم الجامعي', 'اسم الطالب', 'الشعبة', 'المعدل', 'الهاتف'].forEach(function (h) { head.appendChild(el('th', '', h)); });
  var th = el('thead'); th.appendChild(head); t.appendChild(th);
  var tb = el('tbody');
  if (!list.length) { var e = el('tr'), td = el('td', 'empty', 'لا نتائج.'); td.colSpan = 6; e.appendChild(td); tb.appendChild(e); }
  var groups = {}; list.forEach(function (s) { var k = UI.group ? (d.secs[s.id] || '') : '*'; (groups[k] = groups[k] || []).push(s); });
  Object.keys(groups).sort(function (a, b) { return !a ? 1 : !b ? -1 : secCmp(a, b); }).forEach(function (k) {
    var g = groups[k];
    if (UI.group) {
      var gr = el('tr', 'grp' + (UI.shut[k] ? ' shut' : '')), gtd = el('td'); gtd.colSpan = 6;
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
      tr.appendChild(el('td', '', s.gpa == null ? '' : fmt(s.gpa))); tr.appendChild(el('td', 'ltr', s.phone || ''));
      tb.appendChild(tr);
    });
  });
  t.appendChild(tb); tw.appendChild(t); app.appendChild(tw);
  bulkBar(app, d);
}
function bulkBar(app, d) {
  var ids = selIds(d); if (!ids.length) return;
  var b = el('div', 'bulk'); b.appendChild(el('b', '', 'محدد ' + pl(ids.length, 'طالب', 'طالبًا')));
  b.appendChild(btn('الشعبة', '', function () { bulkSection(d, ids); }, 'list'));
  b.appendChild(btn('درجة موحّدة', '', function () { bulkGrade(d, ids, ''); }, 'grades'));
  b.appendChild(btn('صفر', '', function () { bulkGrade(d, ids, '0'); }));
  b.appendChild(btn('تصدير', '', function () { openExport(d, ids); }, 'export'));
  b.appendChild(btn('حذف', 'dz', function () {
    if (!confirm('حذف ' + pl(ids.length, 'طالب', 'طالبًا') + ' من هذا المساق؟')) return;
    ids.forEach(function (id) { delete d.students[id]; delete d.secs[id]; }); UI.sel = {};
    change(R.key, 'حذف ' + pl(ids.length, 'طالب', 'طالبًا')); draw();
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
    var v = $('#bs').value.trim(); ids.forEach(function (id) { if (v) d.secs[id] = v; else delete d.secs[id]; });
    change(R.key, (v ? 'الشعبة ' + v + ' لـ ' : 'إخراج من الشعب: ') + pl(ids.length, 'طالب', 'طالبًا')); h.close(); draw();
  }]]);
}
function bulkGrade(d, ids, preset) {
  sheet((preset === '0' ? 'صفر لـ ' : 'درجة موحّدة لـ ') + pl(ids.length, 'طالب', 'طالبًا'), function (b) {
    var f = el('div', 'field'); f.appendChild(el('label', '', 'على'));
    var s = el('select'); s.id = 'bg-i'; d.items.forEach(function (it) { var o = el('option', '', it.code + ' · ' + it.title + ' (من ' + it.max + ')' + (it.source === 'moodle' ? ' · Moodle' : '')); o.value = it.id; s.appendChild(o); });
    f.appendChild(s); b.appendChild(f);
    var f2 = el('div', 'field'); f2.appendChild(el('label', '', 'الدرجة (فارغة = مسح)')); var v = el('input'); v.id = 'bg-v'; v.value = preset; v.inputMode = 'decimal'; v.dir = 'ltr'; f2.appendChild(v); b.appendChild(f2);
    var o = el('label', 'opt'), k = el('input'); k.type = 'checkbox'; k.id = 'bg-k'; k.checked = true; o.appendChild(k); o.appendChild(document.createTextNode('أبقِ الدرجات المدخلة كما هي (للفارغين فقط)')); b.appendChild(o);
  }, [['تطبيق', '', function (h) {
    var it = d.items.filter(function (x) { return x.id === $('#bg-i').value; })[0], v = num($('#bg-v').value), keep = $('#bg-k').checked;
    if (v != null && (isNaN(v) || v < 0 || v > it.max)) { say('الدرجة بين 0 و' + it.max); return; }
    var g = d.grades[it.id] = d.grades[it.id] || {}, n = 0, kept = 0;
    ids.forEach(function (id) { if (keep && g[id] != null) { kept++; return; } if (v == null) delete g[id]; else g[id] = v; n++; });
    change(R.key, it.code + ': ' + (v == null ? 'مسح' : v) + ' لـ ' + pl(n, 'طالب', 'طالبًا'));
    h.close(); draw(); say('رُصد لـ ' + pl(n, 'طالب', 'طالبًا') + (kept ? '، وبقيت ' + kept + ' درجة كما هي' : ''));
  }]]);
}

/* ----- grades ----- */
function srcTag(it) { return it.source === 'moodle' ? el('span', 'tag moodle', 'Moodle') : it.source === 'manual' ? el('span', 'tag', 'يدوي') : el('span', 'tag', 'EduSpace'); }
function drawGrades(app, d) {
  toolbar(app, d, [btn('استيراد من الخارج', 'sec', function () { importInfo(); }, 'import'), btn('تصدير', '', function () { openExport(d, null); }, 'export')]);
  var list = visible(d), tw = el('div', 'tw'), t = el('table', 'gb');
  var hr = el('tr'), h0 = el('th', 'st', 'الطالب'); hr.appendChild(h0);
  var of = 0;
  d.items.forEach(function (it) {
    of += it.max;
    var th = el('th'), box = el('div', 'it'); box.appendChild(el('b', '', it.code)); box.appendChild(el('span', '', 'من ' + it.max));
    var tg = el('div', 'row'); tg.style.gap = '4px'; tg.appendChild(srcTag(it)); if (it.published) tg.appendChild(el('span', 'tag ok', 'منشور')); box.appendChild(tg);
    var xs = itemStats(d, it); box.appendChild(prog(xs.total, xs.sub, xs.graded, true));
    box.title = it.title; box.onclick = function () { itemSheet(d, it); }; th.appendChild(box); hr.appendChild(th);
  });
  hr.appendChild(el('th', '', 'المجموع من ' + of));
  var thead = el('thead'); thead.appendChild(hr); t.appendChild(thead);
  var tb = el('tbody');
  list.forEach(function (s) {
    var tr = el('tr'), n = el('td', 'st'); n.appendChild(el('div', '', s.name)); n.appendChild(el('div', 'n12 ltr', s.id + (d.secs[s.id] ? ' · ' + d.secs[s.id] : ''))); tr.appendChild(n);
    var tot = 0;
    d.items.forEach(function (it) {
      var g = (d.grades[it.id] = d.grades[it.id] || {}), td = el('td', 'g'), inp = el('input', 'cell');
      inp.value = fmt(g[s.id]); inp.inputMode = 'decimal'; inp.setAttribute('aria-label', it.code + ' ' + s.name);
      if (g[s.id] != null) tot += g[s.id];
      inp.onchange = function () {
        var v = num(inp.value);
        if (v != null && (isNaN(v) || v < 0 || v > it.max)) { say('الدرجة بين 0 و' + it.max); inp.value = fmt(g[s.id]); return; }
        if (v == null) delete g[s.id]; else g[s.id] = v;
        inp.classList.add('dirty'); change(R.key, it.code + ' · ' + s.name + ': ' + (v == null ? 'مسح' : v));
        var sum = 0; d.items.forEach(function (x) { var y = (d.grades[x.id] || {})[s.id]; if (y != null) sum += y; }); tr.lastChild.textContent = fmt(sum);
      };
      inp.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); var nx = tr.nextSibling && tr.nextSibling.children[d.items.indexOf(it) + 1]; if (nx) nx.firstChild.focus(); } };
      td.appendChild(inp); tr.appendChild(td);
    });
    tr.appendChild(el('td', 'tot', fmt(tot)));
    tb.appendChild(tr);
  });
  t.appendChild(tb); tw.appendChild(t); app.appendChild(tw);
  app.appendChild(el('p', 'n12', 'اضغط عنوان أي عمود لنشره في EduSpace أو إخفائه. «نشر» يخص صفحة الطالب في EduSpace فقط؛ ولـ Moodle استعمل «تصدير».'));
}
function itemSheet(d, it) {
  var g = d.grades[it.id] || {}, ids = Object.keys(d.students), done = ids.filter(function (id) { return g[id] != null; }).length;
  sheet(it.code + ' · ' + it.title, function (b) {
    var r = el('div', 'row'); r.appendChild(srcTag(it)); r.appendChild(el('span', 'n14', 'من ' + it.max)); b.appendChild(r);
    var xs = itemStats(d, it), big = el('div', 'big', String(xs.graded)); big.appendChild(el('small', '', ' / ' + xs.sub + ' صُحّح من ' + xs.total)); big.style.margin = '12px 0';
    b.appendChild(big); b.appendChild(prog(xs.total, xs.sub, xs.graded)); var lg = legend(); lg.style.margin = '8px 0 12px'; b.appendChild(lg);
    b.appendChild(el('p', 'n14', it.published ? 'منشور: يرى الطلاب درجاتهم فيه في EduSpace بعد المزامنة.' : 'غير منشور: لا يراه الطلاب في EduSpace.'));
    if (it.source === 'moodle') b.appendChild(el('p', 'n12', 'تكليف مستورد من Moodle. نشره هنا يُظهره للطلاب في EduSpace أيضًا، ولا يرسل شيئًا إلى Moodle.'));
  }, [[it.published ? 'إخفاء من EduSpace' : 'نشر في EduSpace', '', function (h) {
    it.published = !it.published; change(R.key, (it.published ? 'نشر ' : 'إخفاء ') + it.code); h.close(); draw();
  }, 'eye']]);
}
function importInfo() {
  sheet('استيراد من الخارج', function (b) {
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
      who.forEach(function (s) { rows.push([s.id, s.email || ''].concat(pick.map(function (it) { return fmt((d.grades[it.id] || {})[s.id]); }))); });
    } else {
      var of = pick.reduce(function (a, it) { return a + it.max; }, 0);
      rows = [['الرقم الجامعي', 'الاسم', 'الشعبة'].concat(pick.map(function (it) { return it.code + ' ' + it.title + ' (' + it.max + ')'; })).concat(['المجموع (' + of + ')', 'النسبة'])];
      who.forEach(function (s) {
        var tot = 0, r = [s.id, s.name, d.secs[s.id] || ''].concat(pick.map(function (it) { var v = (d.grades[it.id] || {})[s.id]; if (v != null) tot += v; return fmt(v); }));
        rows.push(r.concat([fmt(tot), of ? fmt(tot / of * 100) + '%' : '']));
      });
    }
    share(new Blob([csvOf(rows)], { type: 'text/csv' }), c.code.replace(/\s/g, '') + '-' + (fmtSel === 'moodle' ? 'moodle' : 'كشف') + '-' + new Date().toISOString().slice(0, 10) + '.csv');
    h.close(); say('صُدّر ' + pl(who.length, 'طالب', 'طالبًا') + ' و' + pl(pick.length, 'تكليف', 'تكليفات') + ' (على الجهاز، بلا إنترنت).');
  }, 'export']]);
}

/* ===================== draw / start ===================== */
function draw() {
  var app = $('#app'), y = window.scrollY; app.textContent = '';
  if (R.view === 'course' && S.data[R.key]) drawCourse(app); else drawHome(app);
  syncChip(); window.scrollTo(0, y);
}
addEventListener('online', syncChip); addEventListener('offline', syncChip);
addEventListener('hashchange', function () { fromHash(); draw(); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
kvGet('state').then(function (s) { S = (s && s.v >= 2) ? s : demo(); if (S !== s) persist(); fromHash(); draw(); })
  .catch(function (e) { $('#app').textContent = 'تعذّر فتح التخزين على الجهاز: ' + e.message; });
