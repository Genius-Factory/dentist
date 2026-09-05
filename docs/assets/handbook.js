(() => {
  'use strict';
  const search = document.getElementById('search');
  const chapters = [...document.querySelectorAll('.chapter')];
  const links = [...document.querySelectorAll('nav a')];
  const status = document.getElementById('search-status');
  const index = chapters.map((chapter) => ({ chapter, text: chapter.textContent.toLowerCase() }));
  const filter = () => {
    const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let count = 0;
    index.forEach(({ chapter, text }, position) => {
      const match = terms.every((term) => text.includes(term));
      chapter.hidden = !match;
      links[position].hidden = !match;
      if (match) count++;
    });
    status.textContent = terms.length ? `${count} of ${chapters.length} chapters match` : `${chapters.length} chapters · available offline`;
    document.getElementById('no-results').hidden = count !== 0;
  };
  search.addEventListener('input', filter);
  document.getElementById('clear-search').addEventListener('click', () => { search.value = ''; filter(); search.focus(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault(); search.focus();
    }
    if (event.key === 'Escape' && document.activeElement === search) { search.value = ''; filter(); }
  });
  // Reveal anchor targets even when a previous search hid their chapter.
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (target?.closest('.chapter')?.hidden) { search.value = ''; filter(); }
  });
  const revealHash = () => {
    const target = document.getElementById(location.hash.slice(1));
    if (target?.closest('.chapter')?.hidden) { search.value = ''; filter(); target.scrollIntoView(); }
  };
  window.addEventListener('hashchange', revealHash);

  const themeButton = document.getElementById('theme');
  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    themeButton.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
  };
  let preferredTheme;
  try { preferredTheme = localStorage.getItem('dentist-handbook-theme'); } catch { /* File URLs may deny storage. */ }
  applyTheme(preferredTheme === 'dark' ? 'dark' : 'light');
  themeButton.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('dentist-handbook-theme', next); } catch { /* Optional preference persistence. */ }
  });
  document.getElementById('print').addEventListener('click', () => window.print());

  document.querySelectorAll('.copy-button').forEach((button) => {
    button.addEventListener('click', async () => {
      const code = button.closest('.code-block').querySelector('pre code');
      try {
        await navigator.clipboard.writeText(code.textContent);
        button.textContent = 'Copied';
      } catch {
        // Clipboard can be blocked for local files; select text for manual copying.
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(code);
        selection.removeAllRanges();
        selection.addRange(range);
        button.textContent = 'Selected — use Ctrl/Cmd+C';
      }
      setTimeout(() => { button.textContent = 'Copy'; }, 2500);
    });
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        links.forEach((link) => {
          if (link.getAttribute('href') === `#${id}`) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-10% 0px -70% 0px' });
    chapters.forEach((chapter) => observer.observe(chapter.querySelector('h2')));
  }
})();
