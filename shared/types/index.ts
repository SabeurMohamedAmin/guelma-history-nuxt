// Intentionally avoid re-exporting leaf type names from this barrel.
// Nuxt auto-import scans `shared/types/*.ts`; re-exporting the same names here
// creates duplicate symbol warnings during dev/build.
//
// Keep this file only for future namespaced/grouped exports if needed.
export {}
