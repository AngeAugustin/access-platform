-- Remboursement dû au parent après un arrêt anticipé, et son traitement par un administrateur.
ALTER TABLE "Installment" ADD COLUMN "refundAmount" INTEGER;
ALTER TABLE "Installment" ADD COLUMN "refundedAt" TIMESTAMP(3);
ALTER TABLE "Installment" ADD COLUMN "refundedById" TEXT;
ALTER TABLE "Installment" ADD COLUMN "refundNote" TEXT;

ALTER TABLE "Installment" ADD CONSTRAINT "Installment_refundedById_fkey" FOREIGN KEY ("refundedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
