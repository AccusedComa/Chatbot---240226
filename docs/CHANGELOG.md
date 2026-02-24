# Changelog

## [1.0.0] - 2026-02-24
### Added
- Initial project structure.
- `manifest.json` created.
- Documentation folder (`/docs`) created.
- Basic server setup with Express and SQLite.
- **Milestone 1 (Widget):** `ChatWidget` component implemented with floating button and chat window.
- **Milestone 2 (Auth):** Admin Login UI and Backend Auth route implemented.
- **Milestone 3 (Chat Flow):** Onboarding flow (Name -> WhatsApp -> Menu) implemented in backend and frontend.
### Changed
- **Admin Panel:** Refactored to use `AdminLayout` with persistent sidebar navigation.
- **Dashboard:** Connected to real database statistics (sessions, messages, documents).
- **New Pages:** Added `Chats` (session history), `Departments` (CRUD), and `Settings` pages.
- **Data Seeding:** Added `seed_data.ts` to populate database with initial demo data.
- **Departments:** Implemented delete functionality and fixed duplication issue by adding UNIQUE index.
- **Settings:** Added UI to configure Gemini API Key and upload RAG documents.
- **Backend:** Updated `RagService` and `ChatRoute` to support dynamic API Key from database (`app_settings` table).
