-- CreateEnum
CREATE TYPE "KycState" AS ENUM ('not_started', 'in_progress', 'verified', 'failed');

-- CreateEnum
CREATE TYPE "IdentityRegion" AS ENUM ('nigeria', 'international');

-- CreateEnum
CREATE TYPE "IdentityMethod" AS ENUM ('bvn', 'nin', 'passport', 'drivers_license');

-- CreateEnum
CREATE TYPE "SalaryAccountStatus" AS ENUM ('not_issued', 'active');

-- CreateEnum
CREATE TYPE "RuleMethod" AS ENUM ('fixed', 'percentage');

-- CreateEnum
CREATE TYPE "RuleStatus" AS ENUM ('active', 'paused');

-- CreateEnum
CREATE TYPE "SplitTrigger" AS ENUM ('auto', 'manual');

-- CreateEnum
CREATE TYPE "SplitRunStatus" AS ENUM ('processing', 'completed');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('salary_credit', 'wallet_allocation', 'wallet_withdrawal');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'success', 'failed', 'reversed');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "countryCode" CHAR(2),
    "currencyCode" CHAR(3),
    "profileImageKey" TEXT,
    "kycStatus" "KycState" NOT NULL DEFAULT 'not_started',
    "role" TEXT NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "passwordSetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycVerification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "identityStatus" "KycState" NOT NULL DEFAULT 'not_started',
    "identityRegion" "IdentityRegion",
    "identityMethod" "IdentityMethod",
    "maskedIdNumber" TEXT,
    "identityFailureReason" TEXT,
    "identityAttempts" INTEGER NOT NULL DEFAULT 0,
    "identityLockedUntil" TIMESTAMP(3),
    "identityReference" TEXT,
    "identityVerifiedAt" TIMESTAMP(3),
    "livenessStatus" "KycState" NOT NULL DEFAULT 'not_started',
    "livenessFailureReason" TEXT,
    "livenessAttempts" INTEGER NOT NULL DEFAULT 0,
    "livenessLockedUntil" TIMESTAMP(3),
    "livenessReference" TEXT,
    "livenessVerifiedAt" TIMESTAMP(3),
    "bankIdentityVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "employerName" TEXT NOT NULL,
    "monthlyAmount" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "paydayDay" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryAccount" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "SalaryAccountStatus" NOT NULL DEFAULT 'not_issued',
    "accountNumber" TEXT,
    "bankName" TEXT,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "accentColor" TEXT NOT NULL,
    "targetAmount" BIGINT,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitRule" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "status" "RuleStatus" NOT NULL DEFAULT 'active',
    "method" "RuleMethod" NOT NULL,
    "fixedAmount" BIGINT,
    "percentBps" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SplitRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitRun" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "trigger" "SplitTrigger" NOT NULL,
    "status" "SplitRunStatus" NOT NULL DEFAULT 'processing',
    "baseAmount" BIGINT NOT NULL,
    "availableAmount" BIGINT NOT NULL,
    "toWallets" BIGINT NOT NULL DEFAULT 0,
    "fees" BIGINT NOT NULL DEFAULT 0,
    "skipped" JSONB NOT NULL DEFAULT '[]',
    "creditTransactionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SplitRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'success',
    "amount" BIGINT NOT NULL,
    "fee" BIGINT NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "narration" TEXT,
    "counterpartyName" TEXT NOT NULL,
    "walletId" UUID,
    "categoryId" TEXT,
    "splitRuleId" UUID,
    "splitRunId" UUID,
    "providerReference" TEXT,
    "settlementReference" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "userId" UUID NOT NULL,
    "preferences" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "KycVerification_userId_key" ON "KycVerification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeProfile_userId_key" ON "IncomeProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryAccount_userId_key" ON "SalaryAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryAccount_accountNumber_key" ON "SalaryAccount"("accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Wallet_userId_createdAt_idx" ON "Wallet"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_name_key" ON "Wallet"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SplitRule_walletId_key" ON "SplitRule"("walletId");

-- CreateIndex
CREATE INDEX "SplitRule_userId_priority_idx" ON "SplitRule"("userId", "priority");

-- CreateIndex
CREATE INDEX "SplitRun_userId_createdAt_idx" ON "SplitRun"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reference_key" ON "Transaction"("reference");

-- CreateIndex
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_walletId_createdAt_idx" ON "Transaction"("walletId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_userId_idempotencyKey_key" ON "Transaction"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "KycVerification" ADD CONSTRAINT "KycVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeProfile" ADD CONSTRAINT "IncomeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryAccount" ADD CONSTRAINT "SalaryAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitRule" ADD CONSTRAINT "SplitRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitRule" ADD CONSTRAINT "SplitRule_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitRun" ADD CONSTRAINT "SplitRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_splitRuleId_fkey" FOREIGN KEY ("splitRuleId") REFERENCES "SplitRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_splitRunId_fkey" FOREIGN KEY ("splitRunId") REFERENCES "SplitRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
