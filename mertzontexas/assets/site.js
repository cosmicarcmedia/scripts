/* City of Mertzon concept redesign, Cosmic Arc Media */
(function () {
  'use strict';

  // Mobile navigation
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('primary-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Header shadow once the page scrolls
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Business directory filter
  var chips = document.querySelectorAll('[data-filter]');
  var cats = document.querySelectorAll('.biz-cat');
  var search = document.getElementById('biz-search');
  var empty = document.getElementById('biz-empty');

  function applyFilter() {
    var active = document.querySelector('[data-filter].on');
    var key = active ? active.getAttribute('data-filter') : 'all';
    var q = search ? search.value.trim().toLowerCase() : '';
    var anyVisible = false;

    cats.forEach(function (cat) {
      var catKey = cat.getAttribute('data-cat');
      var catMatch = (key === 'all' || key === catKey);
      var shown = 0;

      cat.querySelectorAll('.biz').forEach(function (biz) {
        var text = biz.textContent.toLowerCase();
        var hit = catMatch && (!q || text.indexOf(q) !== -1);
        biz.style.display = hit ? '' : 'none';
        if (hit) shown++;
      });

      cat.style.display = shown ? '' : 'none';
      if (shown) anyVisible = true;
    });

    if (empty) empty.style.display = anyVisible ? 'none' : '';
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('on'); });
      chip.classList.add('on');
      applyFilter();
    });
  });
  if (search) search.addEventListener('input', applyFilter);

  // Demo contact form, nothing is transmitted
  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = document.getElementById('form-note');
      if (note) {
        note.hidden = false;
        note.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
})();
