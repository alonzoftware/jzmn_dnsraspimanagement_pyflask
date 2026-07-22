# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A Flask web dashboard for managing a BIND9 DNS server running on a Raspberry Pi. It exposes system health metrics, DNS query statistics, cache management, RPZ (Response Policy Zone) rule editing, DNS resolver benchmarking, and internet connectivity checks. All features are available with simulated data when BIND9 is not running.

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
- **`application/`** — `AuthenticateUserUseCase` (plain-text password comparison; not hashed by design for now), `interfaces.py` (abstract repository), `services.py` (all business logic: system health, DNS metrics, cache, RPZ, internet checks, resolver benchmarking).
- **`infrastructure/`** — `SQLiteUserRepository` wrapping `dns_raspi.db`. Schema migrations are done via `ALTER TABLE ... ADD COLUMN` with a silent catch on `OperationalError`.
- **`presentation/`** — Three Flask blueprints:
  - `routes.py` (`auth_bp`) — login/logout at `/`
  - `dashboard_routes.py` (`dashboard_bp`) — page routes + user CRUD API at `/api/users`
  - `api_routes.py` (`api_bp`, prefix `/api`) — health, DNS stats, top talkers, cache ops, RPZ rules, resolver benchmark

Dependency injection happens in `app.py`: the repository and use case are wired together there before blueprints are registered.

## Key external dependencies

| Dependency | Purpose |
|---|---|
| `systemctl is-active bind9/named` | BIND status checks |
| `rndc flush / flushname / dumpdb / reload` | Cache and zone management (requires `sudo -n`) |
| `named-checkzone` | Zone file validation before saving RPZ rules |
| `/sys/class/thermal/thermal_zone0/temp` | Pi CPU temperature (falls back to random if absent) |
| `http://127.0.0.1:8053/json` | BIND stats channel (real DNS metrics mode) |
| `/var/lib/bind/rpz.localhost.zone` | RPZ zone file (read/write) |
| `/var/log/bind/queries.log` | Real top-talkers log parsing |
| `/var/cache/bind/named_dump.db` | Cache dump file |

## Important caveats

- Passwords are stored and compared in plain text (`password_hash` field is misnamed). This is a known limitation documented in code comments.
- `SECRET_KEY` defaults to `dev_secret_key` if the env var is absent — always set it in production.
- The `admin` user cannot be deleted and is auto-created/upgraded to `sadmin` on startup.
- DNS metrics have a `source` parameter (`simulated` or `real`). Simulated mode generates random data when BIND is active; real mode reads from the stats channel.
- RPZ rules are deduplicated on both read and write to handle pre-existing duplicates in the zone file.
