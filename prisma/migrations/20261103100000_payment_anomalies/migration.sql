-- Anomalies de paiement (montant incohérent, double paiement) et leur traitement par un administrateur.
CREATE TYPE "PaymentAnomaly" AS ENUM ('AMOUNT_MISMATCH', 'DUPLICATE');

ALTER TABLE "Payment" ADD COLUMN "anomaly" "PaymentAnomaly";
ALTER TABLE "Payment" ADD COLUMN "anomalyResolvedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "anomalyResolvedById" TEXT;
ALTER TABLE "Payment" ADD COLUMN "anomalyNote" TEXT;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_anomalyResolvedById_fkey" FOREIGN KEY ("anomalyResolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Payment_anomaly_anomalyResolvedAt_idx" ON "Payment"("anomaly", "anomalyResolvedAt");
