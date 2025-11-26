# Repository Guidelines

## Project Structure & Module Organization
- `PoSend.exe` with `runtimes/` provides the self-contained .NET 6 Windows desktop runtime; `Install/` bundles WebView2 installer; `e_lib/` holds dotnet/resources/emoji assets.
- App data lives in `data/database.db` (SQLite); images in `data/Image/`, thumbnails in `temp/PreviewImage_50/`.
- Localization presets sit in `lang/Preset@*.xaml`; keep language pairs aligned and keys mirrored.
- TypeScript/React UI and routing live in `src/` (`src/main.tsx`, `src/routes/**`), shared IPC/API/schema helpers in `src/lib/`, and Tauri/native config in `src-tauri/`; build output lands in `dist/`.

## Build, Test, and Development Commands
- `npm run dev` (Vite dev server) and `npm run preview` (serve build locally); `npm run build` runs `tsc` then `vite build`; `npm run tauri` drives desktop packaging via Tauri CLI.
- `Start-Process ./PoSend.exe -WorkingDirectory .` to run the shipped client and watch logs.
- `sqlite3 data/database.db "SELECT COUNT(*) FROM word_list;"` to confirm migrations/imports.
- `pwsh -Command "Get-ChildItem lang"` to verify localization files are present.

## Coding Style & Naming Conventions
- XAML: 4-space indent; resource keys follow `string.section.action` and stay 1:1 across languages.
- C#/WPF: MVVM layering, PascalCase classes, private fields `_camelCase`, minimal code-behind.
- TypeScript/React: prefer feature-scoped modules under `src/routes/**`, shared utilities in `src/lib/**`; components in PascalCase, functions/props in `camelCase`; use `clsx`/`class-variance-authority` for variants.
- SQLite: table/column names snake_case; add default values when introducing new fields.

## Testing Guidelines
- No automated suite; manual pass must include: run the app, load at least one category/workflow, export Excel/POF, and verify clipboard restore.
- For data-layer changes, run the `sqlite3` check above and scan `data/Image/` for orphaned files.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (e.g., `feat: add multilingual preset sync`).
- PRs should include a concise summary, affected directories, verification steps (commands or screenshots), and migration notes for any config/database changes.

## Security & Configuration Tips
- Do not commit production `data/database.db`; use sanitized or empty samples.
- Keep `setting.ini` and `[adsorb-extend]` switches in sync with resource dictionaries; keep language keys paired.
- Isolate account experiments under `data/<account>/` and ensure hotkey/adsorb settings do not cross-contaminate profiles.
- Database schema guardrails: `rules` table canonical columns are `(id, account_id, trigger_type, trigger_pattern, reply_text, delay_min_ms, delay_max_ms, is_enabled)` as of migrations `20251125152000_fix_rules_schema` and `20251125162000_rules_schema_freeze`; avoid editing older migrations—add new ones for any changes, and back up `accounts.db` before applying.
