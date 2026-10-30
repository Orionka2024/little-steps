# Little Steps · Writing Club

A private, server-backed essay classroom preview for a teacher to try student and teacher workflows.

Features: assignment creation, editable essays and saved drafts, R2 file attachments (10 MB per file), homework submission and review, resource guides and uploads, and a saved message conversation. D1 records and R2 files are scoped to the authenticated owner. Switching the preview role is a demonstration control, not an authorization boundary. No real student accounts or class invitations are enabled, and messages stay inside this owner's preview.

Before independent classroom use: connect an age-appropriate school identity solution, implement server-enforced teacher/student memberships and assignment recipients, and replace preview roles with authenticated roles. The current Sites private sign-in is intended for the adult owner reviewing this version.

## Development

Run `npm run dev`. Local sign-in: `/signin-with-chatgpt?return_to=/`.
Use the Sites build helper for deployment. Database schema is in `db/schema.ts`, migrations in `drizzle/` and storage bindings in `.openai/hosting.json`.
