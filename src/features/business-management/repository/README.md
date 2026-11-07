# Business management: repository

Server-only Prisma adapters implement types' persistence and transaction ports.
Scope records by business and user, or by a secret hash plus trusted recipient email for an
invitation preview. Email-only invitation reads are prohibited. Map ORM records into contracts. Keep policy in core and use
cases in services; run coordinated writes in serializable transactions.
