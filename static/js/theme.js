/*
 * Client-side theme switcher for DNS RasPi Management.
 *
 * Modes: 'system' (follow OS preference), 'light', 'dark'. The choice is
 * persisted in localStorage and applied by setting data-theme on <html>.
 * Dark is the source design (the bare :root variables), so data-theme="dark"
 * matches the default and data-theme="light" pulls in the light overrides.
 *
 * This file is loaded synchronously in <head> (no defer) so the theme is
 * applied before first paint — no flash of the wrong theme. The <select> in
 * the sidebar is wired up on DOMContentLoaded.
 */
(function () {
    'use strict';

    var STORAGE_KEY = "dnsraspi_theme";
    var mq = window.matchMedia("(prefers-color-scheme: dark)");

    // For a logged-in user the DB value (surfaced via window.__PREFS by the
    // server) is the source of truth; localStorage is a fallback/cache used
    // before login. getPref caches the DB value locally on read.
    function getPref() {
        if (window.__PREFS && window.__PREFS.auth && window.__PREFS.theme) {
            try { localStorage.setItem(STORAGE_KEY, window.__PREFS.theme); } catch (e) {}
            return window.__PREFS.theme;
        }
        try { return localStorage.getItem(STORAGE_KEY) || "system"; }
        catch (e) { return "system"; }
    }

    function setPref(pref) {
        try { localStorage.setItem(STORAGE_KEY, pref); } catch (e) {}
    }

    // Persist to the database when authenticated; no-op otherwise.
    function persist(pref) {
        if (!(window.__PREFS && window.__PREFS.auth)) return Promise.resolve();
        return fetch("/api/users/preferences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ theme: pref })
        }).catch(function () {});
    }

    function resolve(pref) {
        if (pref === "light" || pref === "dark") return pref;
        return mq.matches ? "dark" : "light";   // 'system'
    }

    function apply(pref) {
        document.documentElement.setAttribute("data-theme", resolve(pref));
    }

    // Apply immediately (runs during head parsing) to avoid a flash.
    apply(getPref());

    // When following the system, react live to OS light/dark changes.
    var onSystemChange = function () {
        if (getPref() === "system") apply("system");
    };
    if (mq.addEventListener) mq.addEventListener("change", onSystemChange);
    else if (mq.addListener) mq.addListener(onSystemChange);   // older browsers

    function wireSelector() {
        var sel = document.getElementById("themeSelect");
        if (!sel) return;
        sel.value = getPref();
        sel.addEventListener("change", function () {
            var val = sel.value;
            setPref(val);
            apply(val);
            // Save to the DB (if logged in), then reload so JS-rendered content
            // (e.g. Chart.js labels/grids that read theme colors at creation
            // time) is rebuilt for the new theme.
            persist(val).finally(function () { location.reload(); });
        });
    }

    // Expose for any script/console that wants to set the theme explicitly.
    window.THEME = { get: getPref, set: function (p) { setPref(p); apply(p); } };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", wireSelector);
    } else {
        wireSelector();
    }
})();
