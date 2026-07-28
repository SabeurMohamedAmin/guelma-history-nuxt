-- Adds the uploaded-attachments blob to a contact message.
--
-- Guarded with IF NOT EXISTS on purpose: a duplicate of this migration
-- (0015_contact_message_attachments, now removed) may already have added the
-- column on some databases. A plain ADD COLUMN would fail there and abort the
-- whole migration run, leaving every later migration unapplied.
ALTER TABLE "contact_messages" ADD COLUMN IF NOT EXISTS "attachments_json" text;
