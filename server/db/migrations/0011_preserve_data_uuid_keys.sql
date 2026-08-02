-- Fresh databases now create UUID columns directly in their originating
-- migrations. Existing production data is preserved by the rebuild backup and
-- restore workflow, avoiding unsupported CockroachDB primary-key rewrites.
SELECT 1;
