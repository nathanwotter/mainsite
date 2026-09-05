# Codex workspace and web projects

This repository is the source of truth for Nathan's web projects, reusable personal Codex skills, and shared tooling. It also remains the deployment repository for the existing Astro/Sanity website and the Current Wellness Room Board.

## Repository layout

```text
.
|-- apps/                  Additional deployable applications
|   `-- current-room-board/
|-- personal-skills/       Reusable personal Codex skills
|-- tools/                 Shared scripts, utilities, and non-skill tooling
|-- studio/                Sanity Studio for the primary website
|-- sanity-export/         Sanity import/export utilities and snapshot
|-- src/                   Primary Astro website source
|-- public/                Primary website static assets
`-- netlify.toml           Primary website local Netlify configuration
```

The primary Astro/Sanity site intentionally remains at the repository root. Moving it would change established relative paths and could change Netlify's build base. The existing `apps/`, `studio/`, `sanity-export/`, and `tools/video/` paths are also preserved.

### `apps/`

Use `apps/` for standalone applications or substantial project-specific code that belongs in this repository. Each app should keep its own dependencies, deployment configuration, documentation, and project-specific utilities together.

The repository currently contains `apps/current-room-board`, a separately deployable Next.js application with its own `package.json` and `netlify.toml`.

### `personal-skills/`

Use `personal-skills/` for reusable Codex workflows that should be available across unrelated projects. Every skill has its own folder and an obvious `SKILL.md` entry point. Supporting scripts, references, templates, and assets that belong only to a skill stay inside that skill's folder.

To add a reusable skill:

1. Create `personal-skills/<skill-name>/SKILL.md`.
2. Use a lowercase, hyphenated folder name matching the skill's frontmatter `name`.
3. Put skill-only resources in `scripts/`, `references/`, `assets/`, or `agents/` within the skill folder.
4. Run the installation script again. Existing links already point to the repository, so normal edits become available to Codex automatically.

### Project-specific skills

Do not put a narrowly project-specific workflow in `personal-skills/`. Keep it with its project under `<project>/.agents/skills/<skill-name>/SKILL.md`. Codex scans `.agents/skills` from the current working directory up to the repository root, so a skill inside an app remains scoped to that part of the repository.

Use the root `.agents/skills/` location only for future skills that apply to this entire repository but should not be installed for unrelated repositories.

### `tools/`

Use `tools/` for shared scripts, MCP servers, utilities, and operational tooling that are not themselves Codex skills. Keep a utility inside an app or skill when it has no genuine use outside that owner.

Existing RecXR video tooling remains under `tools/video/recxr`. Codex setup helpers live under `tools/codex`.

## Make personal skills available to Codex on Windows

Codex discovers user-level skills under `%USERPROFILE%\.agents\skills` and follows linked skill directories. Keep the editable copy in this Git repository and create Windows directory junctions into the Codex discovery directory:

```powershell
PowerShell -ExecutionPolicy Bypass -File .\tools\codex\install-personal-skills.ps1
```

The installer never replaces an existing path. If directory links are unavailable in a particular environment, install independent copies instead:

```powershell
PowerShell -ExecutionPolicy Bypass -File .\tools\codex\install-personal-skills.ps1 -Copy
```

Linked installation is recommended because the repository remains the sole source of truth. Codex detects skill changes automatically; restart Codex if a newly installed skill does not appear.

If pasting commands through a remote session is inconvenient, double-click `tools\codex\install-personal-skills.cmd` in File Explorer instead.

## Restore this workspace on another Windows computer

Install Git, GitHub CLI, and Node.js 20, then authenticate GitHub and clone the repository:

```powershell
gh auth login --hostname github.com --git-protocol https --web
git clone https://github.com/nathanwotter/mainsite.git
Set-Location .\mainsite
PowerShell -ExecutionPolicy Bypass -File .\tools\codex\install-personal-skills.ps1
```

Install only the dependencies for the projects you plan to use:

```powershell
# Primary Astro website
npm ci

# Sanity Studio
npm --prefix .\studio ci

# Current Wellness Room Board
npm --prefix .\apps\current-room-board ci
```

Environment files and deployment secrets are intentionally excluded from Git. Restore the appropriate values from the Sanity and Netlify dashboards; do not commit tokens or production secrets.

## Primary Astro/Sanity website

The primary site requires Node.js 20, as recorded in `.nvmrc`.

```powershell
npm ci
npm run dev
```

The site uses environment values documented in `.env.example` and `.env-sample`. Create an ignored `.env` file for local values such as `SANITY_PROJECT_ID`, `SANITY_DATASET`, and `SANITY_TOKEN`; never commit the token. Its Sanity Studio lives in `studio/` and targets Sanity project `ix5o6b8v`, dataset `production`, through `studio/sanity.cli.ts`.

Use the repository-local Sanity dependency instead of requiring a separate global CLI installation:

```powershell
npm --prefix .\studio ci
npm --prefix .\studio exec sanity login
npm --prefix .\studio run dev
```

For Studio-specific environment overrides, create the ignored `studio/.env` file and set `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET`.

The Sanity import/export helpers remain available through the root scripts:

```powershell
npm run create-project
npm run import -- <projectId>
npm run export
```

### Netlify Visual Editor

The existing Stackbit/Netlify Visual Editor configuration remains in `.stackbit/` and `stackbit.config.ts`. When that workflow is needed, install the CLI and start its development server as before:

```powershell
npm install --global @stackbit/cli
stackbit dev
```

This is optional for ordinary Astro development.

## Netlify deployment safety

This repository is already connected to deployment workflows outside the local checkout. Preserve the following paths unless the matching Netlify site configuration is deliberately updated at the same time:

- The primary Astro website remains at the repository root.
- `netlify.toml` remains at the repository root.
- The room board remains under `apps/current-room-board` with its own `netlify.toml`.
- Sanity Studio remains under `studio`.

Adding `personal-skills/` or Codex utilities does not change the existing build commands or publish directories. Before changing project locations, build bases, or deployment settings, verify both corresponding Netlify sites and their environment variables.

## Existing project documentation

- See `apps/current-room-board/README.md` for the room board's local setup, Archie integration, privacy model, diagnostics, testing, and deployment checklist.
- See `tools/video/recxr/README.md` for the RecXR packed-video tooling.
- See `src/assets/margin-images/README.md` and `public/xr/README.md` for asset-specific notes.

## License

See `LICENSE`.
