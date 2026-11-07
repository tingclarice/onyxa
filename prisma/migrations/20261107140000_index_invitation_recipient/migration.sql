-- Inbox reads are scoped by recipient across businesses.
CREATE INDEX "BusinessInvitation_emailKey_idx" ON "BusinessInvitation"("emailKey");
