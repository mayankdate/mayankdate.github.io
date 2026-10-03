// Light / dark theme toggle. Three states: auto (OS), light, dark.
// Cycle: auto -> light -> dark -> auto.
(function () {
  var root = document.documentElement;
  var btn = document.querySelector('.theme-toggle');
  if (!btn) return;

  function current() {
    try { return localStorage.getItem('theme') || 'auto'; } catch (e) { return 'auto'; }
  }
  function apply(t) {
    if (t === 'auto') root.setAttribute('data-theme', 'auto');
    else root.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch (e) {}
  }
  function next(t) {
    return t === 'auto' ? 'light' : t === 'light' ? 'dark' : 'auto';
  }

  // Make sure initial state matches storage
  apply(current());

  btn.addEventListener('click', function () {
    apply(next(current()));
  });
})();
