// server-only is a build-time marker with no runtime API. In tests it is a
// no-op so a module that imports it can be exercised outside an RSC render.
export {};
