-- Les reversements FedaPay restent « en cours » jusqu'à la confirmation de l'opérateur.
ALTER TABLE "Payout" ADD COLUMN "startedAt" TIMESTAMP(3);

CREATE INDEX "Payout_providerReference_idx" ON "Payout"("providerReference");
