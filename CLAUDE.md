# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A Flask web dashboard for managing a BIND9 DNS server running on a Raspberry Pi. It exposes system health metrics, DNS query statistics, cache management, RPZ (Response Policy Zone) rule editing, DNS resolver benchmarking, internet connectivity checks, and a DNSSEC Validation Explorer (chain-of-trust visualizer). The UI has a left sidebar and a client-side English/Spanish language switch. Most features fall back to simulated data when BIND9 is not running.

## Running the app

```bash
source venv/bin/activate
python app.py          # dev server (debug=True)
gunicorn app:app       # production
```

For debug
```bash
source venv/bin/activate
flask --app app --debug run -h 0.0.0.0 -p 8080
```
The app starts on `http://localhost:5000`. Default credentials: `admin` / `admin`.

## Running tests

```bash
source venv/bin/activate
python -m pytest test_dns.py test_dns2.py test_dns3.py rpz_test.py
```

## Architecture

The project follows Clean Architecture with four layers under `src/`:

- **`domain/`** — `User` dataclass (id, username, password_hash, is_active, role, last_login). Roles: `user`, `admin`, `sadmin`.
- **`application/`** — `AuthenticateUserUseCase` (plain-text password comparison; not hashed by design for now), `interfaces.py` (abstract repository), `services.py` (all business logic: system health, DNS metrics, cache, RPZ, internet checks, resolver benchmarking, DNSSEC validation).
- **`infrastructure/`** — `SQLiteUserRepository` wrapping `dns_raspi.db`. Schema migrations are done via `ALTER TABLE ... ADD COLUMN` with a silent catch on `OperationalError`.
- **`presentation/`** — Three Flask blueprints:
  - `routes.py` (`auth_bp`) — login/logout at `/`
  - `dashboard_routes.py` (`dashboard_bp`) — page routes + user CRUD API at `/api/users`
  - `api_routes.py` (`api_bp`, prefix `/api`) — health, DNS stats, top talkers, cache ops, RPZ rules, resolver benchmark, DNSSEC validation (`/api/dnssec/validate`)

Dependency injection happens in `app.py`: the repository and use case are wired together there before blueprints are registered.

## Key external dependencies

| Dependency | Purpose |
|---|---|
| `systemctl is-active bind9/named` | BIND status checks |
| `rndc flush / flushname / dumpdb / reload` | Cache and zone management (requires `sudo -n`) |
| `named-checkzone` | Zone file validation before saving RPZ rules |
| `delv` | BIND's DNSSEC validator — authoritative verdict + `+rtrace +vtrace` trace for the DNSSEC Explorer |
| `/sys/class/thermal/thermal_zone0/temp` | Pi CPU temperature (falls back to random if absent) |
| `http://127.0.0.1:8053/json` | BIND stats channel (real DNS metrics mode) |
| `/var/lib/bind/rpz.localhost.zone` | RPZ zone file (read/write) |
| `/var/log/bind/queries.log` | Real top-talkers log parsing |
| `/var/cache/bind/named_dump.db` | Cache dump file |

## Frontend / UI conventions

- **No template inheritance.** The navbar and Change-Password modal are copied verbatim into every dashboard page (`dashboard`, `top_talkers`, `check_internet`, `dns_cache`, `response_policy`, `dnssec`, `compare_performance`, `system_users`). Editing the nav means editing all 8 files identically — anchor edits on stable substrings like `<div class="nav-actions">` or `url_for('dashboard.compare_performance')`. `login.html` has no navbar.
- **Navigation is a fixed left sidebar** (`.navbar` in `dashboard.css`): brand header on top, links in the middle, user actions pinned to the bottom; `.dashboard-container` is offset with `margin-left: 260px`. On ≤900px it becomes an off-canvas drawer toggled by the burger button's `nav-open` class. Admin-only links (`DNS Cache`, `Response Policy`, `System Users`) are gated by `session.role` in the template.
- **i18n is client-side** (`static/js/i18n.js`, included with `defer` on every page). English is the source language living in the templates/JS; the engine translates to Spanish by matching normalized English text in DOM text nodes + `placeholder`/`title`/`aria-label` attributes, and a `MutationObserver` auto-translates JS-injected content (so the page scripts need no i18n calls). To add UI strings, add the exact English source → Spanish entry to `DICT.es`. Language persists in `localStorage` and switching reloads the page; `?lang=es` forces/persists a language. Dynamic strings composed server-side with interpolated values (e.g. `TLD Zone (.com)`) won't match and stay English.

## DNSSEC Validation Explorer

- Route `/dnssec` → `DnssecValidationService.validate(domain)`. Builds the 4-level Chain of Trust (Root → TLD → Domain → RRset) via low-level dnspython queries with the DO bit set, and wraps `delv` for the authoritative verdict.
- Status logic: `delv`'s verdict arbitrates. `SECURE` when AD flag set or delv reports "fully validated"; `BOGUS` only on a real validation failure or an unexplained SERVFAIL (not when delv says "unsigned answer"); otherwise `INSECURE`. This avoids false BOGUS on transient SERVFAILs.
- `dnssec.js` supports deep-linking: `?domain=example.com&run=1` prefills and auto-runs a validation.

## Important caveats

- Passwords are stored and compared in plain text (`password_hash` field is misnamed). This is a known limitation documented in code comments.
- `SECRET_KEY` defaults to `dev_secret_key` if the env var is absent — always set it in production.
- The `admin` user cannot be deleted and is auto-created/upgraded to `sadmin` on startup.
- DNS metrics have a `source` parameter (`simulated` or `real`). Simulated mode generates random data when BIND is active; real mode reads from the stats channel.
- RPZ rules are deduplicated on both read and write to handle pre-existing duplicates in the zone file.
