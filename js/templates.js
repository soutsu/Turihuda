/*
 * 初回起動時に取り込むテンプレートの仕事ファイル。
 *
 * ブラウザにまだ取り込み済みの印が無いとき、ここにある仕事を保存データに追加する。
 * 既に同じ受注番号の仕事がある場合、その仕事は追加しない。
 *
 * 形式（1 件分）:
 *   {
 *     customer: '得意先名',
 *     orderNo:  '受注番号（ユニーク）',
 *     items: [ { name: '商品名', note: '商品名補足', sets: 23500 }, ... ],
 *     blank: { groupId: '238', sets: 50, count: 3 }
 *   }
 */
(function (root) {
  'use strict';
  root.TurihudaTemplates = [
    // ここにテンプレートを追加する
  ];
})(window);
