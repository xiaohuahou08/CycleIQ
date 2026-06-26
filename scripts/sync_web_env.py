"""Copy shared env vars from backend/.env into apps/web/.env.local (never commit either file)."""

from __future__ import annotations

from pathlib import Path

from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]
BACKEND_ENV = ROOT / "backend" / ".env"
WEB_ENV = ROOT / "apps" / "web" / ".env.local"

MAPPING = {
    "NEXT_PUBLIC_API_URL": "http://localhost:5000",
    "NEXT_PUBLIC_SUPABASE_URL": "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "SUPABASE_ANON_KEY",
}


def main() -> None:
    backend = dotenv_values(BACKEND_ENV) if BACKEND_ENV.exists() else {}
    existing = dotenv_values(WEB_ENV) if WEB_ENV.exists() else {}

    lines: list[str] = []
    for web_key, source in MAPPING.items():
        if isinstance(source, str) and source in backend and backend[source]:
            val = backend[source]
        elif web_key in existing and existing[web_key]:
            val = existing[web_key]
        elif isinstance(source, str) and source.startswith("http"):
            val = source
        else:
            val = ""
        if val:
            lines.append(f"{web_key}={val}")

    WEB_ENV.parent.mkdir(parents=True, exist_ok=True)
    WEB_ENV.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {WEB_ENV} ({len(lines)} vars). Add Supabase values to backend/.env if missing.")


if __name__ == "__main__":
    main()
