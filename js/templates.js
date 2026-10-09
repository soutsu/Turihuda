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
    {
      customer: "【テンプレート】DoCLASSE E11月号",
      orderNo: "01-0013-0496-4",
      items: [
        { name: "(A)", note: "", sets: 147656 },
        { name: "(B)", note: "", sets: 76126 },
        { name: "(C)", note: "", sets: 240428 },
        { name: "(D)", note: "", sets: 102113 },
        { name: "(E)", note: "", sets: 190937 },
        { name: "(F)", note: "", sets: 128619 },
        { name: "HFレターホット", note: "", sets: 15500 },
        { name: "HFレターカタリク", note: "", sets: 1150 },
        { name: "HFレターカタリク(南和様直送分)", note: "", sets: 450 },
        { name: "ラッピングサンプル", note: "グループID:1", sets: 40 },
        { name: "ラッピングサンプル", note: "グループID:2", sets: 40 },
        { name: "ラッピングサンプル", note: "グループID:3", sets: 40 },
        { name: "セレクティブバー確認用ダミー", note: "(4～15 ON)", sets: 10 },
        { name: "セレクティブバー確認用ダミー", note: "(16～26 ON)", sets: 10 },
        { name: "HOT用 封入確認用ダミー", note: "", sets: 10 },
        { name: "HOT(他社あり)用 封入確認用ダミー", note: "", sets: 10 },
        { name: "カタリク用 封入確認用ダミー", note: "", sets: 10 }
      ],
      blank: {
        groupId: "238",
        sets: 50,
        count: 15
      }
    },
    {
      customer: "【テンプレート】DoCLASSE E11月号 リメール",
      orderNo: "01-0014-2394-2",
      items: [
        { name: "(A)", note: "", sets: 61475 },
        { name: "(B)", note: "", sets: 58460 },
        { name: "ラッピングサンプル", note: "グループID:1", sets: 40 },
        { name: "セレクティブバー確認用ダミー", note: "(4～10 ON)", sets: 10 },
        { name: "セレクティブバー確認用ダミー", note: "(11～26 ON)", sets: 10 }
      ],
      blank: {
        groupId: "238",
        sets: 50,
        count: 1
      }
    }
  ];
})(window);
