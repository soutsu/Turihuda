/* 画面制御 */
(function () {
  'use strict';

  var Calc = window.TurihudaCalc;
  var Store = window.TurihudaStore;

  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '/' + p(d.getMonth() + 1) + '/' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function fmtNum(n) { return Number(n).toLocaleString('ja-JP'); }

  /** 数字のみ受け付ける入力欄（全角数字は半角に変換）。onChange(value|'') */
  function numberInput(value, attrs, onChange) {
    var a = { type: 'text', inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'off', value: value };
    Object.keys(attrs || {}).forEach(function (k) { a[k] = attrs[k]; });
    var input = el('input', a);
    input.addEventListener('input', function () {
      var digits = input.value
        .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
        .replace(/[^0-9]/g, '');
      if (digits !== input.value) input.value = digits;
      onChange(digits === '' ? '' : Number(digits));
    });
    return input;
  }

  // ---------------------------------------------------------------- routing
  var currentJob = null;

  function route() {
    var m = location.hash.match(/^#job\/(.+)$/);
    if (m) {
      var job = Store.get(decodeURIComponent(m[1]));
      if (job) { renderJob(job); return; }
      location.hash = '';
      return;
    }
    renderList();
  }

  window.addEventListener('hashchange', route);

  // ------------------------------------------------------------- job list
  function renderList() {
    currentJob = null;
    var main = $('#app');
    main.innerHTML = '';

    var jobs = Store.list();

    var header = el('div', { class: 'toolbar' }, [
      el('h1', { text: '仕事ファイル一覧' }),
      el('button', { class: 'btn primary', onclick: function () { openJobDialog(null); } }, ['＋ 新しい仕事'])
    ]);
    main.appendChild(header);

    if (!jobs.length) {
      main.appendChild(el('p', { class: 'empty', text: '仕事ファイルはまだありません。「＋ 新しい仕事」から作成してください。' }));
      return;
    }

    var table = el('table', { class: 'list' });
    table.appendChild(el('thead', {}, [el('tr', {}, [
      el('th', { text: '得意先名' }),
      el('th', { text: '受注番号' }),
      el('th', { text: '商品数', class: 'num' }),
      el('th', { text: '更新日時' }),
      el('th', { text: '' })
    ])]));
    var tbody = el('tbody');
    jobs.forEach(function (job) {
      var count = job.items.filter(function (it) { return (it.name || '').trim() || Number(it.sets) > 0; }).length;
      var tr = el('tr', {}, [
        el('td', {}, [el('a', { href: '#job/' + encodeURIComponent(job.id), text: job.customer || '（得意先名なし）' })]),
        el('td', { text: job.orderNo }),
        el('td', { text: String(count), class: 'num' }),
        el('td', { text: fmtDate(job.updatedAt) }),
        el('td', { class: 'actions' }, [
          el('button', { class: 'btn', onclick: function () { location.hash = '#job/' + encodeURIComponent(job.id); } }, ['開く']),
          el('button', { class: 'btn', onclick: function () { openJobDialog(job); } }, ['複製']),
          el('button', { class: 'btn danger', onclick: function () {
            if (confirm('「' + job.customer + '  ' + job.orderNo + '」を削除します。よろしいですか？')) {
              Store.remove(job.id);
              renderList();
            }
          } }, ['削除'])
        ])
      ]);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    main.appendChild(table);
  }

  // --------------------------------------------------- new / duplicate dialog
  function openJobDialog(sourceJob) {
    var dlg = $('#job-dialog');
    var form = $('form', dlg);
    form.reset();
    $('#dlg-title').textContent = sourceJob ? '仕事を複製' : '新しい仕事';
    $('#dlg-source').textContent = sourceJob ? ('複製元: ' + sourceJob.customer + '  ' + sourceJob.orderNo) : '';
    $('#dlg-customer').value = sourceJob ? sourceJob.customer : '';
    $('#dlg-orderno').value = '';
    $('#dlg-error').textContent = '';
    dlg.dataset.sourceId = sourceJob ? sourceJob.id : '';
    dlg.showModal();
    $('#dlg-customer').focus();
  }

  function submitJobDialog(ev) {
    ev.preventDefault();
    var dlg = $('#job-dialog');
    var customer = $('#dlg-customer').value.trim();
    var orderNo = $('#dlg-orderno').value.trim();
    var err = $('#dlg-error');
    if (!customer) { err.textContent = '得意先名を入力してください。'; return; }
    if (!orderNo) { err.textContent = '受注番号を入力してください。'; return; }
    if (Store.orderNoExists(orderNo)) { err.textContent = '受注番号「' + orderNo + '」は既に使われています。'; return; }

    var source = dlg.dataset.sourceId ? Store.get(dlg.dataset.sourceId) : null;
    var job = Store.create(customer, orderNo, source ? source.items : null, source ? source.blank : null);
    dlg.close();
    location.hash = '#job/' + encodeURIComponent(job.id);
  }

  // ------------------------------------------------------------ job editor
  var saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 300);
  }
  function saveNow() {
    clearTimeout(saveTimer);
    if (!currentJob) return;
    Store.update(currentJob);
    var s = $('#save-status');
    if (s) { s.textContent = '保存しました ' + fmtDate(currentJob.updatedAt); }
  }

  function renderJob(job) {
    currentJob = job;
    var main = $('#app');
    main.innerHTML = '';

    var headErr = el('span', { class: 'error', id: 'head-error' });

    var customerInput = el('input', { type: 'text', value: job.customer, id: 'job-customer', placeholder: '得意先名' });
    var orderInput = el('input', { type: 'text', value: job.orderNo, id: 'job-orderno', placeholder: '受注番号' });
    customerInput.addEventListener('input', function () {
      job.customer = customerInput.value.trim();
      scheduleSave();
    });
    orderInput.addEventListener('input', function () {
      var v = orderInput.value.trim();
      if (!v) { headErr.textContent = '受注番号は必須です。'; return; }
      if (Store.orderNoExists(v, job.id)) { headErr.textContent = '受注番号「' + v + '」は既に使われています。'; return; }
      headErr.textContent = '';
      job.orderNo = v;
      scheduleSave();
    });

    main.appendChild(el('div', { class: 'toolbar' }, [
      el('a', { href: '#', class: 'btn', text: '← 一覧へ' }),
      el('div', { class: 'job-head' }, [
        el('label', {}, ['得意先名 ', customerInput]),
        el('label', {}, ['受注番号 ', orderInput]),
        headErr
      ]),
      el('span', { class: 'spacer' }),
      el('span', { id: 'save-status', class: 'muted' }),
      el('button', { class: 'btn primary', onclick: function () { openPrint(job); } }, ['印刷'])
    ]));

    var table = el('table', { class: 'items' });
    table.appendChild(el('thead', {}, [el('tr', {}, [
      el('th', { text: '#', class: 'num' }),
      el('th', { text: '商品名' }),
      el('th', { text: '商品名補足' }),
      el('th', { text: 'セット数', class: 'num' }),
      el('th', { text: '計算結果' }),
      el('th', { text: '' })
    ])]));
    var tbody = el('tbody', { id: 'items-body' });
    table.appendChild(tbody);
    main.appendChild(table);

    main.appendChild(el('div', { class: 'row-actions' }, [
      el('button', { class: 'btn', onclick: function () {
        job.items.push(Store.newItem());
        renderItems(job);
        scheduleSave();
        var inputs = $$('#items-body input[data-field="name"]');
        if (inputs.length) inputs[inputs.length - 1].focus();
      } }, ['＋ 行を追加']),
      el('span', { class: 'muted', text: '　1 コマ = ' + fmtNum(Calc.SETS_PER_KOMA) + ' セット、1 段 = ' + Calc.KOMA_PER_TIER + ' コマ、1 パレット最大 ' + Calc.MAX_TIERS_PER_PALLET + ' 段' })
    ]));

    renderItems(job);

    // ---- 空白（常に 1 行、追加・削除なし） ----
    main.appendChild(el('h2', { class: 'section-title', text: '空白' }));
    var btable = el('table', { class: 'items blanks' });
    btable.appendChild(el('thead', {}, [el('tr', {}, [
      el('th', { text: '商品名' }),
      el('th', { text: 'グループID' }),
      el('th', { text: 'セット数', class: 'num' }),
      el('th', { text: '連数', class: 'num' }),
      el('th', { text: '印刷内容' })
    ])]));
    btable.appendChild(el('tbody', { id: 'blanks-body' }));
    main.appendChild(btable);
    main.appendChild(el('p', { class: 'muted', text: '連数の枚数だけ「グループID-1, -2, …」として印刷します。連数が空なら空白と下記の固定商品は印刷されません。' }));
    renderBlank(job);
  }

  function renderBlank(job) {
    var blank = job.blank;
    var tbody = $('#blanks-body');
    tbody.innerHTML = '';

    var count = function () { return Math.max(0, Math.floor(Number(blank.count) || 0)); };
    var seriesText = function (prefix, sets) {
      var n = count();
      var sm = Calc.summarize(sets);
      if (!n || !sm.koma) return '—';
      var first = prefix ? prefix + '-1' : '1';
      var last = prefix ? prefix + '-' + n : String(n);
      return n + ' 枚（' + first + (n > 1 ? ' 〜 ' + last : '') + '）／ 各 ' + sm.koma + ' コマ';
    };

    var summary = el('td', { class: 'summary' });
    var fixedSummaries = [];
    var updateSummary = function () {
      summary.textContent = seriesText(String(blank.groupId || '').trim(), blank.sets);
      fixedSummaries.forEach(function (f) { f.cell.textContent = seriesText('', f.sets); });
    };

    var gidIn = el('input', { type: 'text', value: blank.groupId, 'data-field': 'groupId', placeholder: '例: 238', autocomplete: 'off' });
    gidIn.addEventListener('input', function () { blank.groupId = gidIn.value; updateSummary(); scheduleSave(); });
    var setsIn = numberInput(blank.sets, { 'data-field': 'sets', class: 'num sets' }, function (v) {
      blank.sets = v; updateSummary(); scheduleSave();
    });
    var countIn = numberInput(blank.count, { 'data-field': 'count', class: 'num count', placeholder: '枚数' }, function (v) {
      blank.count = v; updateSummary(); scheduleSave();
    });

    tbody.appendChild(el('tr', {}, [
      el('td', { class: 'fixed-name', text: Calc.BLANK_NAME }),
      el('td', {}, [gidIn]),
      el('td', {}, [setsIn]),
      el('td', {}, [countIn]),
      summary
    ]));

    // 空白の連数に連動して必ず印刷される固定商品（入力不可）
    Calc.FIXED_AFTER_BLANK.forEach(function (fx) {
      var cell = el('td', { class: 'summary' });
      fixedSummaries.push({ cell: cell, sets: fx.sets });
      tbody.appendChild(el('tr', { class: 'fixed-row' }, [
        el('td', { class: 'fixed-name', text: fx.name }),
        el('td', { class: 'muted', text: '連数の数字のみ' }),
        el('td', { class: 'num', text: String(fx.sets) }),
        el('td', { class: 'num muted', text: '空白と同じ' }),
        cell
      ]));
    });

    updateSummary();
  }

  function renderItems(job) {
    var tbody = $('#items-body');
    tbody.innerHTML = '';
    job.items.forEach(function (item, idx) {
      var summary = el('td', { class: 'summary' });
      var updateSummary = function () {
        summary.textContent = Calc.summarize(item.sets).text;
      };

      var nameIn = el('input', { type: 'text', value: item.name, 'data-field': 'name', placeholder: '例: HFレターHOT' });
      var noteIn = el('input', { type: 'text', value: item.note, 'data-field': 'note', placeholder: '（任意）' });
      var setsIn = numberInput(item.sets, { 'data-field': 'sets', placeholder: '例: 23500', class: 'num sets' }, function (v) {
        item.sets = v;
        updateSummary();
        scheduleSave();
      });

      nameIn.addEventListener('input', function () { item.name = nameIn.value; scheduleSave(); });
      noteIn.addEventListener('input', function () { item.note = noteIn.value; scheduleSave(); });
      // Enter で次の行へ（最終行なら追加）
      setsIn.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (idx === job.items.length - 1) {
          job.items.push(Store.newItem());
          renderItems(job);
          scheduleSave();
        }
        var inputs = $$('#items-body input[data-field="name"]');
        if (inputs[idx + 1]) inputs[idx + 1].focus();
      });

      var tr = el('tr', {}, [
        el('td', { text: String(idx + 1), class: 'num' }),
        el('td', {}, [nameIn]),
        el('td', {}, [noteIn]),
        el('td', {}, [setsIn]),
        summary,
        el('td', { class: 'actions' }, [
          el('button', { class: 'btn small', title: '上へ', onclick: function () {
            if (idx === 0) return;
            job.items.splice(idx - 1, 0, job.items.splice(idx, 1)[0]);
            renderItems(job); scheduleSave();
          } }, ['↑']),
          el('button', { class: 'btn small', title: '下へ', onclick: function () {
            if (idx === job.items.length - 1) return;
            job.items.splice(idx + 1, 0, job.items.splice(idx, 1)[0]);
            renderItems(job); scheduleSave();
          } }, ['↓']),
          el('button', { class: 'btn small danger', title: '行を削除', onclick: function () {
            var label = (item.name || '').trim() || ('行 ' + (idx + 1));
            if (!confirm('「' + label + '」を削除しますか？')) return;
            job.items.splice(idx, 1);
            if (!job.items.length) job.items.push(Store.newItem());
            renderItems(job); scheduleSave();
          } }, ['×'])
        ])
      ]);
      updateSummary();
      tbody.appendChild(tr);
    });
  }

  // ----------------------------------------------------------------- print
  function openPrint(job) {
    saveNow();
    var root = $('#print-root');
    var pages = $('#print-pages');
    pages.innerHTML = '';

    var tags = [];
    job.items.forEach(function (item) {
      if (!(item.name || '').trim() && !(Number(item.sets) > 0)) return;
      Calc.buildTags(item).forEach(function (t) { tags.push(t); });
    });
    Calc.buildBlankTags(job.blank || {}).forEach(function (t) { tags.push(t); });

    if (!tags.length) {
      alert('印刷できる商品がありません。商品名とセット数を入力してください。');
      return;
    }

    tags.forEach(function (tag) {
      var page = el('section', { class: 'tag-page' }, [
        el('div', { class: 'tag-top' }, [
          el('div', { class: 'tag-line tag-customer fit', text: job.customer }),
          el('div', { class: 'tag-line tag-orderno fit', text: job.orderNo }),
          el('div', { class: 'tag-line tag-name fit', text: tag.name }),
          tag.note ? el('div', { class: 'tag-line tag-note fit', text: tag.note }) : null
        ]),
        el('div', { class: 'tag-bottom' }, tag.lines.map(function (ln) {
          return el('div', { class: 'tag-line tag-qty fit' }, [
            el('span', { class: 'qty-sets', text: String(ln.sets) }),
            el('span', { class: 'qty-unit', text: ' セット' }),
            el('span', { class: 'qty-x', text: ' × ' }),
            el('span', { class: 'qty-koma', text: String(ln.koma) }),
            el('span', { class: 'qty-unit', text: ' コマ' })
          ]);
        }))
      ]);
      pages.appendChild(page);
    });

    $('#print-count').textContent = tags.length + ' 枚';
    root.hidden = false;
    document.body.classList.add('printing');
    fitAll();
  }

  function closePrint() {
    $('#print-root').hidden = true;
    document.body.classList.remove('printing');
  }

  /**
   * 長い文字列が紙幅を超える場合に文字を縮める。
   * プレビューの札は印刷と同じ 273mm 幅で描画しているので、ここで決めた
   * 文字サイズがそのまま印刷に使われる（beforeprint では再計測しない：
   * その時点の計測は紙幅ではなく画面幅になるため）。
   * 印刷では画面より字幅がやや広く出ることがあるため、幅の 95% に収める。
   */
  var FIT_RATIO = 0.95;
  function textWidth(node) {
    var range = document.createRange();
    range.selectNodeContents(node);
    return range.getBoundingClientRect().width;
  }
  function fitAll() {
    $$('#print-pages .fit').forEach(function (node) {
      node.style.fontSize = '';
      var size = parseFloat(getComputedStyle(node).fontSize);
      var min = size * 0.3;
      var guard = 0;
      while (textWidth(node) > node.clientWidth * FIT_RATIO && size > min && guard++ < 60) {
        size = size * 0.92;
        node.style.fontSize = size + 'px';
      }
    });
  }

  // ------------------------------------------------------------------ init
  document.addEventListener('DOMContentLoaded', function () {
    $('#job-dialog form').addEventListener('submit', submitJobDialog);
    $('#dlg-cancel').addEventListener('click', function () { $('#job-dialog').close(); });
    $('#print-close').addEventListener('click', closePrint);
    $('#print-go').addEventListener('click', function () { fitAll(); window.print(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('#print-root').hidden) closePrint();
    });
    route();
  });
})();
