(function () {
  'use strict';

  var STORAGE_KEY = 'rbx_page_config';

  /* ═══════════════════════════════════
     APLICAR config na página
  ═══════════════════════════════════ */
  function applyConfig(cfg) {
    var username  = cfg.username;
    var dispname  = cfg.displayname || username;
    var userId    = cfg.userId;
    var robuxFmt  = (parseInt(cfg.robux, 10) || 0).toLocaleString('en-US');
    var avatarUrl = 'https://www.roblox.com/headshot-thumbnail/image?userId='
                    + userId + '&width=150&height=150&format=png';

    /* 1 ─ Atualiza meta user-data */
    var meta = document.querySelector('meta[name="user-data"]');
    if (meta) {
      meta.setAttribute('data-userid',      userId);
      meta.setAttribute('data-name',        username);
      meta.setAttribute('data-displayname', dispname);
    }

    /* 2 ─ Avatar: seletor exato encontrado no HTML estático */
    function replaceAvatar() {
      /* Seletor principal: .avatar-card-image img */
      document.querySelectorAll('.avatar-card-image img').forEach(function (img) {
        img.src = avatarUrl;
        img.alt = username;
        img.style.borderRadius = '50%';
        img.style.objectFit   = 'cover';
        img.removeAttribute('srcset');
      });
      /* Fallback: img com alt do usuário antigo */
      document.querySelectorAll('img[alt="Frost_Lychen"], img[alt="Frost"]').forEach(function (img) {
        img.src = avatarUrl;
        img.alt = username;
        img.style.borderRadius = '50%';
        img.removeAttribute('srcset');
      });
    }

    /* 3 ─ Robux: id="nav-robux-amount" existe no HTML estático com valor "73" */
    function replaceRobux() {
      var el = document.getElementById('nav-robux-amount');
      if (el) el.textContent = robuxFmt;

      /* Atualiza aria-label do botão (ex: "Robux: 73") */
      var btn = document.querySelector('[aria-label^="Robux:"]');
      if (btn) btn.setAttribute('aria-label', 'Robux: ' + robuxFmt);
    }

    /* 4 ─ Links de perfil com userId antigo */
    function replaceLinks() {
      document.querySelectorAll('a[href*="5830442856"]').forEach(function (a) {
        a.href = a.href.replace(/5830442856/g, userId);
      });
    }

    /* 5 ─ Textos: Frost_Lychen → username, Frost → dispname */
    function replaceText(root) {
      if (!root) return;
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
      var node;
      while ((node = walker.nextNode())) {
        var v = node.nodeValue;
        if (!v || !v.trim()) continue;
        var n = v.replace(/Frost_Lychen/g, username).replace(/\bFrost\b/g, dispname);
        if (n !== v) node.nodeValue = n;
      }
    }

    function applyAll() {
      replaceAvatar();
      replaceRobux();
      replaceLinks();
      replaceText(document.body);
    }

    applyAll();

    /* Polling por 10 s (cobre conteúdo renderizado com atraso) */
    var n = 0;
    var poll = setInterval(function () {
      applyAll();
      if (++n >= 20) clearInterval(poll);
    }, 500);

    /* MutationObserver: captura nós adicionados dinamicamente */
    var obs = new MutationObserver(function () { applyAll(); });
    obs.observe(document.body, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['src', 'alt']
    });
  }

  /* ═══════════════════════════════════
     OVERLAY "Aplicando..."
  ═══════════════════════════════════ */
  function showLoader() {
    var el = document.getElementById('page-loading-overlay');
    if (el) { el.style.opacity = '1'; el.classList.add('active'); }
  }
  function hideLoader() {
    var el = document.getElementById('page-loading-overlay');
    if (!el) return;
    el.style.transition = 'opacity .5s';
    el.style.opacity = '0';
    setTimeout(function () { el.classList.remove('active'); el.style.opacity = ''; }, 550);
  }

  /* ═══════════════════════════════════
     BUSCAR userId via proxy Vercel
  ═══════════════════════════════════ */
  function fetchUserId(username, onSuccess, onError) {
    fetch('/api/getuser?username=' + encodeURIComponent(username))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.data || !data.data.length) { onError('not_found'); return; }
        var u = data.data[0];
        onSuccess({ id: String(u.id), name: u.name, displayName: u.displayName || u.name });
      })
      .catch(function () { onError('network'); });
  }

  /* ═══════════════════════════════════
     UI HELPERS
  ═══════════════════════════════════ */
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
    if (o) {
      o.style.transition = 'opacity .25s';
      o.style.opacity = '0';
      setTimeout(function () { o.style.display = 'none'; }, 260);
    }
  }

  /* ═══════════════════════════════════
     SUBMIT
  ═══════════════════════════════════ */
  function handleSubmit() {
    var usernameVal = (document.getElementById('inp-username').value || '').trim();
    var robuxVal    = (document.getElementById('inp-robux').value    || '').trim();
    hideError();

    if (!usernameVal) { showError('Informe o nome de usuário.'); return; }
    if (robuxVal === '' || isNaN(Number(robuxVal)) || Number(robuxVal) < 0) {
      showError('Informe uma quantidade de Robux válida.'); return;
    }

    setBtnLoading(true);

    fetchUserId(usernameVal,
      function (user) {
        setBtnLoading(false);
        var cfg = {
          username:    user.name,
          displayname: user.displayName,
          userId:      user.id,
          robux:       robuxVal
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
        closeModal();
        showLoader();
        setTimeout(function () {
          applyConfig(cfg);
          setTimeout(hideLoader, 2000);
        }, 300);
      },
      function (reason) {
        setBtnLoading(false);
        if (reason === 'not_found') {
          showError('Usuário não encontrado. Verifique o nome.');
        } else {
          showError('Erro ao buscar usuário. Tente novamente.');
        }
      }
    );
  }

  /* ═══════════════════════════════════
     INIT
  ═══════════════════════════════════ */
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
        location.reload();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
