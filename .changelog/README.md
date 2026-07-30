# Exora Engineering Changelog System

This directory houses the official engineering changelog for the **Exora** platform. It acts as the project's permanent engineering memory, providing complete historical context for past architectural decisions, database schema migrations, security enhancements, and operational updates.

---

## 📌 Purpose & Philosophy

As a live production system, Exora requires a clear, immutable record of technical changes. Git commit messages provide granular line-by-line diffs, but they lack high-level architectural rationale, business context, deployment steps, and rollback strategies.

The `.changelog` system bridges this gap by recording **why** changes were made, **how** they impact the system, and **what** verification steps were taken.

---

## 📋 What Qualifies as a Meaningful Update?

Log any change that alters software behavior, architecture, or operational deployment.

### ✅ Log These Changes:
* **New Features**: User-facing or backend features (e.g., ticket bundling, POS counter tools).
* **Performance Enhancements**: Database query optimizations, caching, bundle size reduction.
* **Security & Auth Hardening**: Changes to authentication, session cookies, JWTs, permissions, or headers.
* **Database & Schema Updates**: New Mongoose schemas, index additions/removals, migration scripts.
* **API Contracts**: New REST endpoints, signature changes, request/response schema updates.
* **Scanner & Printing Work**: Changes to QR validation, camera scanner components, thermal layout templates.
* **Behavioral Bug Fixes**: Resolving issues that affected user experience, pricing calculations, or entry logic.
* **Infrastructure & Deployment**: Vercel configuration updates, environment variable additions, build pipeline changes.

### ❌ Do NOT Log These Changes:
* Whitespace or code formatting adjustments (e.g., Prettier/ESLint re-formats).
* Comment edits or docstring spelling fixes.
* Removing `console.log` or temporary debug code.
* Reordering imports without structural impact.
* Experimental spikes or discarded branches.
* Minor typo fixes in non-user-facing strings.

---

## 🏷️ Naming Convention

All update entries must reside in `.changelog/updates/` using compact, sequential filenames:

```text
u<XXX>-<shortname>.md
```

### Format Rules:
* `u` prefix followed by 3 zero-padded digits (e.g., `u001`, `u002`, `u010`).
* Short, kebab-case topic name (1-3 words max).
* Lowercase letters only.

### Examples:
* `u001-changelog.md`
* `u002-security-hardening.md`
* `u003-dashboard-aggregation.md`
* `u004-qr-scan-cooldown.md`
* `u005-thermal-print-layout.md`

---

## 📄 Required Update Template

Every update file inside `updates/` **must** follow this standard schema:

```markdown
# [UXXX] — Title of Update

- **Date**: YYYY-MM-DD
- **Status**: Completed | Deployed | Pending
- **Author**: Developer Name / AI Assistant

## 📝 Summary
Brief 2-3 sentence overview of the change.

## 🎯 Why
The business or technical problem being solved. Why was this change necessary?

## 💼 Business Impact
Effect on operators, counter staff, venue management, or revenue tracking.

## ⚙️ Technical Impact
Architectural adjustments, component refactors, state management changes, or service logic modifications.

## 📂 Files Changed
- `path/to/modified/file.ts` — Brief note on changes
- `path/to/new/file.tsx` — Brief note on changes

## 🗄️ Database Changes
- **Models Modified**: `ModelName` or None
- **Schema Fields Added/Removed**: Description or None
- **Index Changes**: Description or None

## 🔌 API Changes
- **Endpoints Added/Modified**: `METHOD /api/path`
- **Contract/Payload Changes**: Description or None

## 🎨 UI Changes
- Description of frontend modifications, scanner updates, or layout changes (or None).

## ⚡ Performance Impact
Metrics, query speed improvements, memory footprint, or bundle optimizations.

## 🔒 Security Impact
Authentication, authorization, rate-limiting, audit logging, or secret handling considerations.

## 🚀 Deployment
- **Environment Variables Required**: New ENV vars or None
- **Build/Migration Steps**: Post-deployment commands or None

## ✅ Verification
Concrete steps taken to test and verify production readiness (`npm run build`, unit tests, manual checks).

## 🔄 Rollback Notes
Instructions on how to revert this change if unexpected issues occur in production.

## 🔮 Future Notes
Follow-up items, technical debt created, or future enhancement ideas.
```

---

## ✍️ Writing Style & Tone

* **Professional & Concise**: State facts and technical decisions clearly.
* **Easy to Scan**: Use bullet points, bold key terms, and standard headers.
* **Technically Precise**: Refer to exact file paths, HTTP methods, model names, and status codes.
* **Enduring Value**: Write entries so that a developer reading them 6 months later understands the exact reasoning behind the change.
* **No Marketing Language**: Avoid fluff or superficial summaries.

---

## 🔄 Workflow for Developers & AI Assistants

1. **Complete Code Changes**: Implement and verify code, database, or API changes.
2. **Determine Entry ID**: Check `.changelog/index.md` for the next sequential number (e.g., `U002`).
3. **Create Entry File**: Create `.changelog/updates/uXXX-shortname.md` using the standard template.
4. **Update Master Index**: Append the new entry to `.changelog/index.md`.
5. **Commit to Git**: Commit `.changelog/` alongside the code changes in the same commit or PR.

---

## 📌 Maintenance & Best Practices

* **Keep Index Updated**: Never add an update file without linking it in `.changelog/index.md`.
* **Atomic Entries**: Each update entry should correspond to a logical feature unit or system change.
* **Do Not Add to `.gitignore`**: The `.changelog` directory is part of the repository source code and must remain tracked by Git.
