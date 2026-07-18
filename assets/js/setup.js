(function () {
  'use strict';

  var STORAGE_KEY = 'rbx_page_config';

  /* ── Apply config to the page ── */
  function applyConfig(cfg) {
    var username    = cfg.username;
    var displayname = cfg.displayname || username;
    var userId      = cfg.userId;
    var robuxRaw    = parseInt(cfg.robux, 10) || 0;
    var robuxFmt    = robuxRaw.toLocaleString('pt-BR');
    var avatarUrl   =
      'https://www.roblox.com/headshot-thumbnail/image?userId=' +
      userId + '&width=150&height=150&format=png';

    /* 1. Update meta user-data so Roblox scripts pick up the new values */
    var meta = document.querySelector('meta[name="user-data"]');
    if (meta) {
      meta.setAttribute('data-userid', userId);
      meta.setAttribute('data-name', username);
      meta.setAttribute('data-displayname', displayname);
    }

    /* 2. Replace text nodes */
    function replaceText(root) {
      if (!root) return;
      var walker = document.createTreeWalker(
        root, NodeFilter.SHOW_TEXT, null, false
      );
      var node;
      while ((node = walker.nextNode())) {
        var v = node.nodeValue;
        if (!v) continue;
        var n = v.replace(/Frost_Lychen/g, username).replace(/\bFrost\b/g, displayname);
        if (n !== v) node.nodeValue = n;
      }
    }

    /* 3. Replace avatar images */
    function replaceImages(root) {
      if (!root || !root.querySelectorAll) return;
      root.querySelectorAll('img').forEach(function (img) {
        var src = img.getAttribute('src') || '';
        if (
          src.indexOf('5830442856') !== -1 ||
          src.indexOf('headshot-thumbnail') !== -1 ||
          src.indexOf('avatar-thumbnail') !== -1
        ) {
          img.src = avatarUrl;
        }
      });
    }

    /* 4. Replace robux balance displays */
    function replaceRobux(root) {
      if (!root || !root.querySelectorAll) return;
      root.querySelectorAll(
        '.nav-robux-amount, [data-testid="nav-robux-balance"], ' +
        '.rbx-navbar .robux-amount, [class*="robuxAmount"], [id*="robux-balance"]'
      ).forEach(function (el) {
        el.textContent = robuxFmt;
      });
    }

    /* 5. Run on existing DOM */
    replaceText(document.body);
    replaceImages(document.body);
    replaceRobux(document.body);

    /* 6. Watch for dynamic content */
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) {
            replaceText(node);
            replaceImages(node);
            replaceRobux(node);
          } else if (node.nodeType === 3) {
            var v = node.nodeValue;
            if (!v) return;
            var n = v.replace(/Frost_Lychen/g, username).replace(/\bFrost\b/g, displayname);
            if (n !== v) node.nodeValue = n;
          }
        });
        if (
          m.type === 'attributes' &&
          m.target.tagName === 'IMG' &&
          m.target.parentElement
        ) {
          replaceImages(m.target.parentElement);
        }
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src']
    });

    /* 7. Re-run after delays for lazy content */
    [300, 800, 2000, 4000].forEach(function (ms) {
      setTimeout(function () {
        replaceText(document.body);
        replaceImages(document.body);
        replaceRobux(document.body);
      }, ms);
    });
  }

  /* ── Fetch user from Roblox API ── */
  function fetchUser(username, onSuccess, onError) {
    fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.data || data.data.length === 0) {
          onError('not_found');
          return;
        }
        var u = data.data[0];
        onSuccess({ id: String(u.id), name: u.name, displayName: u.displayName || u.name });
      })
      .catch(function () { onError('network'); });
  }

  /* ── UI helpers ── */
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

  /* ── Submit handler ── */
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
        var cfg = {
          username:    user.name,
          displayname: user.displayName,
          userId:      user.id,
          robux:       robuxVal
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
        closeModal();
        applyConfig(cfg);
      },
      function (reason) {
        setLoading(false);
        if (reason === 'not_found') {
          showError('Usuário não encontrado. Verifique o nome e tente novamente.');
        } else {
          /* Network / CORS fallback — use typed name, keep default avatar */
          var cfg = {
            username:    usernameVal,
            displayname: usernameVal,
            userId:      '5830442856',
            robux:       robuxVal
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
          closeModal();
          applyConfig(cfg);
        }
      }
    );
  }

  function closeModal() {
    var overlay = document.getElementById('setup-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  /* ── Init ── */
  function init() {
    /* Bind button */
    var btn = document.getElementById('setup-btn');
    if (btn) btn.addEventListener('click', handleSubmit);

    /* Enter key */
    ['inp-username', 'inp-robux'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') handleSubmit();
      });
    });

    /* Reset button */
    var resetBtn = document.getElementById('reset-config-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      });
    }

    /* Check localStorage */
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        var cfg = JSON.parse(stored);
        closeModal();
        applyConfig(cfg);
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
