/*
 * 釣り札の計算ロジック（純粋関数のみ。ブラウザ・Node 両方で使う）
 *
 * 用語:
 *   セット   … 入力される数量
 *   コマ     … 紙の束。SETS_PER_KOMA セットで 1 コマ
 *   段       … パレットに積む 1 層。KOMA_PER_TIER コマで 1 段
 *   パレット … 最大 MAX_TIERS_PER_PALLET 段まで積める
 */
(function (root) {
  'use strict';

  var SETS_PER_KOMA = 2000;       // 2000 セットで 1 コマ
  var KOMA_PER_TIER = 8;          // 8 コマで 1 段
  var MAX_TIERS_PER_PALLET = 8;   // 1 パレット最大 8 段
  var MIN_TIERS_FIRST = 6;        // 分割時、先頭側パレットの最低段数
  var MIN_TIERS_LAST_3PLUS = 5;   // 3 パレット以上に分かれる時の末尾パレットの最低段数

  /** セット数 → 満コマ数・端数セット・総コマ数 */
  function komaBreakdown(sets) {
    sets = Math.max(0, Math.floor(Number(sets) || 0));
    var full = Math.floor(sets / SETS_PER_KOMA);
    var rem = sets % SETS_PER_KOMA;
    return { sets: sets, full: full, rem: rem, total: full + (rem > 0 ? 1 : 0) };
  }

  /** コマ数 → 段数 */
  function tiersForKoma(koma) {
    return Math.ceil(koma / KOMA_PER_TIER);
  }

  /**
   * 段数 → パレットごとの段数の配列
   *
   *   1〜8 段 … 1 パレット
   *   9〜16 段 … 2 パレット。先頭は max(6, 切り上げ(段数/2))、残りを 2 つ目へ
   *             9→6+3, 10→6+4, 11→6+5, 12→6+6, 13→7+6, 14→7+7, 15→8+7, 16→8+8
   *   17 段〜 … 末尾パレットは max(5, 余り) 段とし、残りを再帰的に分割
   *             17→6+6+5, 18→7+6+5, 19→7+7+5, 20→8+7+5, 21→8+8+5, 22→8+8+6 …
   *
   * 1 段・2 段だけのパレットは作らない。
   */
  function splitTiers(tiers) {
    tiers = Math.max(0, Math.floor(Number(tiers) || 0));
    if (tiers === 0) return [];
    var n = Math.ceil(tiers / MAX_TIERS_PER_PALLET);
    if (n === 1) return [tiers];
    if (n === 2) {
      var first = Math.max(MIN_TIERS_FIRST, Math.ceil(tiers / 2));
      return [first, tiers - first];
    }
    var last = Math.max(MIN_TIERS_LAST_3PLUS, tiers - MAX_TIERS_PER_PALLET * (n - 1));
    return splitTiers(tiers - last).concat([last]);
  }

  /**
   * 商品 1 件 → パレットごとの釣り札データの配列
   *
   * item: { name, note, sets }
   * 戻り値: [{ name, note, tiers, koma, lines: [{ sets, koma }], palletIndex, palletCount }]
   */
  function buildTags(item) {
    var bd = komaBreakdown(item.sets);
    if (bd.total === 0) return [];
    var tiers = tiersForKoma(bd.total);
    var split = splitTiers(tiers);
    var remainingKoma = bd.total;
    var tags = [];

    for (var i = 0; i < split.length; i++) {
      var capacity = split[i] * KOMA_PER_TIER;
      var take = Math.min(capacity, remainingKoma);
      remainingKoma -= take;
      var isLast = i === split.length - 1;
      var hasPartial = isLast && bd.rem > 0;
      var fullKoma = hasPartial ? take - 1 : take;
      var lines = [];
      if (fullKoma > 0) lines.push({ sets: SETS_PER_KOMA, koma: fullKoma });
      if (hasPartial) lines.push({ sets: bd.rem, koma: 1 });

      var name = String(item.name || '');
      if (split.length > 1) name = name + '-' + (i + 1);

      tags.push({
        name: name,
        baseName: String(item.name || ''),
        note: String(item.note || ''),
        tiers: split[i],
        koma: take,
        lines: lines,
        palletIndex: i + 1,
        palletCount: split.length
      });
    }
    return tags;
  }

  /**
   * 連番シリーズ → 連数分の釣り札データの配列
   *
   * series: { name, prefix, sets, count }
   * 補足行は prefix があれば "[prefix]-連番"、なければ連番の数字のみ（1 始まり）。
   */
  function buildSeriesTags(series) {
    var count = Math.max(0, Math.floor(Number(series.count) || 0));
    var prefix = String(series.prefix || '').trim();
    var tags = [];
    for (var n = 1; n <= count; n++) {
      var note = prefix ? prefix + '-' + n : String(n);
      buildTags({ name: series.name, note: note, sets: series.sets }).forEach(function (t) {
        t.sheetIndex = n;
        t.sheetCount = count;
        tags.push(t);
      });
    }
    return tags;
  }

  /** 空白（商品名固定、補足 = グループID-連番） */
  var BLANK_NAME = '空白';
  var BLANK_DEFAULT_SETS = 50;

  /** 空白の連数と同じ枚数だけ必ず印刷する固定商品（補足 = 連番のみ） */
  var FIXED_AFTER_BLANK = [
    { name: '定外見本（南和）', sets: 20 },
    { name: '定外見本（ゆうメール）', sets: 20 }
  ];

  /**
   * 空白 { groupId, sets, count } → 空白の札 + 固定商品の札
   * 順序: 空白 1..n、定外見本（南和）1..n、定外見本（ゆうメール）1..n
   */
  function buildBlankTags(blank) {
    var count = Math.max(0, Math.floor(Number(blank.count) || 0));
    var tags = buildSeriesTags({ name: BLANK_NAME, prefix: blank.groupId, sets: blank.sets, count: count });
    tags.forEach(function (t) { t.isBlank = true; });
    FIXED_AFTER_BLANK.forEach(function (fx) {
      buildSeriesTags({ name: fx.name, prefix: '', sets: fx.sets, count: count }).forEach(function (t) {
        t.isFixed = true;
        tags.push(t);
      });
    });
    return tags;
  }

  /** 画面表示用の要約 */
  function summarize(sets) {
    var bd = komaBreakdown(sets);
    if (bd.total === 0) return { koma: 0, tiers: 0, split: [], text: '' };
    var tiers = tiersForKoma(bd.total);
    var split = splitTiers(tiers);
    var text = bd.total + ' コマ / ' + tiers + ' 段 / ' + split.length + ' パレット';
    if (split.length > 1) text += '（' + split.join(' 段 + ') + ' 段）';
    return { koma: bd.total, tiers: tiers, split: split, text: text };
  }

  var api = {
    SETS_PER_KOMA: SETS_PER_KOMA,
    KOMA_PER_TIER: KOMA_PER_TIER,
    MAX_TIERS_PER_PALLET: MAX_TIERS_PER_PALLET,
    komaBreakdown: komaBreakdown,
    tiersForKoma: tiersForKoma,
    splitTiers: splitTiers,
    buildTags: buildTags,
    BLANK_NAME: BLANK_NAME,
    BLANK_DEFAULT_SETS: BLANK_DEFAULT_SETS,
    FIXED_AFTER_BLANK: FIXED_AFTER_BLANK,
    buildSeriesTags: buildSeriesTags,
    buildBlankTags: buildBlankTags,
    summarize: summarize
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TurihudaCalc = api;
})(typeof window !== 'undefined' ? window : globalThis);
