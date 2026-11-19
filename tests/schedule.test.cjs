const { test } = require('node:test');
const assert = require('node:assert/strict');
const { timeRange, formatTime, layoutDay, bounds, colorFor, fitText, days } = require('../schedule.js');

test('reads MyKU time ranges and rejects invalid or overnight times', () => {
  assert.deepEqual(timeRange('TUE9:00 - 12:00'), { start: 540, end: 720 });
  assert.deepEqual(timeRange('09.30–11.45'), { start: 570, end: 705 });
  assert.deepEqual(timeRange('23:00 - 24:00'), { start: 1380, end: 1440 });
  for (const text of ['TBA', '9:60 - 12:00', '25:00 - 26:00', '12:00 - 9:00', '9:00 - 9:00', '23:00 - 24:30']) assert.equal(timeRange(text), null);
  assert.equal(formatTime(570), '09:30');
});

test('overlapping courses get separate lanes; back-to-back courses reuse a lane', () => {
  const input = [{ code: 'c', start: 720, end: 780 }, { code: 'a', start: 540, end: 720 }, { code: 'b', start: 600, end: 660 }, { code: 'd', start: 620, end: 690 }];
  const { slots, lanes } = layoutDay(input);
  assert.equal(lanes, 3);
  assert.equal(slots.find(c => c.code === 'c').lane, slots.find(c => c.code === 'a').lane);
  for (const a of slots) for (const b of slots) {
    if (a !== b && a.lane === b.lane) assert.ok(a.end <= b.start || b.end <= a.start);
  }
  assert.equal(input[0].code, 'c');
  assert.equal(input[0].lane, undefined);
  assert.equal(layoutDay([]).lanes, 1);
});

test('three simultaneous courses stay readable and the scale includes early/late classes', () => {
  assert.equal(layoutDay([1, 2, 3].map(code => ({ code, start: 540, end: 720 }))).lanes, 3);
  assert.deepEqual(bounds([]), { start: 420, end: 1260 });
  assert.deepEqual(bounds([{ start: 390, end: 1335 }]), { start: 360, end: 1380 });
  assert.equal(colorFor('01204512-66'), colorFor('01204512-66'));
  assert.equal(days.length, 7);
});

test('all overlapping courses fit inside equal-height artwork rows', () => {
  for (let count = 1; count <= 8; count++) {
    const result = layoutDay(Array.from({ length: count }, (_, code) => ({ code, start: 540, end: 720 })));
    assert.equal(result.lanes, count);
    assert.equal(result.laneHeight, 64 / count);
    const bottom = 6 + count * result.laneHeight - Math.min(4, result.laneHeight / 5);
    assert.ok(bottom <= 76);
  }
});

test('long titles are shortened without splitting Thai combining characters', () => {
  const measure = text => [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(text)].length * 10;
  assert.equal(fitText('Seminar', 100, measure), 'Seminar');
  assert.equal(fitText('Algorithms', 40, measure), 'Alg…');
  assert.equal(fitText('กี้ดีมาก', 30, measure), 'กี้ดี…');
  assert.equal(fitText('Title', 0, measure), '');
});
