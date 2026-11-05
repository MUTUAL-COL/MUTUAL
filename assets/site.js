/* MUTUAL — motor de interacciones (réplica del comportamiento de Readymag) */
(function () {
  'use strict';
  var root = document.documentElement;

  function activeLayer() {
    return document.querySelector(root.classList.contains('is-phone') ? '.lay.phone' : '.lay.desk');
  }

  /* ---------- animaciones ---------- */
  var EASE = { 'ease-both': 'ease-in-out', 'ease-in': 'ease-in', 'ease-out': 'ease-out', 'none': 'linear', 'linear': 'linear' };

  function Anim(el, def) {
    this.el = el; this.def = def; this.on = false; this.timers = [];
    var s0 = def.steps[0] || {};
    // estado inicial
    this.base = { o: 1, s: 1, r: 0, x: 0, y: 0 };
    def.steps.forEach(function (s) {
      if (s.use_opacity && this.base._o === undefined) { this.base.o = (s.from_opacity == null ? 100 : s.from_opacity) / 100; this.base._o = 1; }
      if (s.use_scale && this.base._s === undefined) { this.base.s = (s.from_scale == null ? 100 : s.from_scale) / 100; this.base._s = 1; }
      if (s.use_rotate && this.base._r === undefined) { this.base.r = s.from_rotate || 0; this.base._r = 1; }
    }, this);
    this.state = Object.assign({}, this.base);
    this.apply(this.state, 0, 0, s0.acceleration);
  }
  Anim.prototype.apply = function (st, dur, delay, acc) {
    var e = this.el;
    e.style.transitionDuration = dur + 's';
    e.style.transitionDelay = delay + 's';
    e.style.transitionTimingFunction = EASE[acc] || 'ease-in-out';
    e.style.opacity = st.o;
    e.style.transform = 'translate(' + st.x + 'px,' + st.y + 'px) scale(' + st.s + ') rotate(' + st.r + 'deg)';
  };
  Anim.prototype.clear = function () { this.timers.forEach(clearTimeout); this.timers = []; };
  Anim.prototype.forward = function () {
    var self = this; this.clear(); this.on = true;
    var st = Object.assign({}, this.state), t = 0;
    this.def.steps.forEach(function (s) {
      var dur = s.duration || 0, del = s.delay || 0;
      var next = Object.assign({}, st);
      if (s.use_opacity) next.o = (s.opacity == null ? 100 : s.opacity) / 100;
      if (s.use_scale) next.s = (s.scale == null ? 100 : s.scale) / 100;
      if (s.use_rotate) next.r = s.rotate || 0;
      if (s.use_move) { next.x = st.x + (s.dx || 0); next.y = st.y + (s.dy || 0); }
      st = next;
      (function (snap, at) {
        self.timers.push(setTimeout(function () { self.state = snap; self.apply(snap, dur, del, s.acceleration); }, at * 1000));
      })(next, t);
      t += dur + del;
    });
  };
  Anim.prototype.back = function () {
    this.clear(); this.on = false;
    var last = this.def.steps[this.def.steps.length - 1] || {};
    this.state = Object.assign({}, this.base);
    this.apply(this.state, last.duration || 0, 0, last.acceleration);
  };
  Anim.prototype.toggle = function () { this.on ? this.back() : this.forward(); };

  function initAnims(layer) {
    var byId = {};
    layer.querySelectorAll('[data-w]').forEach(function (n) { byId[n.getAttribute('data-w')] = n; });
    layer.querySelectorAll('[data-anim]').forEach(function (el) {
      if (el._anims) return;
      var defs; try { defs = JSON.parse(el.getAttribute('data-anim')); } catch (e) { return; }
      el._anims = defs.map(function (d) { return new Anim(el, d); });
      el._anims.forEach(function (a) {
        var d = a.def;
        var triggers = (d.trigger && d.trigger.length) ? d.trigger.map(function (id) { return byId[id]; }).filter(Boolean) : [el];
        if (d.type === 'hover') {
          triggers.forEach(function (t) {
            t.addEventListener('mouseenter', function () { a.forward(); });
            t.addEventListener('mouseleave', function () { a.back(); });
          });
        } else if (d.type === 'click') {
          triggers.forEach(function (t) {
            t.addEventListener('click', function (ev) {
              if (!ev.target.closest('a[href]')) ev.preventDefault();
              if (d.once && a.on) return; a.toggle();
            });
            t.style.cursor = 'pointer';
          });
        } else if (d.type === 'scroll') {
          var sp = (d.steps[0] || {}).start_point || 'bottom';
          var margin = sp === 'center' ? '0px 0px -50% 0px' : sp === 'top' ? '0px 0px -100% 0px' : '0px';
          var io = new IntersectionObserver(function (en) {
            en.forEach(function (x) {
              if (x.isIntersecting) { if (!a.on) a.forward(); }
              else if (d.reset && !d.once && x.boundingClientRect.top > 0 && a.on) a.back();
            });
          }, { rootMargin: margin, threshold: 0 });
          io.observe(el);
        } else if (d.type === 'load') {
          var s = d.steps[0] || {};
          if (s.loop === 'repeat' && s.use_move) {
            el.style.transition = 'none';
            el.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(' + (s.dx || 0) + 'px,' + (s.dy || 0) + 'px)' }],
              { duration: (s.duration || 10) * 1000, iterations: Infinity, easing: 'linear' });
          } else { a.forward(); }
        }
      });
    });
  }

  /* ---------- videos ---------- */
  function initVideos(layer) {
    var vids = layer.querySelectorAll('video[data-src]');
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        var v = x.target;
        if (x.isIntersecting) {
          if (!v.src) { v.src = v.getAttribute('data-src'); v.preload = 'auto'; }
          if (v.hasAttribute('data-auto') && !v._ended) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        } else if (!v.paused) { v.pause(); }
      });
    }, { rootMargin: '200px 0px' });
    vids.forEach(function (v) {
      v.muted = true;
      io.observe(v);
      var box = v.parentNode, btn = box.querySelector('.play');
      var snd = box.querySelector('.snd');
      if (snd) snd.addEventListener('click', function (e) { e.preventDefault(); v.muted = !v.muted; snd.textContent = v.muted ? 'SONIDO' : 'SILENCIO'; if (v.paused) v.play(); });
      if (btn) {
        v.addEventListener('ended', function () { v._ended = true; box.classList.add('paused'); });
        v.addEventListener('play', function () { box.classList.remove('paused'); });
        btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); v._ended = false; v.currentTime = 0; v.play(); });
      }
    });
  }

  /* ---------- menú (hotspot) ---------- */
  function initMenu(layer) {
    layer.querySelectorAll('.hs').forEach(function (hs) {
      var tip = hs.nextElementSibling;
      if (!tip || !tip.classList.contains('tip')) return;
      hs.querySelector('.pin').addEventListener('click', function (e) { e.stopPropagation(); tip.classList.toggle('open'); });
      tip.addEventListener('click', function (e) { if (e.target.closest('a')) tip.classList.remove('open'); e.stopPropagation(); });
      document.addEventListener('click', function () { tip.classList.remove('open'); });
    });
  }

  /* ---------- anclas tipo #y1601 ---------- */
  function initAnchors(layer) {
    layer.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#y"]'); if (!a) return;
      e.preventDefault();
      var z = parseFloat(getComputedStyle(root).getPropertyValue('--z')) || 1;
      window.scrollTo({ top: parseInt(a.getAttribute('href').slice(2), 10) * z, behavior: 'smooth' });
    });
  }

  var done = {};
  function boot() {
    var layer = activeLayer(); if (!layer) return;
    var k = layer.classList.contains('phone') ? 'p' : 'd';
    if (done[k]) return; done[k] = 1;
    initAnims(layer); initVideos(layer); initMenu(layer); initAnchors(layer);
  }
  boot();
  addEventListener('resize', boot);
})();

/* ---------- intro de Ecosistema: el video se ve 3 segundos y luego se pasa a la parte blanca ---------- */
(function () {
  var el = document.getElementById('intro');
  if (!el) return;
  var root = document.documentElement, v = el.querySelector('video'), done = false, timer = null;
  root.classList.add('intro-on');
  function finish() {
    if (done) return; done = true; clearTimeout(timer);
    el.classList.add('out'); root.classList.remove('intro-on');
    window.scrollTo(0, 0);
    setTimeout(function () { if (v) v.pause(); el.remove(); }, 800);
  }
  function start() { if (!timer) timer = setTimeout(finish, 3000); }
  if (v) {
    v.muted = true;
    v.addEventListener('playing', start);
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  }
  setTimeout(start, 1200);            // si el video no arranca, igual se continúa
  el.addEventListener('click', finish);
})();
