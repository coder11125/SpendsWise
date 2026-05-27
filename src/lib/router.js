let _path = $state('/');
let _initialized = false;

function currentPath() {
  let p = window.location.pathname.replace(/\/+$/, '') || '/';
  return p === '/dashboard' ? '/' : p;
}

export function initRouter() {
  if (_initialized) return;
  _path = currentPath();
  window.addEventListener('popstate', () => { _path = currentPath(); });
  _initialized = true;
}

export function getRoute() {
  return _path;
}

export function navigate(path) {
  history.pushState({}, '', path);
  _path = path;
}

export function viewFromRoute() {
  const route = _path.replace(/^\//, '') || 'dashboard';
  const valid = ['dashboard', 'income', 'expense', 'history', 'account'];
  return valid.includes(route) ? route : 'dashboard';
}
