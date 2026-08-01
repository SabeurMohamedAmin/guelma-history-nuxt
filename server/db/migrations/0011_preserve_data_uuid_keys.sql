-- Preserve all rows while replacing CockroachDB integer identifiers with UUIDs.
-- The same deterministic expression is used for each parent and its foreign keys.
-- Existing UUID identifiers (comments and notifications) are intentionally kept.

-- Drop foreign keys that depend on integer identifiers.
ALTER TABLE article_comments DROP CONSTRAINT IF EXISTS article_comments_article_id_articles_id_fk;
ALTER TABLE article_correction_requests DROP CONSTRAINT IF EXISTS article_correction_requests_article_id_articles_id_fk;
ALTER TABLE article_media DROP CONSTRAINT IF EXISTS article_media_article_id_articles_id_fk;
ALTER TABLE article_tags DROP CONSTRAINT IF EXISTS article_tags_article_id_articles_id_fk;
ALTER TABLE article_tags DROP CONSTRAINT IF EXISTS article_tags_tag_id_tags_id_fk;
ALTER TABLE article_tags DROP CONSTRAINT IF EXISTS article_tags_article_id_tag_id_pk;
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_category_id_categories_id_fk;
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_author_id_authors_id_fk;
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_created_by_user_id_users_id_fk;
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_parent_id_categories_id_fk;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_author_id_authors_id_fk;
ALTER TABLE password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_users_id_fk;
ALTER TABLE user_oauth_accounts DROP CONSTRAINT IF EXISTS user_oauth_accounts_user_id_users_id_fk;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_article_id_articles_id_fk;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_parent_id_comments_id_fk;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_author_id_users_id_fk;
ALTER TABLE comment_votes DROP CONSTRAINT IF EXISTS comment_votes_comment_id_comments_id_fk;
ALTER TABLE comment_votes DROP CONSTRAINT IF EXISTS comment_votes_user_id_users_id_fk;
ALTER TABLE comment_flags DROP CONSTRAINT IF EXISTS comment_flags_comment_id_comments_id_fk;
ALTER TABLE comment_flags DROP CONSTRAINT IF EXISTS comment_flags_reporter_id_users_id_fk;
ALTER TABLE notification_mutes DROP CONSTRAINT IF EXISTS notification_mutes_user_id_users_id_fk;
ALTER TABLE notification_mutes DROP CONSTRAINT IF EXISTS notification_mutes_comment_id_comments_id_fk;
ALTER TABLE notification_mutes DROP CONSTRAINT IF EXISTS notification_mutes_article_id_articles_id_fk;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_users_id_fk;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_actor_id_users_id_fk;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_article_id_articles_id_fk;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_comment_id_comments_id_fk;
ALTER TABLE bookmarks DROP CONSTRAINT IF EXISTS bookmarks_user_id_users_id_fk;
ALTER TABLE bookmarks DROP CONSTRAINT IF EXISTS bookmarks_article_id_articles_id_fk;
ALTER TABLE newsletter_article_emails DROP CONSTRAINT IF EXISTS newsletter_article_emails_article_id_articles_id_fk;
ALTER TABLE newsletter_article_emails DROP CONSTRAINT IF EXISTS newsletter_article_emails_subscriber_id_subscribers_id_fk;

-- Keep primary keys attached while changing their column types. CockroachDB
-- requires every table to have a primary key and rewrites the existing primary
-- index when ALTER COLUMN changes the key type.
-- Parent IDs. MD5 is used only as a deterministic mapper, not for security.
ALTER TABLE authors ALTER COLUMN id DROP DEFAULT;
ALTER TABLE authors ALTER COLUMN id SET DATA TYPE UUID USING (md5('authors:' || id::STRING)::UUID);
ALTER TABLE categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE categories ALTER COLUMN id SET DATA TYPE UUID USING (md5('categories:' || id::STRING)::UUID);
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE users ALTER COLUMN id SET DATA TYPE UUID USING (md5('users:' || id::STRING)::UUID);
ALTER TABLE articles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE articles ALTER COLUMN id SET DATA TYPE UUID USING (md5('articles:' || id::STRING)::UUID);
ALTER TABLE tags ALTER COLUMN id DROP DEFAULT;
ALTER TABLE tags ALTER COLUMN id SET DATA TYPE UUID USING (md5('tags:' || id::STRING)::UUID);
ALTER TABLE subscribers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE subscribers ALTER COLUMN id SET DATA TYPE UUID USING (md5('subscribers:' || id::STRING)::UUID);

-- Standalone/dependent row IDs.
ALTER TABLE article_comments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE article_comments ALTER COLUMN id SET DATA TYPE UUID USING (md5('article_comments:' || id::STRING)::UUID);
ALTER TABLE article_correction_requests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE article_correction_requests ALTER COLUMN id SET DATA TYPE UUID USING (md5('article_correction_requests:' || id::STRING)::UUID);
ALTER TABLE article_media ALTER COLUMN id DROP DEFAULT;
ALTER TABLE article_media ALTER COLUMN id SET DATA TYPE UUID USING (md5('article_media:' || id::STRING)::UUID);
ALTER TABLE bookmarks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE bookmarks ALTER COLUMN id SET DATA TYPE UUID USING (md5('bookmarks:' || id::STRING)::UUID);
ALTER TABLE comment_votes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE comment_votes ALTER COLUMN id SET DATA TYPE UUID USING (md5('comment_votes:' || id::STRING)::UUID);
ALTER TABLE comment_flags ALTER COLUMN id DROP DEFAULT;
ALTER TABLE comment_flags ALTER COLUMN id SET DATA TYPE UUID USING (md5('comment_flags:' || id::STRING)::UUID);
ALTER TABLE notification_mutes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE notification_mutes ALTER COLUMN id SET DATA TYPE UUID USING (md5('notification_mutes:' || id::STRING)::UUID);
ALTER TABLE newsletter_article_emails ALTER COLUMN id DROP DEFAULT;
ALTER TABLE newsletter_article_emails ALTER COLUMN id SET DATA TYPE UUID USING (md5('newsletter_article_emails:' || id::STRING)::UUID);
ALTER TABLE contact_messages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE contact_messages ALTER COLUMN id SET DATA TYPE UUID USING (md5('contact_messages:' || id::STRING)::UUID);
ALTER TABLE user_oauth_accounts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE user_oauth_accounts ALTER COLUMN id SET DATA TYPE UUID USING (md5('user_oauth_accounts:' || id::STRING)::UUID);
ALTER TABLE password_reset_tokens ALTER COLUMN id DROP DEFAULT;
ALTER TABLE password_reset_tokens ALTER COLUMN id SET DATA TYPE UUID USING (md5('password_reset_tokens:' || id::STRING)::UUID);

-- Foreign keys use their parent table's mapping prefix.
ALTER TABLE categories ALTER COLUMN parent_id SET DATA TYPE UUID USING (CASE WHEN parent_id IS NULL THEN NULL ELSE md5('categories:' || parent_id::STRING)::UUID END);
ALTER TABLE users ALTER COLUMN author_id SET DATA TYPE UUID USING (CASE WHEN author_id IS NULL THEN NULL ELSE md5('authors:' || author_id::STRING)::UUID END);
ALTER TABLE articles ALTER COLUMN category_id SET DATA TYPE UUID USING (CASE WHEN category_id IS NULL THEN NULL ELSE md5('categories:' || category_id::STRING)::UUID END);
ALTER TABLE articles ALTER COLUMN author_id SET DATA TYPE UUID USING (CASE WHEN author_id IS NULL THEN NULL ELSE md5('authors:' || author_id::STRING)::UUID END);
ALTER TABLE articles ALTER COLUMN created_by_user_id SET DATA TYPE UUID USING (md5('users:' || created_by_user_id::STRING)::UUID);
ALTER TABLE article_comments ALTER COLUMN article_id SET DATA TYPE UUID USING (md5('articles:' || article_id::STRING)::UUID);
ALTER TABLE article_correction_requests ALTER COLUMN article_id SET DATA TYPE UUID USING (md5('articles:' || article_id::STRING)::UUID);
ALTER TABLE article_media ALTER COLUMN article_id SET DATA TYPE UUID USING (md5('articles:' || article_id::STRING)::UUID);
ALTER TABLE article_tags ALTER COLUMN article_id SET DATA TYPE UUID USING (md5('articles:' || article_id::STRING)::UUID);
ALTER TABLE article_tags ALTER COLUMN tag_id SET DATA TYPE UUID USING (md5('tags:' || tag_id::STRING)::UUID);
ALTER TABLE password_reset_tokens ALTER COLUMN user_id SET DATA TYPE UUID USING (md5('users:' || user_id::STRING)::UUID);
ALTER TABLE user_oauth_accounts ALTER COLUMN user_id SET DATA TYPE UUID USING (md5('users:' || user_id::STRING)::UUID);
ALTER TABLE comments ALTER COLUMN article_id SET DATA TYPE UUID USING (md5('articles:' || article_id::STRING)::UUID);
ALTER TABLE comments ALTER COLUMN author_id SET DATA TYPE UUID USING (md5('users:' || author_id::STRING)::UUID);
ALTER TABLE comment_votes ALTER COLUMN user_id SET DATA TYPE UUID USING (md5('users:' || user_id::STRING)::UUID);
ALTER TABLE comment_flags ALTER COLUMN reporter_id SET DATA TYPE UUID USING (md5('users:' || reporter_id::STRING)::UUID);
ALTER TABLE notification_mutes ALTER COLUMN user_id SET DATA TYPE UUID USING (md5('users:' || user_id::STRING)::UUID);
ALTER TABLE notification_mutes ALTER COLUMN article_id SET DATA TYPE UUID USING (CASE WHEN article_id IS NULL THEN NULL ELSE md5('articles:' || article_id::STRING)::UUID END);
ALTER TABLE notifications ALTER COLUMN recipient_id SET DATA TYPE UUID USING (md5('users:' || recipient_id::STRING)::UUID);
ALTER TABLE notifications ALTER COLUMN actor_id SET DATA TYPE UUID USING (md5('users:' || actor_id::STRING)::UUID);
ALTER TABLE notifications ALTER COLUMN article_id SET DATA TYPE UUID USING (md5('articles:' || article_id::STRING)::UUID);
ALTER TABLE bookmarks ALTER COLUMN user_id SET DATA TYPE UUID USING (md5('users:' || user_id::STRING)::UUID);
ALTER TABLE bookmarks ALTER COLUMN article_id SET DATA TYPE UUID USING (md5('articles:' || article_id::STRING)::UUID);
ALTER TABLE newsletter_article_emails ALTER COLUMN article_id SET DATA TYPE UUID USING (md5('articles:' || article_id::STRING)::UUID);
ALTER TABLE newsletter_article_emails ALTER COLUMN subscriber_id SET DATA TYPE UUID USING (md5('subscribers:' || subscriber_id::STRING)::UUID);

-- Restore UUID defaults and primary keys.
ALTER TABLE authors ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE categories ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE articles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE tags ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE article_comments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE article_correction_requests ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE article_media ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE bookmarks ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE comment_votes ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE comment_flags ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE notification_mutes ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE subscribers ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE newsletter_article_emails ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE contact_messages ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE user_oauth_accounts ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE password_reset_tokens ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Restore foreign keys with their original delete behavior.
ALTER TABLE categories ADD CONSTRAINT categories_parent_id_categories_id_fk FOREIGN KEY (parent_id) REFERENCES categories(id);
ALTER TABLE users ADD CONSTRAINT users_author_id_authors_id_fk FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE SET NULL;
ALTER TABLE articles ADD CONSTRAINT articles_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES categories(id);
ALTER TABLE articles ADD CONSTRAINT articles_author_id_authors_id_fk FOREIGN KEY (author_id) REFERENCES authors(id);
ALTER TABLE articles ADD CONSTRAINT articles_created_by_user_id_users_id_fk FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE article_comments ADD CONSTRAINT article_comments_article_id_articles_id_fk FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;
ALTER TABLE article_correction_requests ADD CONSTRAINT article_correction_requests_article_id_articles_id_fk FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;
ALTER TABLE article_media ADD CONSTRAINT article_media_article_id_articles_id_fk FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;
ALTER TABLE article_tags ADD CONSTRAINT article_tags_article_id_articles_id_fk FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;
ALTER TABLE article_tags ADD CONSTRAINT article_tags_tag_id_tags_id_fk FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;
ALTER TABLE article_tags ADD CONSTRAINT article_tags_article_id_tag_id_pk PRIMARY KEY (article_id, tag_id);
ALTER TABLE password_reset_tokens ADD CONSTRAINT password_reset_tokens_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_oauth_accounts ADD CONSTRAINT user_oauth_accounts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE comments ADD CONSTRAINT comments_article_id_articles_id_fk FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;
ALTER TABLE comments ADD CONSTRAINT comments_parent_id_comments_id_fk FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE comments ADD CONSTRAINT comments_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE comment_votes ADD CONSTRAINT comment_votes_comment_id_comments_id_fk FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE comment_votes ADD CONSTRAINT comment_votes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE comment_flags ADD CONSTRAINT comment_flags_comment_id_comments_id_fk FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE comment_flags ADD CONSTRAINT comment_flags_reporter_id_users_id_fk FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notification_mutes ADD CONSTRAINT notification_mutes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notification_mutes ADD CONSTRAINT notification_mutes_article_id_articles_id_fk FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;
ALTER TABLE notification_mutes ADD CONSTRAINT notification_mutes_comment_id_comments_id_fk FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_recipient_id_users_id_fk FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_actor_id_users_id_fk FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_article_id_articles_id_fk FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_comment_id_comments_id_fk FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE bookmarks ADD CONSTRAINT bookmarks_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE bookmarks ADD CONSTRAINT bookmarks_article_id_articles_id_fk FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;
ALTER TABLE newsletter_article_emails ADD CONSTRAINT newsletter_article_emails_article_id_articles_id_fk FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;
ALTER TABLE newsletter_article_emails ADD CONSTRAINT newsletter_article_emails_subscriber_id_subscribers_id_fk FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE;
