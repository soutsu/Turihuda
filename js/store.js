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

  var Store = {
    list: function () {
      return load().jobs.slice().sort(function (a, b) {
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      });
    },

    get: function (id) {
      return load().jobs.find(function (j) { return j.id === id; }) || null;
    },

    /** 受注番号の重複チェック（excludeId は自分自身を除外する用） */
    orderNoExists: function (orderNo, excludeId) {
      var key = String(orderNo || '').trim();
      return load().jobs.some(function (j) {
        return j.id !== excludeId && String(j.orderNo || '').trim() === key;
      });
    },

    create: function (customer, orderNo, items) {
      var data = load();
      var job = {
        id: uid(),
        customer: String(customer || '').trim(),
        orderNo: String(orderNo || '').trim(),
        items: (items && items.length) ? items.map(function (it) {
          return { name: it.name || '', note: it.note || '', sets: it.sets === undefined ? '' : it.sets };
        }) : [newItem()],
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

    newItem: newItem
  };

  root.TurihudaStore = Store;
})(window);
