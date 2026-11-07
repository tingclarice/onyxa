# Business management: repository

Server-only Prisma adapters implement types' persistence and transaction ports.
Scope records by business and user, or by the trusted session's normalized recipient
email for inbox reads and invitation-ID responses. Felix approved the email-based
inbox flow in `INBOX_INVITATIONS_PRD.md`. Map ORM records into contracts. Keep policy in core and use
cases in services; run coordinated writes in serializable transactions.
