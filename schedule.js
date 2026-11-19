/* Shared by the content script and the dependency-free Node tests. */
(() => {
  const days = [
    { key: 'sun', name: 'อาทิตย์', short: 'SUN', color: '#e75c68' },
    { key: 'mon', name: 'จันทร์', short: 'MON', color: '#e7b83d' },
    { key: 'tue', name: 'อังคาร', short: 'TUE', color: '#dd79b0' },
    { key: 'wed', name: 'พุธ', short: 'WED', color: '#50ad87' },
    { key: 'thu', name: 'พฤหัสบดี', short: 'THU', color: '#e69952' },
    { key: 'fri', name: 'ศุกร์', short: 'FRI', color: '#7896de' },
    { key: 'sat', name: 'เสาร์', short: 'SAT', color: '#a886cc' }
  ];
  const colors = ['#eadcf7', '#d9eaf9', '#f7dbe5', '#dcefe5', '#fbe4d1', '#faf0c9', '#dcebf0'];

  function timeRange(text) {
    const match = String(text).match(/(\d{1,2})[:.](\d{2})\s*[-–—]\s*(\d{1,2})[:.](\d{2})/);
    if (!match) return null;
    const [, h1, m1, h2, m2] = match.map(Number);
    if (h1 > 23 || h2 > 24 || m1 > 59 || m2 > 59 || (h2 === 24 && m2 !== 0)) return null;
    const start = h1 * 60 + m1;
    const end = h2 * 60 + m2;
    return end > start ? { start, end } : null;
  }

  function formatTime(minutes) {
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }

  function layoutDay(courses) {
    const ends = [];
    const slots = [...courses].sort((a, b) => a.start - b.start || a.end - b.end).map(course => {
      let lane = ends.findIndex(end => end <= course.start);
      if (lane < 0) lane = ends.length;
      ends[lane] = course.end;
      return { ...course, lane };
    });
    const lanes = Math.max(1, ends.length);
    return { slots, lanes, laneHeight: 64 / lanes };
  }

  function bounds(courses) {
    return {
      start: Math.floor(Math.min(7 * 60, ...courses.map(c => c.start)) / 60) * 60,
      end: Math.ceil(Math.max(21 * 60, ...courses.map(c => c.end)) / 60) * 60
    };
  }

  function colorFor(code) {
    let hash = 0;
    for (const char of code) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return colors[hash % colors.length];
  }

  function fitText(text, width, measure) {
    text = String(text);
    if (measure(text) <= width) return text;
    const chars = [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(text)].map(part => part.segment);
    while (chars.length && measure(chars.join('') + '…') > width) chars.pop();
    return chars.length ? chars.join('') + '…' : '';
  }

  const api = { days, timeRange, formatTime, layoutDay, bounds, colorFor, fitText };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.MyKUTimetable = api;
})();
