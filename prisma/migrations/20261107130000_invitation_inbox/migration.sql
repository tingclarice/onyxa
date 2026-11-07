-- DropIndex
DROP INDEX "BusinessInvitation_tokenHash_key";

-- AlterTable
ALTER TABLE "BusinessInvitation" DROP COLUMN "tokenHash";
