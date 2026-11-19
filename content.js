(() => {
  if (document.getElementById('mkt-installed')) return;
  const marker = document.createElement('meta');
  marker.id = 'mkt-installed';
  document.head.append(marker);

  const { days, timeRange, formatTime } = globalThis.MyKUTimetable;
  let host;
  let weeklyTab;
  let nativeGroup;
  let signature = '';
  let showWeekly = false;
  let timer;
  let sourceCards = [];
  const hidden = new Set();

  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function labeled(card, label) {
    const span = [...card.querySelectorAll('span')].find(el => el.textContent.trim() === label);
    return span?.parentElement.textContent.replace(label, '').trim() || '';
  }

  // shortcut: these selectors follow MyKU's current course cards; update here if MyKU changes its markup.
  function readCard(card) {
    const day = days.find(day => card.querySelector(`.${day.key}`));
    if (!day || card.querySelector(`.${day.key}`).closest('.card') !== card) return null;
    const range = timeRange(card.querySelector(`.${day.key}`).textContent);
    const code = [...card.querySelectorAll('div')].find(el => !el.childElementCount && /^\d{8}(?:-\d{2})?$/.test(el.textContent.trim()))?.textContent.trim();
    const names = [...card.querySelectorAll('.cut-word')].slice(0, 2).map(el => el.textContent.trim());
    if (!range || !code || !names[0]) return null;
    return {
      day: day.key, ...range, code, name: names[0], english: names[1] || '',
      section: labeled(card, 'หมู่'), room: labeled(card, 'ห้อง'),
      teacher: labeled(card, 'อ.ผู้สอน'), type: card.querySelector('.badge')?.textContent.trim() || ''
    };
  }

  function restore() {
    for (const el of hidden) el.removeAttribute('data-mkt-hidden');
    hidden.clear();
  }

  function setView(entries, visible = showWeekly) {
    restore();
    if (host) host.hidden = !visible;
    weeklyTab?.setAttribute('aria-pressed', String(visible));
    nativeGroup?.classList.toggle('mkt-weekly-active', visible);
    if (visible) {
      for (const { card } of entries) {
        card.setAttribute('data-mkt-hidden', '');
        hidden.add(card);
      }
    }
  }

  function mountTab() {
    const original = document.querySelector('button.btn-classSchedule');
    if (!original) return false;
    if (!weeklyTab?.isConnected || weeklyTab.parentElement !== original.parentElement) {
      weeklyTab?.remove();
      nativeGroup?.classList.remove('mkt-native-tabs', 'mkt-weekly-active');
      nativeGroup = original.parentElement;
      nativeGroup.classList.add('mkt-native-tabs');
      weeklyTab = node('button', 'mkt-tab', 'ตารางรายสัปดาห์');
      weeklyTab.id = 'mkt-weekly-tab';
      weeklyTab.type = 'button';
      weeklyTab.setAttribute('aria-controls', 'mkt-timetable');
      weeklyTab.setAttribute('aria-pressed', String(showWeekly));
      weeklyTab.addEventListener('click', () => {
        if (!original.classList.contains('active')) original.click();
        showWeekly = true;
        sync();
      });
      original.after(weeklyTab);
    }
    return true;
  }

  function unmount() {
    host?.remove();
    weeklyTab?.remove();
    nativeGroup?.classList.remove('mkt-native-tabs', 'mkt-weekly-active');
    showWeekly = false;
    signature = '';
    restore();
  }

  function detailDialog(course) {
    const dialog = node('dialog', 'mkt-dialog');
    const title = node('h3', '', course.name);
    title.id = 'mkt-course-title';
    dialog.setAttribute('aria-labelledby', title.id);
    const close = node('button', 'mkt-button', 'ปิด');
    close.type = 'button';
    close.addEventListener('click', () => dialog.close());
    dialog.append(node('p', 'mkt-eyebrow', course.code), title, node('p', 'mkt-muted', course.english));
    const dl = node('dl');
    for (const [label, value] of [
      ['วัน–เวลา', `${days.find(d => d.key === course.day).name} ${formatTime(course.start)}–${formatTime(course.end)}`],
      ['หมู่เรียน', `${course.section || 'ไม่ระบุ'} ${course.type}`],
      ['ห้องเรียน', course.room || 'ไม่ระบุ'], ['ผู้สอน', course.teacher || 'ไม่ระบุ']
    ]) dl.append(node('dt', '', label), node('dd', '', value));
    dialog.append(dl, close);
    host.append(dialog);
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    dialog.showModal();
  }

  function dayDialog(day, courses) {
    const dialog = node('dialog', 'mkt-dialog');
    const title = node('h3', '', `วัน${day.name} · ${courses.length} คาบ`);
    title.id = 'mkt-day-title';
    dialog.setAttribute('aria-labelledby', title.id);
    dialog.append(title);
    for (const course of courses) {
      const button = node('button', 'mkt-choice', `${formatTime(course.start)}–${formatTime(course.end)} · ${course.name} · ${course.room || 'ไม่ระบุห้อง'}`);
      button.type = 'button';
      button.addEventListener('click', () => { dialog.close(); detailDialog(course); });
      dialog.append(button);
    }
    const close = node('button', 'mkt-button', 'ปิด');
    close.type = 'button';
    close.addEventListener('click', () => dialog.close());
    dialog.append(close);
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    host.append(dialog);
    dialog.showModal();
  }

  function render(entries, list, unread) {
    sourceCards = entries.map(e => e.card);
    if (!host?.isConnected) {
      host = node('section');
      host.id = 'mkt-timetable';
      host.setAttribute('aria-label', 'ตารางเรียนรายสัปดาห์ MyKU');
      list.before(host);
    }
    const oldScroll = host.querySelector('.mkt-scroll')?.scrollLeft || 0;
    host.replaceChildren();
    const semester = list.parentElement.querySelector('.d-sm-inline')?.textContent.match(/ภาค(?:ต้น|ปลาย|ฤดูร้อน)\s*\d{4}/)?.[0] || '';
    const artwork = globalThis.MyKUTimetableArtwork;
    const svg = artwork.create({ courses: entries.map(e => e.course), semester, unread, onCourse: detailDialog, onDay: dayDialog });
    const tools = node('div', 'mkt-tools');
    const caption = node('div');
    caption.append(node('strong', '', 'ตารางเรียนโทนพาสเทล'), node('span', 'mkt-export-size', 'PNG 3200 × 1600 · สัดส่วน 16:8'));
    const download = node('button', 'mkt-button mkt-download', '↓ ดาวน์โหลด PNG');
    download.type = 'button';
    const status = node('p', 'mkt-status', 'คลิกวิชาเพื่อดูรายละเอียด หรือกดชื่อวันเพื่อดูทุกคาบ');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    download.addEventListener('click', async () => {
      download.disabled = true;
      download.textContent = 'กำลังสร้างภาพ…';
      status.textContent = 'กำลังเตรียมไฟล์ PNG';
      try {
        await artwork.download(svg, `myku-timetable-${semester.replace(/\s+/g, '-') || 'weekly'}.png`);
        status.textContent = 'เริ่มดาวน์โหลด PNG แล้ว';
      } catch (error) {
        console.error('MyKU timetable export failed', error);
        status.textContent = 'ดาวน์โหลดไม่สำเร็จ กรุณาลองใหม่';
      } finally {
        download.disabled = false;
        download.textContent = '↓ ดาวน์โหลด PNG';
      }
    });
    tools.append(caption, download);
    const scroll = node('div', 'mkt-scroll');
    scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-label', 'ตารางวันและเวลา เลื่อนแนวนอนเพื่อดูครบทั้งภาพ');
    scroll.append(svg);
    host.append(tools, scroll, status);
    scroll.scrollLeft = oldScroll;
    setView(entries);
  }
  function sync() {
    const isDemo = document.documentElement.hasAttribute('data-myku-demo');
    const inClassroom = location.pathname.replace(/\/$/, '') === '/myku/student/std/classroom';
    if ((!isDemo && !inClassroom) || !mountTab()) {
      unmount();
      return;
    }
    const active = document.querySelector('button[class*="btn-classSchedule"].active');
    const inStudyTab = !active || active.classList.contains('btn-classSchedule');
    if (!inStudyTab) {
      setView([], false);
      signature = '';
      return;
    }
    const entries = [...document.querySelectorAll('.card')].map(card => ({ card, course: readCard(card) })).filter(e => e.course);
    if (!entries.length) {
      setView([], false);
      signature = '';
      return;
    }
    const list = entries[0].card.parentElement.parentElement;
    const unread = [...list.querySelectorAll('.card')].filter(card => !entries.some(e => e.card === card)).length;
    const semester = list.parentElement.querySelector('.d-sm-inline')?.textContent.match(/ภาค(?:ต้น|ปลาย|ฤดูร้อน)\s*\d{4}/)?.[0] || '';
    const next = JSON.stringify([semester, entries.map(e => e.course), unread]);
    if (next !== signature || !host?.isConnected || entries.some((e, i) => sourceCards[i] !== e.card)) {
      signature = next;
      render(entries, list, unread);
    } else setView(entries);
  }

  function scheduleSync() {
    clearTimeout(timer);
    timer = setTimeout(sync, 100);
  }
  const observer = new MutationObserver(records => {
    if (records.some(record => !host?.contains(record.target))) scheduleSync();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('popstate', scheduleSync);
  document.addEventListener('click', event => {
    if (event.target.closest?.('button[class*="btn-classSchedule"]')) showWeekly = false;
    scheduleSync();
  });
  sync();
})();
