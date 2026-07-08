-- Read-only role used by PostgREST for unauthenticated (anon) API access.
CREATE ROLE anon NOLOGIN;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON parts, part_revisions, parts_with_cost TO anon;
