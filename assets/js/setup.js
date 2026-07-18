(function () {
  'use strict';

  var STORAGE_KEY  = 'rbx_page_config';
  var LOADING_KEY  = 'rbx_loading_after_reload';

  /* ═══════════════════════════
     LOADING OVERLAY HELPERS
  ═══════════════════════════ */
  function showLoader() {
    var el = document.getElementById('page-loading-overlay');
    if (el) el.classList.add('active');
  }
  function hideLoader() {
    var el = document.getElementById('page-loading-overlay');
    if (!el) return;
    el.classList.add('fade-out');
    setTimeout(function () { el.classList.remove('active', 'fade-out'); }, 600);
  }
  function setStep(i, state) {
    var steps = document.querySelectorAll('.plo-step');
    if (steps[i]) {
      steps[i].classList.remove('active', 'done');
      steps[i].classList.add(state);
    }
  }

  /* ═══════════════════════════
     APPLY TEXT REPLACEMENTS
     (avatar/robux handled by
      head interceptor)
  ═══════════════════════════ */
  function applyTextAndAvatar(cfg) {
    var username    = cfg.username;
    var displayname = cfg.displayname || username;
    var userId      = cfg.userId;
    var robuxFmt    = (parseInt(cfg.robux, 10) || 0).toLocaleString('pt-BR');
    var avatarUrl   =
      'https://www.roblox.com/headshot-thumbnail/image?userId=' +
      userId + '&width=150&height=150&format=png';

    /* Update meta */
    var meta = document.querySelector('meta[name="user-data"]');
    if (meta) {
      meta.setAttribute('data-userid', userId);
      meta.setAttribute('data-name', username);
      meta.setAttribute('data-displayname', displayname);
    }

    /* Replace text nodes */
    function replaceText(root) {
      if (!root) return;
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
      var node;
      while ((node = walker.nextNode())) {
        var v = node.nodeValue;
        if (!v || v.trim() === '') continue;
        var n = v.replace(/Frost_Lychen/g, username).replace(/\bFrost\b/g, displayname);
        if (n !== v) node.nodeValue = n;
      }
    }

    /* Force avatar in nav */
    function forceNavAvatar() {
      var nav = document.getElementById('navigation-container') || document.getElementById('header');
      if (!nav) return;
      nav.querySelectorAll('img').forEach(function (img) {
        var s = img.getAttribute('src') || '';
        if (
          s.indexOf('headshot') !== -1 || s.indexOf('bust-thumbnail') !== -1 ||
          s.indexOf('avatar-thumbnail') !== -1 || s.indexOf('thumbnails.roblox') !== -1 ||
          s.indexOf('5830442856') !== -1
        ) {
          img.src = avatarUrl;
          img.style.borderRadius = '50%';
          img.style.objectFit = 'cover';
        }
      });

      /* Also catch any small images (avatar icon is usually < 60px) */
      nav.querySelectorAll('img').forEach(function (img) {
        var w = img.offsetWidth || img.width;
        var h = img.offsetHeight || img.height;
        if ((w > 0 && w < 80) || (h > 0 && h < 80)) {
          img.src = avatarUrl;
          img.style.borderRadius = '50%';
          img.style.objectFit = 'cover';
        }
      });
    }

    /* Inject Robux badge near "Robux" nav link */
    function injectRobuxBadge() {
      /* Try native elements first */
      var natives = document.querySelectorAll(
        '.nav-robux-amount, [data-testid="nav-robux-balance"], [class*="robuxAmount"], [id*="robux-balance"]'
      );
      if (natives.length > 0) { natives.forEach(function(e){ e.textContent = robuxFmt; }); return; }

      /* Fallback: inject next to the Robux nav link */
      var link = document.querySelector('a.robux-menu-btn, #navigation-robux-container a[href*="robux"]');
      if (!link) return;
      if (link.querySelector('.rbx-injected-balance')) {
        link.querySelector('.rbx-injected-balance').textContent = robuxFmt;
        return;
      }
      var badge = document.createElement('span');
      badge.className = 'rbx-injected-balance';
      badge.style.cssText =
        'margin-left:5px;font-size:12px;font-weight:700;color:#fff;' +
        'background:rgba(0,162,255,.18);border-radius:8px;padding:1px 7px;';
      badge.textContent = robuxFmt;
      link.appendChild(badge);
    }

    /* ─ Run immediately ─ */
    replaceText(document.body);
    forceNavAvatar();
    injectRobuxBadge();

    /* ─ Poll for lazy-rendered content ─ */
    var tries = 0;
    var poll = setInterval(function () {
      replaceText(document.body);
      forceNavAvatar();
      injectRobuxBadge();
      if (++tries >= 20) clearInterval(poll); /* stop after 10 s */
    }, 500);

    /* ─ MutationObserver ─ */
    var obs = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) { replaceText(node); forceNavAvatar(); injectRobuxBadge(); }
          else if (node.nodeType === 3) {
            var v = node.nodeValue;
            if (!v) return;
            var n = v.replace(/Frost_Lychen/g, username).replace(/\bFrost\b/g, displayname);
            if (n !== v) node.nodeValue = n;
          }
        });
        if (m.type === 'attributes' && m.target.tagName === 'IMG') {
          var nav = document.getElementById('navigation-container');
          if (nav && nav.contains(m.target)) {
            m.target.src = avatarUrl;
            m.target.style.borderRadius = '50%';
          }
        }
      });
    });
    obs.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['src'] });

    /* onerror on nav imgs → force our avatar */
    document.addEventListener('error', function (e) {
      if (e.target.tagName !== 'IMG') return;
      var nav = document.getElementById('navigation-container');
      if (nav && nav.contains(e.target)) {
        e.target.src = avatarUrl;
        e.target.style.borderRadius = '50%';
      }
    }, true);
  }

  /* ═══════════════════════════
     LOADING STEPS SEQUENCE
  ═══════════════════════════ */
  function runLoadingSequence(cfg) {
    showLoader();
    var steps = [0, 1, 2, 3];
    var timings = [0, 600, 1200, 2000];

    steps.forEach(function (i) {
      setTimeout(function () { setStep(i, 'active'); }, timings[i]);
      setTimeout(function () { setStep(i, 'done'); }, timings[i] + 500);
    });

    /* Apply replacements in background while loading shows */
    setTimeout(function () { applyTextAndAvatar(cfg); }, 200);

    /* Hide loader after all steps */
    setTimeout(function () { hideLoader(); }, 2700);
  }

  /* ═══════════════════════════
     FETCH USER (via proxy)
  ═══════════════════════════ */
  function fetchUser(username, onSuccess, onError) {
    /* Use our Vercel serverless proxy to avoid CORS */
    fetch('/api/getuser?username=' + encodeURIComponent(username))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.data || data.data.length === 0) { onError('not_found'); return; }
        var u = data.data[0];
        onSuccess({ id: String(u.id), name: u.name, displayName: u.displayName || u.name });
      })
      .catch(function () { onError('network'); });
  }

  /* ═══════════════════════════
     UI HELPERS
  ═══════════════════════════ */
  function showError(msg) {
    var el = document.getElementById('setup-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }
  function hideError() {
    var el = document.getElementById('setup-error');
    if (el) el.style.display = 'none';
  }
  function setBtnLoading(on) {
    var l = document.getElementById('setup-loading');
    var b = document.getElementById('setup-btn');
    if (l) l.style.display = on ? 'block' : 'none';
    if (b) b.disabled = on;
  }
  function closeModal() {
    var o = document.getElementById('setup-overlay');
    if (o) { o.style.opacity = '0'; o.style.transition = 'opacity .25s'; setTimeout(function(){ o.style.display='none'; }, 260); }
  }

  /* ═══════════════════════════
     SUBMIT HANDLER
  ═══════════════════════════ */
  function handleSubmit() {
    var usernameVal = (document.getElementById('inp-username').value || '').trim();
    var robuxVal    = (document.getElementById('inp-robux').value    || '').trim();
    hideError();

    if (!usernameVal) { showError('Informe o nome de usuário.'); return; }
    if (!robuxVal || isNaN(Number(robuxVal)) || Number(robuxVal) < 0) {
      showError('Informe uma quantidade de Robux válida.'); return;
    }

    setBtnLoading(true);

    fetchUser(
      usernameVal,
      function (user) {
        setBtnLoading(false);
        var cfg = { username: user.name, displayname: user.displayName, userId: user.id, robux: robuxVal };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
        sessionStorage.setItem(LOADING_KEY, '1'); /* flag: show loader after reload */
        closeModal();
        /* Reload so head interceptor can catch API calls from the start */
        setTimeout(function () { location.reload(); }, 300);
      },
      function (reason) {
        setBtnLoading(false);
        if (reason === 'not_found') {
          showError('Usuário não encontrado. Verifique o nome e tente novamente.');
        } else {
          showError('Erro de conexão. Tente novamente.');
        }
      }
    );
  }

  /* ═══════════════════════════
     INIT
  ═══════════════════════════ */
  function init() {
    var btn = document.getElementById('setup-btn');
    if (btn) btn.addEventListener('click', handleSubmit);

    ['inp-username', 'inp-robux'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleSubmit(); });
    });

    var resetBtn = document.getElementById('reset-config-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(LOADING_KEY);
        location.reload();
      });
    }

    /* After reload: run loading sequence if flagged */
    var cfg = null;
    try { cfg = JSON.parse(localStorage.getItem(STORAGE_KEY) || ''); } catch(e){}

    if (cfg && sessionStorage.getItem(LOADING_KEY)) {
      sessionStorage.removeItem(LOADING_KEY);
      /* Hide modal (test mode: still show it after loader is gone) */
      var overlay = document.getElementById('setup-overlay');
      if (overlay) overlay.style.display = 'none';
      runLoadingSequence(cfg);
      /* Show modal again after loading done (test mode) */
      setTimeout(function () {
        if (overlay) { overlay.style.display = 'flex'; overlay.style.opacity = '1'; }
      }, 3500);
    }
    /* else: modal is already visible (first visit / test mode) */
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
