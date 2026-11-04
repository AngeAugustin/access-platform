-- Tentative de paiement enregistrée avant l'appel FedaPay, lien de paiement réutilisable, échec d'initialisation.
ALTER TYPE "PaymentStatus" ADD VALUE 'FAILED';

ALTER TABLE "Payment" ALTER COLUMN "providerTransactionId" DROP NOT NULL;
ALTER TABLE "Payment" ADD COLUMN "paymentUrl" TEXT;
ALTER TABLE "Payment" ADD COLUMN "statusReason" TEXT;
