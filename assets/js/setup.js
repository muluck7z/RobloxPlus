(function () {
  'use strict';

  var STORAGE_KEY = 'rbx_page_config';

  /* ═══════════════════════════════════════════
     LOADING OVERLAY — etapas visuais
  ═══════════════════════════════════════════ */
  function showPageLoader() {
    var el = document.getElementById('page-loading-overlay');
    if (el) el.classList.add('active');
  }

  function hidePageLoader() {
    var el = document.getElementById('page-loading-overlay');
    if (!el) return;
    el.classList.add('fade-out');
    setTimeout(function () {
      el.classList.remove('active');
      el.classList.remove('fade-out');
    }, 550);
  }

  function setStep(index, state) {
    /* state: 'active' | 'done' */
    var steps = document.querySelectorAll('.plo-step');
    if (steps[index]) {
      steps[index].classList.remove('active', 'done');
      steps[index].classList.add(state);
    }
  }

  /* ═══════════════════════════════════════════
     APPLY CONFIG
  ═══════════════════════════════════════════ */
  function applyConfig(cfg, onDone) {
    var username    = cfg.username;
    var displayname = cfg.displayname || username;
    var userId      = cfg.userId;
    var robuxRaw    = parseInt(cfg.robux, 10) || 0;
    var robuxFmt    = robuxRaw.toLocaleString('pt-BR');
    var avatarUrl   =
      'https://www.roblox.com/headshot-thumbnail/image?userId=' +
      userId + '&width=150&height=150&format=png';

    /* ── Etapa 1: atualiza meta e substitui textos ── */
    setStep(0, 'active');

    var meta = document.querySelector('meta[name="user-data"]');
    if (meta) {
      meta.setAttribute('data-userid', userId);
      meta.setAttribute('data-name', username);
      meta.setAttribute('data-displayname', displayname);
    }

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

    replaceText(document.body);

    setTimeout(function () {
      setStep(0, 'done');

      /* ── Etapa 2: substitui avatar ── */
      setStep(1, 'active');

      function replaceNavAvatar() {
        var nav = document.getElementById('navigation-container') ||
                  document.getElementById('header');
        if (!nav) return false;
        var imgs = nav.querySelectorAll('img');
        if (imgs.length === 0) return false;

        imgs.forEach(function (img) {
          var src = img.getAttribute('src') || img.src || '';
          var isThumb = src.indexOf('headshot') !== -1 ||
                        src.indexOf('bust-thumbnail') !== -1 ||
                        src.indexOf('avatar-thumbnail') !== -1 ||
                        src.indexOf('thumbnails.roblox') !== -1 ||
                        src.indexOf('5830442856') !== -1;
          var isSmall = (img.offsetWidth < 80) || (img.width < 80) ||
                        (img.offsetHeight < 80) || (img.height < 80);

          if (isThumb || isSmall) {
            img.src = avatarUrl;
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
          }
        });

        /* Imagens com userId antigo em qualquer lugar */
        document.querySelectorAll('img').forEach(function (img) {
          var s = img.getAttribute('src') || '';
          if (s.indexOf('5830442856') !== -1) {
            img.src = s.replace(/5830442856/g, userId);
          }
        });

        return true;
      }

      /* Tenta até o nav renderizar (máx 6 s) */
      var avatarTries = 0;
      function tryReplaceAvatar() {
        var ok = replaceNavAvatar();
        avatarTries++;
        if (!ok && avatarTries < 30) {
          setTimeout(tryReplaceAvatar, 200);
        } else {
          setStep(1, 'done');

          /* ── Etapa 3: injeta saldo de Robux ── */
          setStep(2, 'active');

          function injectRobuxBalance() {
            /* Seletores nativos do Roblox */
            var targets = document.querySelectorAll(
              '.nav-robux-amount, [data-testid="nav-robux-balance"], ' +
              '[class*="robuxAmount"], [id*="robux-balance"], ' +
              '.rbx-menu-item .robux-amount, .navbar-right .robux-amount'
            );
            if (targets.length > 0) {
              targets.forEach(function (el) { el.textContent = robuxFmt; });
              return true;
            }

            /* Fallback: badge ao lado do link "Robux" */
            var robuxLink = document.querySelector(
              'a[href*="upgrades/robux"], a.robux-menu-btn, ' +
              '#navigation-robux-container a'
            );
            if (!robuxLink) return false;

            if (robuxLink.parentElement.querySelector('.injected-robux-badge')) {
              robuxLink.parentElement.querySelector('.injected-robux-badge').textContent = robuxFmt;
              return true;
            }

            var badge = document.createElement('span');
            badge.className = 'injected-robux-badge';
            badge.style.cssText = [
              'display:inline-flex', 'align-items:center', 'gap:4px',
              'font-size:13px', 'font-weight:700', 'color:#fff',
              'margin-left:6px', 'white-space:nowrap',
              'background:rgba(0,0,0,0.35)', 'border-radius:10px',
              'padding:2px 8px'
            ].join(';');

            var robuxIcon = document.createElement('img');
            robuxIcon.src = 'https://images.rbxcdn.com/7a60e6e29fb3f9c3f6e5a4b8a3f6d0bc-Robux_Icon.png';
            robuxIcon.style.cssText = 'width:14px;height:14px;vertical-align:middle';
            robuxIcon.onerror = function () { this.style.display = 'none'; };

            var txt = document.createElement('span');
            txt.textContent = robuxFmt;

            badge.appendChild(robuxIcon);
            badge.appendChild(txt);
            robuxLink.parentElement.appendChild(badge);
            return true;
          }

          var robuxTries = 0;
          function tryInjectRobux() {
            var ok = injectRobuxBalance();
            robuxTries++;
            if (!ok && robuxTries < 20) {
              setTimeout(tryInjectRobux, 300);
            } else {
              setStep(2, 'done');

              /* ── Etapa 4: varredura final de textos ── */
              setStep(3, 'active');
              replaceText(document.body);
              setTimeout(function () {
                replaceText(document.body);
                setStep(3, 'done');

                /* ── Pronto: esconde loader ── */
                setTimeout(hidePageLoader, 400);

                /* Observer para conteúdo posterior */
                var observer = new MutationObserver(function (muts) {
                  muts.forEach(function (m) {
                    m.addedNodes.forEach(function (node) {
                      if (node.nodeType === 1) {
                        replaceText(node);
                        replaceNavAvatar();
                      } else if (node.nodeType === 3) {
                        var v = node.nodeValue;
                        if (!v) return;
                        var n = v
                          .replace(/Frost_Lychen/g, username)
                          .replace(/\bFrost\b/g, displayname);
                        if (n !== v) node.nodeValue = n;
                      }
                    });
                    if (m.type === 'attributes' && m.target.tagName === 'IMG') {
                      var img = m.target;
                      var nav = document.getElementById('navigation-container');
                      if (nav && nav.contains(img)) {
                        img.src = avatarUrl;
                        img.style.borderRadius = '50%';
                      }
                    }
                  });
                });
                observer.observe(document.body, {
                  childList: true, subtree: true,
                  attributes: true, attributeFilter: ['src']
                });

                /* Polling residual */
                [1000, 2500, 5000].forEach(function (ms) {
                  setTimeout(function () {
                    replaceText(document.body);
                    replaceNavAvatar();
                    injectRobuxBalance();
                  }, ms);
                });

                if (typeof onDone === 'function') onDone();

              }, 400);
            }
          }
          tryInjectRobux();
        }
      }
      tryReplaceAvatar();

    }, 300);

    /* onerror em imgs do nav */
    document.addEventListener('error', function (e) {
      if (e.target.tagName !== 'IMG') return;
      var nav = document.getElementById('navigation-container');
      if (nav && nav.contains(e.target)) {
        e.target.src = avatarUrl;
        e.target.style.borderRadius = '50%';
      }
    }, true);
  }

  /* ═══════════════════════════════════════════
     BUSCA usuário na API do Roblox
  ═══════════════════════════════════════════ */
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

  /* ═══════════════════════════════════════════
     UI helpers
  ═══════════════════════════════════════════ */
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
      overlay.style.transition = 'opacity 0.25s';
      setTimeout(function () { overlay.style.display = 'none'; }, 260);
    }
  }

  /* ═══════════════════════════════════════════
     SUBMIT
  ═══════════════════════════════════════════ */
  function handleSubmit() {
    var usernameVal = (document.getElementById('inp-username').value || '').trim();
    var robuxVal    = (document.getElementById('inp-robux').value    || '').trim();
    hideError();

    if (!usernameVal) { showError('Informe o nome de usuário.'); return; }
    if (!robuxVal || isNaN(Number(robuxVal)) || Number(robuxVal) < 0) {
      showError('Informe uma quantidade de Robux válida.'); return;
    }

    setLoading(true);

    fetchUser(
      usernameVal,
      function (user) {
        setLoading(false);
        var cfg = {
          username: user.name, displayname: user.displayName,
          userId: user.id, robux: robuxVal
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
        closeModal();
        setTimeout(function () {
          showPageLoader();
          applyConfig(cfg);
        }, 270);
      },
      function (reason) {
        setLoading(false);
        if (reason === 'not_found') {
          showError('Usuário não encontrado. Verifique o nome e tente novamente.');
        } else {
          var cfg = {
            username: usernameVal, displayname: usernameVal,
            userId: '5830442856', robux: robuxVal
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
          closeModal();
          setTimeout(function () {
            showPageLoader();
            applyConfig(cfg);
          }, 270);
        }
      }
    );
  }

  /* ═══════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════ */
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

    /* MODO TESTE: modal sempre aparece ao recarregar */
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
