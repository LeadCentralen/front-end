// Minimal router: registrerar (metod, sökväg) → controller-funktion.
export class Router {
  constructor() {
    this.routes = [];
  }
  add(method, path, handler, opts = {}) {
    const keys = [];
    const re = new RegExp('^' + path.replace(/:([a-zA-Z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    this.routes.push({ method, re, keys, handler, opts });
  }
  get(path, handler, opts) { this.add('GET', path, handler, opts); }
  post(path, handler, opts) { this.add('POST', path, handler, opts); }
  patch(path, handler, opts) { this.add('PATCH', path, handler, opts); }
  delete(path, handler, opts) { this.add('DELETE', path, handler, opts); }

  // Första träffen vinner, så specifika sökvägar (t.ex. /export.csv) registreras före /:id.
  match(method, pathname) {
    for (const r of this.routes) {
      if (r.method !== method) continue;
      const m = r.re.exec(pathname);
      if (m) {
        const params = {};
        try {
          r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
        } catch {
          return null; // ogiltig %-kodning → 404 i stället för 500
        }
        return { route: r, params };
      }
    }
    return null;
  }
}
