(function () {
  'use strict';

  var STORAGE_KEY = 'rbx_page_config';
  var cfg = null;

  /* ════════════════════════════════════════
     APPLY  ─  chamado após carregar o config
  ════════════════════════════════════════ */
  function applyConfig(c) {
    cfg = c;
    var username    = c.username;
    var displayname = c.displayname || username;
    var userId      = c.userId;
    var robuxRaw    = parseInt(c.robux, 10) || 0;
    var robuxFmt    = robuxRaw.toLocaleString('pt-BR');

    /* URL do avatar (headshot público do Roblox, sem auth) */
    var avatarUrl =
      'https://www.roblox.com/headshot-thumbnail/image?userId=' +
      userId + '&width=150&height=150&format=png';

    /* ── 1. Atualiza meta user-data ── */
    var meta = document.querySelector('meta[name="user-data"]');
    if (meta) {
      meta.setAttribute('data-userid', userId);
      meta.setAttribute('data-name', username);
      meta.setAttribute('data-displayname', displayname);
    }

    /* ── 2. Substitui texto "Frost_Lychen" / "Frost" ── */
    function replaceText(root) {
      if (!root) return;
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
      var node;
      while ((node = walker.nextNode())) {
        var v = node.nodeValue;
        if (!v) continue;
        var n = v
          .replace(/Frost_Lychen/g, username)
          .replace(/\bFrost\b/g, displayname);
        if (n !== v) node.nodeValue = n;
      }
    }

    /* ── 3. Substitui QUALQUER imagem de avatar no nav ── */
    function replaceNavAvatar() {
      var nav = document.getElementById('navigation-container') || document.getElementById('header');
      if (!nav) return;

      nav.querySelectorAll('img').forEach(function (img) {
        /* Força nosso avatar em qualquer img do nav que: seja pequena (avatar),
           tenha src de thumbnail, ou src vazio/gray  */
        var src = img.getAttribute('src') || img.src || '';
        var isThumb = src.indexOf('headshot') !== -1 ||
                      src.indexOf('bust-thumbnail') !== -1 ||
                      src.indexOf('avatar-thumbnail') !== -1 ||
                      src.indexOf('thumbnails.roblox') !== -1 ||
                      src.indexOf('5830442856') !== -1;
        var isSmall = img.offsetWidth  < 80 || img.width  < 80 ||
                      img.offsetHeight < 80 || img.height < 80;
        var isEmpty = !src || src === '' || src.indexOf('data:') === 0;

        if (isThumb || (isSmall && isEmpty)) {
          img.src = avatarUrl;
          img.style.borderRadius = '50%';
        }
      });

      /* Também força via background-image em qualquer elemento com estilo inline */
      nav.querySelectorAll('[style*="5830442856"]').forEach(function (el) {
        el.style.backgroundImage = 'url(' + avatarUrl + ')';
      });
    }

    /* ── 4. Injeta saldo de Robux no nav ── */
    function injectRobuxBalance() {
      /* Tenta primeiro os seletores "naturais" do Roblox */
      var targets = document.querySelectorAll(
        '.nav-robux-amount, [data-testid="nav-robux-balance"], ' +
        '[class*="robuxAmount"], [id*="robux-balance"], ' +
        '.rbx-menu-item .robux-amount, .navbar-right .robux-amount'
      );

      if (targets.length > 0) {
        targets.forEach(function (el) { el.textContent = robuxFmt; });
        return;
      }

      /* Se não encontrou, injeta manualmente próximo ao link "Robux" */
      var robuxLink = document.querySelector(
        'a[href*="upgrades/robux"], a.robux-menu-btn, #navigation-robux-container a'
      );
      if (robuxLink) {
        /* Evita duplicar */
        if (robuxLink.parentElement.querySelector('.injected-robux-badge')) return;

        var badge = document.createElement('span');
        badge.className = 'injected-robux-badge';
        badge.textContent = robuxFmt;
        badge.style.cssText = [
          'display:inline-flex',
          'align-items:center',
          'gap:3px',
          'font-size:13px',
          'font-weight:700',
          'color:#fff',
          'margin-left:4px',
          'white-space:nowrap'
        ].join(';');

        /* Ícone R$ */
        var icon = document.createElement('span');
        icon.style.cssText = 'display:inline-block;width:14px;height:14px;' +
          'background:url(https://static.rbxcdn.com/images/icon-robux-white.png) center/contain no-repeat';
        badge.insertBefore(icon, badge.firstChild);

        robuxLink.parentElement.appendChild(badge);
      }
    }

    /* ── 5. Força avatar em TODAS as imgs da página com userId antigo ── */
    function replaceAllOldAvatar() {
      document.querySelectorAll('img').forEach(function (img) {
        var src = img.getAttribute('src') || '';
        if (src.indexOf('5830442856') !== -1) {
          img.src = src.replace(/5830442856/g, userId);
        }
        if (
          src.indexOf('headshot-thumbnail') !== -1 ||
          src.indexOf('bust-thumbnail') !== -1 ||
          (src.indexOf('avatar-thumbnail') !== -1 && src.indexOf('5830442856') !== -1)
        ) {
          img.src = avatarUrl;
        }
      });
    }

    /* ── 6. Executa ── */
    function runAll() {
      replaceText(document.body);
      replaceNavAvatar();
      replaceAllOldAvatar();
      injectRobuxBalance();
    }

    runAll();

    /* ── 7. MutationObserver para conteúdo dinâmico ── */
    var observer = new MutationObserver(function (mutations) {
      var needsRun = false;
      mutations.forEach(function (m) {
        if (m.addedNodes.length > 0) needsRun = true;
        if (m.type === 'attributes' && m.target.tagName === 'IMG') {
          /* Intercepta src sendo setado no avatar do nav */
          var img = m.target;
          var src = img.getAttribute('src') || '';
          if (src.indexOf('5830442856') !== -1 || src.indexOf('headshot-thumbnail') !== -1) {
            img.src = avatarUrl;
          }
          /* Avatar vazio/gray no nav */
          var nav = document.getElementById('navigation-container');
          if (nav && nav.contains(img) && (!src || src.indexOf('data:image') !== -1)) {
            img.src = avatarUrl;
          }
        }
      });
      if (needsRun) runAll();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'style']
    });

    /* ── 8. Polling nos primeiros 8 segundos para conteúdo lazy ── */
    var delays = [200, 500, 1000, 1500, 2500, 4000, 6000, 8000];
    delays.forEach(function (ms) {
      setTimeout(runAll, ms);
    });

    /* ── 9. Fallback: onerror em imagens — tenta nosso avatar ── */
    document.addEventListener('error', function (e) {
      if (e.target.tagName !== 'IMG') return;
      var nav = document.getElementById('navigation-container');
      if (nav && nav.contains(e.target)) {
        e.target.src = avatarUrl;
      }
    }, true);
  }

  /* ════════════════════════════════════════
     BUSCA usuário na API do Roblox
  ════════════════════════════════════════ */
  function fetchUser(username, onSuccess, onError) {
    fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.data || data.data.length === 0) { onError('not_found'); return; }
        var u = data.data[0];
        onSuccess({ id: String(u.id), name: u.name, displayName: u.displayName || u.name });
      })
      .catch(function () { onError('network'); });
  }

  /* ════════════════════════════════════════
     UI helpers
  ════════════════════════════════════════ */
  function showError(msg) {
    var el = document.getElementById('setup-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }
  function hideError() {
    var el = document.getElementById('setup-error');
    if (el) el.style.display = 'none';
  }
  function setLoading(on) {
    var load = document.getElementById('setup-loading');
    var btn  = document.getElementById('setup-btn');
    if (load) load.style.display = on ? 'block' : 'none';
    if (btn)  btn.disabled = on;
  }
  function closeModal() {
    var overlay = document.getElementById('setup-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s';
      setTimeout(function () { overlay.style.display = 'none'; }, 300);
    }
  }

  /* ════════════════════════════════════════
     SUBMIT
  ════════════════════════════════════════ */
  function handleSubmit() {
    var usernameVal = (document.getElementById('inp-username').value || '').trim();
    var robuxVal    = (document.getElementById('inp-robux').value    || '').trim();

    hideError();

    if (!usernameVal) { showError('Informe o nome de usuário.'); return; }
    if (!robuxVal || isNaN(Number(robuxVal)) || Number(robuxVal) < 0) {
      showError('Informe uma quantidade de Robux válida.');
      return;
    }

    setLoading(true);

    fetchUser(
      usernameVal,
      function (user) {
        setLoading(false);
        var c = {
          username:    user.name,
          displayname: user.displayName,
          userId:      user.id,
          robux:       robuxVal
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
        closeModal();
        applyConfig(c);
      },
      function (reason) {
        setLoading(false);
        if (reason === 'not_found') {
          showError('Usuário não encontrado. Verifique o nome e tente novamente.');
        } else {
          /* Fallback sem API */
          var c = {
            username:    usernameVal,
            displayname: usernameVal,
            userId:      '5830442856',
            robux:       robuxVal
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
          closeModal();
          applyConfig(c);
        }
      }
    );
  }

  /* ════════════════════════════════════════
     INIT
  ════════════════════════════════════════ */
  function init() {
    var btn = document.getElementById('setup-btn');
    if (btn) btn.addEventListener('click', handleSubmit);

    ['inp-username', 'inp-robux'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') handleSubmit();
      });
    });

    var resetBtn = document.getElementById('reset-config-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      });
    }

    /* MODO TESTE: modal sempre aparece ao recarregar a página */
    /* Para ativar salvamento automático, comente as linhas abaixo e
       descomente o bloco "Verifica config salva" */
    // var stored = localStorage.getItem(STORAGE_KEY);
    // if (stored) {
    //   try { closeModal(); applyConfig(JSON.parse(stored)); }
    //   catch (e) { localStorage.removeItem(STORAGE_KEY); }
    // }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
