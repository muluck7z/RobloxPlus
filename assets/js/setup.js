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
    var robux     = (parseInt(cfg.robux, 10) || 0).toLocaleString('pt-BR');
    var avatarUrl = 'https://www.roblox.com/headshot-thumbnail/image?userId='
                    + userId + '&width=150&height=150&format=png';

    /* 1 ─ Substitui textos na página */
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

    /* 2 ─ Substitui o avatar cinza no nav */
    function replaceAvatar() {
      var nav = document.getElementById('navigation-container')
             || document.getElementById('header')
             || document.body;

      /* Qualquer img pequena no nav = avatar */
      nav.querySelectorAll('img').forEach(function (img) {
        var src = img.getAttribute('src') || '';
        var w   = img.naturalWidth || img.offsetWidth || img.width;
        var h   = img.naturalHeight || img.offsetHeight || img.height;

        var isAvatar =
          src.indexOf('headshot') !== -1 ||
          src.indexOf('bust-thumbnail') !== -1 ||
          src.indexOf('avatar-thumbnail') !== -1 ||
          src.indexOf('thumbnails.roblox') !== -1 ||
          src.indexOf('5830442856') !== -1 ||
          (w > 0 && w < 80) || (h > 0 && h < 80) ||
          src === '';   /* img vazia = placeholder do avatar */

        if (isAvatar) {
          img.src = avatarUrl;
          img.style.borderRadius = '50%';
          img.style.objectFit   = 'cover';
          img.removeAttribute('srcset');
        }
      });
    }

    /* 3 ─ Injeta saldo de Robux ao lado do link "Robux" */
    function injectRobux() {
      /* Tenta seletores nativos primeiro */
      var natives = document.querySelectorAll(
        '.nav-robux-amount, [data-testid*="robux"], [class*="robuxAmount"], [id*="robux-balance"]'
      );
      if (natives.length) { natives.forEach(function(e){ e.textContent = robux; }); }

      /* Fallback: badge colado ao link "Robux" do nav */
      var link = document.querySelector(
        'a.robux-menu-btn, #navigation-robux-container a, a[href*="upgrades/robux"]'
      );
      if (!link) return;

      var existing = document.getElementById('rbx-injected-robux');
      if (existing) { existing.textContent = robux; return; }

      var badge = document.createElement('span');
      badge.id = 'rbx-injected-robux';
      badge.style.cssText =
        'font-size:12px;font-weight:700;color:#fff;margin-left:5px;' +
        'background:rgba(0,162,255,.2);border-radius:8px;padding:1px 8px;' +
        'vertical-align:middle;pointer-events:none;';
      badge.textContent = robux;
      link.appendChild(badge);
    }

    /* ─ Executa tudo imediatamente ─ */
    replaceText(document.body);
    replaceAvatar();
    injectRobux();

    /* ─ Polling por 12 s para conteúdo dinâmico ─ */
    var n = 0;
    var poll = setInterval(function () {
      replaceText(document.body);
      replaceAvatar();
      injectRobux();
      if (++n >= 24) clearInterval(poll);
    }, 500);

    /* ─ MutationObserver ─ */
    var obs = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) { replaceText(node); replaceAvatar(); injectRobux(); }
          else if (node.nodeType === 3) {
            var v = node.nodeValue;
            if (!v) return;
            var n2 = v.replace(/Frost_Lychen/g, username).replace(/\bFrost\b/g, dispname);
            if (n2 !== v) node.nodeValue = n2;
          }
        });
        /* Intercepta src sendo setado por scripts externos */
        if (m.type === 'attributes' && m.target.tagName === 'IMG') {
          var nav = document.getElementById('navigation-container');
          if (nav && nav.contains(m.target)) {
            m.target.src = avatarUrl;
            m.target.style.borderRadius = '50%';
          }
        }
      });
    });
    obs.observe(document.body, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['src']
    });

    /* onerror: se qualquer img no nav falhar, força o avatar */
    document.addEventListener('error', function (e) {
      if (e.target.tagName !== 'IMG') return;
      var nav = document.getElementById('navigation-container');
      if (nav && nav.contains(e.target)) {
        e.target.src = avatarUrl;
        e.target.style.borderRadius = '50%';
      }
    }, true);
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
    if (o) { o.style.transition = 'opacity .25s'; o.style.opacity = '0';
             setTimeout(function(){ o.style.display = 'none'; }, 260); }
  }
  function reopenModal() {
    var o = document.getElementById('setup-overlay');
    if (o) { o.style.display = 'flex'; o.style.opacity = '0';
             setTimeout(function(){ o.style.transition='opacity .3s'; o.style.opacity='1'; }, 30); }
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

        /* Mostra overlay "Aplicando..." */
        showLoader();
        setTimeout(function () {
          applyConfig(cfg);
          /* Esconde após 2.5 s e reabre modal (modo teste) */
          setTimeout(function () {
            hideLoader();
            setTimeout(reopenModal, 700);
          }, 2500);
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

    /* Modo teste: modal sempre aparece — não carrega config automaticamente */
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
