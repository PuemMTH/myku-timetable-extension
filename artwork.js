(() => {
  const { days, bounds, layoutDay, formatTime, colorFor, fitText } = globalThis.MyKUTimetable;
  const ns = 'http://www.w3.org/2000/svg';
  const font = '"Noto Sans Thai", Tahoma, sans-serif';

  function element(parent, tag, attrs = {}, text) {
    const el = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    if (text !== undefined) el.textContent = text;
    parent?.append(el);
    return el;
  }

  function interactive(el, label, activate) {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', label);
    el.addEventListener('click', activate);
    el.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });
  }

  function create({ courses, semester, unread, onCourse, onDay }) {
    const svg = element(null, 'svg', { id: 'mkt-artwork', xmlns: ns, width: 1600, height: 800, viewBox: '0 0 1600 800', role: 'group', 'aria-label': 'ตารางเรียนรายสัปดาห์ สัดส่วน 16 ต่อ 8', 'font-family': font });
    const defs = element(svg, 'defs');
    const gradient = element(defs, 'linearGradient', { id: 'mkt-paper', x2: '1', y2: '1' });
    element(gradient, 'stop', { 'stop-color': '#fff8ee' });
    element(gradient, 'stop', { offset: '1', 'stop-color': '#fcf2fa' });
    const dots = element(defs, 'pattern', { id: 'mkt-dots', width: 22, height: 22, patternUnits: 'userSpaceOnUse' });
    element(dots, 'circle', { cx: 2, cy: 2, r: 1, fill: '#decad8', opacity: .32 });
    element(svg, 'rect', { width: 1600, height: 800, fill: '#fff8f4' });
    element(svg, 'rect', { width: 1600, height: 800, rx: 28, fill: 'url(#mkt-paper)' });
    element(svg, 'rect', { x: 12, y: 12, width: 1576, height: 776, rx: 22, fill: 'url(#mkt-dots)', stroke: '#ebdbe6' });

    const text = (parent, x, y, value, size = 12, attrs = {}) => element(parent, 'text', { x, y, 'font-size': size, fill: '#65526f', ...attrs }, value);
    const star = (x, y, size, fill) => element(svg, 'path', { d: 'M0,-10 Q2,-2 10,0 Q2,2 0,10 Q-2,2 -10,0 Q-2,-2 0,-10Z', transform: `translate(${x} ${y}) scale(${size / 10})`, fill });
    star(42, 52, 12, '#d5b9df');
    star(491, 66, 9, '#e9c57c');
    star(1517, 55, 10, '#d5b9df');
    star(1561, 107, 7, '#e9c57c');
    text(svg, 65, 48, 'MY LITTLE WEEK', 11, { 'letter-spacing': 3, fill: '#a282a8', 'font-weight': 700 });
    text(svg, 62, 91, 'ตารางเรียนของฉัน', 34, { 'font-weight': 700 });
    text(svg, 65, 121, `${semester || 'ตารางรายสัปดาห์'}  ·  ${courses.length} คาบเรียน`, 13, { fill: '#967e9d' });

    // Original vector bunny: no external assets are needed for display or export.
    const bunny = element(svg, 'g', { transform: 'translate(1434 79)' });
    element(bunny, 'ellipse', { cx: -18, cy: -31, rx: 11, ry: 28, transform: 'rotate(-13 -18 -31)', fill: '#fffdfa', stroke: '#d9bdcf', 'stroke-width': 2 });
    element(bunny, 'ellipse', { cx: 15, cy: -33, rx: 11, ry: 28, transform: 'rotate(13 15 -33)', fill: '#fffdfa', stroke: '#d9bdcf', 'stroke-width': 2 });
    element(bunny, 'ellipse', { cx: -18, cy: -32, rx: 4, ry: 17, fill: '#f7d5e1' });
    element(bunny, 'ellipse', { cx: 15, cy: -34, rx: 4, ry: 17, fill: '#f7d5e1' });
    element(bunny, 'ellipse', { cx: 0, cy: 8, rx: 42, ry: 32, fill: '#fffdfa', stroke: '#d9bdcf', 'stroke-width': 2 });
    for (const x of [-23, 23]) element(bunny, 'ellipse', { cx: x, cy: 16, rx: 9, ry: 5, fill: '#f6d2df' });
    for (const x of [-13, 13]) element(bunny, 'circle', { cx: x, cy: 6, r: 2.6, fill: '#79617e' });
    element(bunny, 'path', { d: 'M-4,14 Q0,10 4,14 L0,18Z', fill: '#c389a8' });
    element(bunny, 'path', { d: 'M0,18 Q-4,23 -8,19 M0,18 Q4,23 8,19', fill: 'none', stroke: '#a57b99', 'stroke-width': 1.7, 'stroke-linecap': 'round' });
    text(svg, 1295, 72, 'a lovely week', 16, { fill: '#b18dba', 'text-anchor': 'middle' });
    text(svg, 1295, 96, 'one class at a time ♡', 11, { fill: '#b299b8', 'text-anchor': 'middle' });

    const range = bounds(courses);
    const hours = (range.end - range.start) / 60;
    const left = 36, top = 150, labelWidth = 106, trackX = left + labelWidth, trackWidth = 1422;
    element(svg, 'rect', { x: left, y: top, width: 1528, height: 568, rx: 16, fill: '#fffdfd', stroke: '#eadde8' });
    element(svg, 'path', { d: `M52,150 H1548 Q1564,150 1564,166 V186 H36 V166 Q36,150 52,150Z`, fill: '#f2eaf5' });
    text(svg, 89, 173, 'วัน / เวลา', 11, { 'text-anchor': 'middle', fill: '#967d9f' });
    for (let i = 0; i <= hours; i++) {
      const x = trackX + i * trackWidth / hours;
      if (i < hours) text(svg, x + trackWidth / hours / 2, 173, formatTime(range.start + i * 60), 11, { 'text-anchor': 'middle', fill: '#967d9f', class: 'mkt-hour' });
      element(svg, 'line', { x1: x, x2: x, y1: top, y2: 718, stroke: '#f0e7ef', 'stroke-width': 1 });
    }
    const context = document.createElement('canvas').getContext('2d');
    if (!context) throw new Error('ไม่สามารถวาดตารางเรียนได้');
    let collisionDays = 0;
    days.forEach((day, index) => {
      const y = 186 + index * 76;
      const dayCourses = courses.filter(c => c.day === day.key);
      const { slots, lanes, laneHeight } = layoutDay(dayCourses);
      if (lanes > 1) collisionDays++;
      const row = element(svg, 'g', { class: 'mkt-day-row', 'data-day': day.key });
      element(row, 'rect', { x: left, y, width: 1528, height: 76, fill: index % 2 ? '#fff9fc' : '#ffffff', 'fill-opacity': .6, stroke: '#eee4ed', 'stroke-width': .6, 'pointer-events': 'none' });
      const label = element(row, 'g', { class: 'mkt-day-label' });
      element(label, 'rect', { x: 37, y: y + 1, width: 104, height: 74, fill: colorFor(`day-${day.key}`), opacity: .62 });
      element(label, 'circle', { cx: 58, cy: y + 31, r: 3.5, fill: day.color, opacity: .8 });
      text(label, 94, y + 32, day.name, day.key === 'thu' ? 13 : 14, { 'text-anchor': 'middle', 'font-weight': 600 });
      text(label, 89, y + 51, day.short + (lanes > 1 ? ` · ${dayCourses.length} คาบ` : ''), 9, { 'text-anchor': 'middle', fill: '#a68baa', 'letter-spacing': .7 });
      if (dayCourses.length) interactive(label, `${day.name} ${dayCourses.length} คาบ ดูรายการทั้งหมด`, () => onDay(day, dayCourses));

      for (const course of slots) {
        const span = (course.end - course.start) / (range.end - range.start) * trackWidth;
        const inset = Math.min(4, span / 4);
        const x = trackX + (course.start - range.start) / (range.end - range.start) * trackWidth + inset;
        const width = span - inset * 2;
        const cy = y + 6 + course.lane * laneHeight;
        const height = laneHeight - Math.min(4, laneHeight / 5);
        const time = `${formatTime(course.start)}–${formatTime(course.end)}`;
        const card = element(row, 'g', { class: `mkt-course${lanes > 1 ? ' mkt-compact' : ''}`, 'data-code': course.code });
        const full = [course.code, course.name, course.english, `${day.name} ${time}`, `หมู่ ${course.section}`, `ห้อง ${course.room || 'ไม่ระบุ'}`, `ผู้สอน ${course.teacher || 'ไม่ระบุ'}`].join('\n');
        element(card, 'title', {}, full);
        interactive(card, full.replaceAll('\n', ' '), () => onCourse(course));
        element(card, 'rect', { x, y: cy, width, height, rx: Math.min(9, height / 3), fill: colorFor(course.code), stroke: '#fff', 'stroke-width': 1.6 });
        const clippedText = (value, ty, size, weight = 400, available = width - 18) => {
          context.font = `${weight} ${size}px ${font}`;
          text(card, x + 9, ty, fitText(value, Math.max(0, available), value => context.measureText(value).width), size, { 'font-weight': weight, 'pointer-events': 'none' });
        };
        if (lanes === 1) {
          clippedText(course.code, cy + 14, 9, 600);
          clippedText(course.english || course.name, cy + 32, 13, 700);
          clippedText(`${time} · ${course.room || 'ไม่ระบุห้อง'}`, cy + 49, 10);
        } else if (lanes === 2) {
          clippedText(course.english || course.name, cy + 12, 12, 600);
          const details = `${course.code} · ห้อง ${course.room || 'ไม่ระบุ'} · ${time}`;
          context.font = `400 9px ${font}`;
          const size = 9 * Math.min(1, Math.max(0, width - 18) / context.measureText(details).width);
          text(card, x + 9, cy + 24, details, size, { class: 'mkt-course-details', 'pointer-events': 'none' });
        } else {
          const size = Math.max(1, Math.min(11, height / 1.8));
          const details = `${course.code} · ห้อง ${course.room || 'ไม่ระบุ'}`;
          const detailSize = Math.min(9, size);
          context.font = `600 ${detailSize}px ${font}`;
          const detailWidth = context.measureText(details).width;
          const scale = Math.min(1, Math.max(0, width - 18) / detailWidth);
          const baseline = cy + height / 2 + size * .35;
          clippedText(course.english || course.name, baseline, size, 600, width - 28 - detailWidth * scale);
          text(card, x + width - 9, baseline, details, detailSize * scale, { class: 'mkt-course-details', 'text-anchor': 'end', 'font-weight': 600, 'pointer-events': 'none' });
        }
      }
    });
    text(svg, 45, 751, '♡  make time for learning, and a little time for yourself', 12, { fill: '#af8fb0' });
    const note = unread ? `มี ${unread} รายการที่ไม่ระบุเวลา · ตรวจสอบในแท็บเดิม` : collisionDays ? `มีวิชาเวลาซ้อนกัน ${collisionDays} วัน · แสดงแยกช่องในแถวเดียวกัน` : 'a little plan for a lovely week';
    text(svg, 1553, 751, note, 11, { fill: unread ? '#a36a76' : '#ac8dae', 'text-anchor': 'end' });
    text(svg, 800, 780, 'MYKU  ·  WEEKLY PLANNER', 8, { fill: '#bea7c1', 'text-anchor': 'middle', 'letter-spacing': 2.5 });
    return svg;
  }

  async function toPNG(svg) {
    await document.fonts.ready;
    const data = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 3200;
      canvas.height = 1600;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('ไม่สามารถสร้างภาพได้');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('ไม่สามารถสร้างไฟล์ PNG ได้');
      return blob;
    } finally { URL.revokeObjectURL(url); }
  }

  async function download(svg, filename) {
    const blob = await toPNG(svg);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    try { link.click(); } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  }

  globalThis.MyKUTimetableArtwork = { create, toPNG, download };
})();
