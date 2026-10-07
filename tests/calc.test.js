const test = require('node:test');
const assert = require('node:assert/strict');
const calc = require('../js/calc.js');

test('komaBreakdown: 23500 → 11 full koma + 1500 remainder', () => {
  assert.deepEqual(calc.komaBreakdown(23500), { sets: 23500, full: 11, rem: 1500, total: 12 });
  assert.deepEqual(calc.komaBreakdown(2000), { sets: 2000, full: 1, rem: 0, total: 1 });
  assert.deepEqual(calc.komaBreakdown(1500), { sets: 1500, full: 0, rem: 1500, total: 1 });
  assert.deepEqual(calc.komaBreakdown(0), { sets: 0, full: 0, rem: 0, total: 0 });
});

test('splitTiers follows the given examples', () => {
  const expected = {
    1: [1], 8: [8],
    9: [6, 3], 10: [6, 4], 11: [6, 5], 12: [6, 6],
    13: [7, 6], 14: [7, 7], 15: [8, 7], 16: [8, 8],
    17: [6, 6, 5], 18: [7, 6, 5], 19: [7, 7, 5],
  };
  for (const [tiers, split] of Object.entries(expected)) {
    assert.deepEqual(calc.splitTiers(Number(tiers)), split, `tiers=${tiers}`);
  }
});

test('splitTiers never creates a 1- or 2-tier pallet and never exceeds 8', () => {
  for (let t = 1; t <= 200; t++) {
    const split = calc.splitTiers(t);
    assert.equal(split.reduce((a, b) => a + b, 0), t, `sum for ${t}`);
    for (const s of split) {
      assert.ok(s <= 8, `tiers=${t} split=${split}`);
      if (split.length > 1) assert.ok(s >= 3, `tiers=${t} split=${split}`);
    }
  }
});

test('buildTags: single pallet with remainder (image example)', () => {
  const tags = calc.buildTags({ name: 'HFレターHOT', note: '', sets: 23500 });
  assert.equal(tags.length, 1);
  assert.equal(tags[0].name, 'HFレターHOT');
  assert.deepEqual(tags[0].lines, [{ sets: 2000, koma: 11 }, { sets: 1500, koma: 1 }]);
  assert.equal(tags[0].tiers, 2);
});

test('buildTags: split across pallets, remainder goes on last pallet, names get -1/-2', () => {
  // 151000 sets → 75 full + 1000 remainder = 76 koma → 10 tiers → 6 + 4
  const tags = calc.buildTags({ name: 'ABC', note: 'x', sets: 151000 });
  assert.equal(tags.length, 2);
  assert.equal(tags[0].name, 'ABC-1');
  assert.equal(tags[1].name, 'ABC-2');
  assert.deepEqual(tags[0].lines, [{ sets: 2000, koma: 48 }]);
  assert.deepEqual(tags[1].lines, [{ sets: 2000, koma: 27 }, { sets: 1000, koma: 1 }]);
  assert.equal(tags[0].tiers, 6);
  assert.equal(tags[1].tiers, 4);
  // koma counted per pallet actually fits the assigned tiers
  for (const t of tags) assert.ok(Math.ceil(t.koma / 8) <= t.tiers && Math.ceil(t.koma / 8) >= t.tiers - 0);
});

test('buildTags: zero/empty sets produces nothing', () => {
  assert.deepEqual(calc.buildTags({ name: 'X', note: '', sets: 0 }), []);
  assert.deepEqual(calc.buildTags({ name: 'X', note: '', sets: '' }), []);
});

test('buildBlankTags: one page per 連数, note = groupId-n, name fixed to 空白', () => {
  const tags = calc.buildBlankTags({ groupId: '238', sets: 50, count: 3 });
  assert.equal(tags.length, 3);
  assert.deepEqual(tags.map(t => t.name), ['空白', '空白', '空白']);
  assert.deepEqual(tags.map(t => t.note), ['238-1', '238-2', '238-3']);
  for (const t of tags) assert.deepEqual(t.lines, [{ sets: 50, koma: 1 }]);
  assert.deepEqual(calc.buildBlankTags({ groupId: '238', sets: 50, count: 0 }), []);
  assert.deepEqual(calc.buildBlankTags({ groupId: '238', sets: 0, count: 2 }), []);
});
