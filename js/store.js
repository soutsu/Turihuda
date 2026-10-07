/* 仕事ファイルの保存（localStorage） */
(function (root) {
  'use strict';

  var KEY = 'turihuda.jobs.v1';

  function now() { return new Date().toISOString(); }

  function uid() {
    return 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      var data = raw ? JSON.parse(raw) : null;
      if (!data || !Array.isArray(data.jobs)) return { jobs: [] };
      return data;
    } catch (e) {
      console.error('保存データの読み込みに失敗しました', e);
      return { jobs: [] };
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function newItem() {
    return { name: '', note: '', sets: '' };
  }

  var BLANK_DEFAULT_SETS = 50;
  function newBlank(src) {
    src = src || {};
    return {
      groupId: src.groupId || '',
      sets: src.sets === undefined ? BLANK_DEFAULT_SETS : src.sets,
      count: src.count === undefined ? '' : src.count
    };
  }

  /** 古い保存データ（blank なし / 旧 blanks 配列）を現在の形にそろえる */
  function normalize(job) {
    if (!Array.isArray(job.items)) job.items = [newItem()];
    if (!job.blank || typeof job.blank !== 'object') {
      job.blank = newBlank(Array.isArray(job.blanks) && job.blanks.length ? job.blanks[0] : null);
    }
    delete job.blanks;
    return job;
  }

  var Store = {
    list: function () {
      return load().jobs.map(normalize).sort(function (a, b) {
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      });
    },

    get: function (id) {
      var job = load().jobs.find(function (j) { return j.id === id; });
      return job ? normalize(job) : null;
    },

    /** 受注番号の重複チェック（excludeId は自分自身を除外する用） */
    orderNoExists: function (orderNo, excludeId) {
      var key = String(orderNo || '').trim();
      return load().jobs.some(function (j) {
        return j.id !== excludeId && String(j.orderNo || '').trim() === key;
      });
    },

    create: function (customer, orderNo, items, blank) {
      var data = load();
      var job = {
        id: uid(),
        customer: String(customer || '').trim(),
        orderNo: String(orderNo || '').trim(),
        items: (items && items.length) ? items.map(function (it) {
          return { name: it.name || '', note: it.note || '', sets: it.sets === undefined ? '' : it.sets };
        }) : [newItem()],
        blank: newBlank(blank),
        createdAt: now(),
        updatedAt: now()
      };
      data.jobs.push(job);
      save(data);
      return job;
    },

    update: function (job) {
      var data = load();
      var idx = data.jobs.findIndex(function (j) { return j.id === job.id; });
      if (idx < 0) return null;
      job.updatedAt = now();
      data.jobs[idx] = job;
      save(data);
      return job;
    },

    remove: function (id) {
      var data = load();
      data.jobs = data.jobs.filter(function (j) { return j.id !== id; });
      save(data);
    },

    newItem: newItem,
    newBlank: newBlank,
    BLANK_DEFAULT_SETS: BLANK_DEFAULT_SETS
  };

  root.TurihudaStore = Store;
})(window);
