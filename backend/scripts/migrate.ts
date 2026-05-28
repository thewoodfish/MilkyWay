import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.join(__dirname, "../.env") });

const sql = neon(process.env.DATABASE_URL!);

// Each statement is run individually via sql.query()
const statements = [
  `DO $$ BEGIN
    CREATE TYPE "Category" AS ENUM ('DEFI','TRADING','DATA','PRODUCTIVITY','UTILITY','SECURITY','GAMING','SOCIAL');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE TYPE "PricingModel" AS ENUM ('PER_CALL','PER_DAY','PER_MONTH','FREE');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE TYPE "BadgeTier" AS ENUM ('NONE','BRONZE','SILVER','GOLD');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `CREATE TABLE IF NOT EXISTS "Builder" (
    "address" TEXT NOT NULL,
    "agentsCount" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" TEXT NOT NULL DEFAULT '0',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Builder_pkey" PRIMARY KEY ("address")
  )`,

  `CREATE TABLE IF NOT EXISTS "Agent" (
    "id" TEXT NOT NULL,
    "agentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "subcategory" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "endpoint" TEXT NOT NULL,
    "pricingModel" "PricingModel" NOT NULL,
    "priceEth" TEXT NOT NULL,
    "permissions" TEXT[],
    "logoUrl" TEXT,
    "metadataHash" TEXT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "badgeTier" "BadgeTier" NOT NULL DEFAULT 'NONE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "verifiedAt" TIMESTAMP(3),
    "failedChecks" INTEGER NOT NULL DEFAULT 0,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "txHash" TEXT,
    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Agent_ownerAddress_fkey" FOREIGN KEY ("ownerAddress") REFERENCES "Builder"("address") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS "VerificationLog" (
    "id" TEXT NOT NULL,
    "agentId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "statusCode" INTEGER,
    "responseTimeMs" INTEGER,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerificationLog_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "Agent_agentId_key" ON "Agent"("agentId")`,
  `CREATE INDEX IF NOT EXISTS "Agent_category_idx" ON "Agent"("category")`,
  `CREATE INDEX IF NOT EXISTS "Agent_ownerAddress_idx" ON "Agent"("ownerAddress")`,
  `CREATE INDEX IF NOT EXISTS "Agent_active_idx" ON "Agent"("active")`,
  `CREATE INDEX IF NOT EXISTS "Agent_badgeTier_idx" ON "Agent"("badgeTier")`,
  `CREATE INDEX IF NOT EXISTS "VerificationLog_agentId_idx" ON "VerificationLog"("agentId")`,
  `CREATE INDEX IF NOT EXISTS "VerificationLog_checkedAt_idx" ON "VerificationLog"("checkedAt")`,

  // Phase 2 additions
  `ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "aboutSchema" JSONB`,
  `ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "phase2Ready" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "aboutCachedAt" TIMESTAMP(3)`,

  `DO $$ BEGIN
    CREATE TYPE "FlowStatus" AS ENUM ('LOCKED','RUNNING','COMPLETED','REFUNDED','FAILED');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE TYPE "AgentJobStatus" AS ENUM ('PENDING','RUNNING','COMPLETED','FAILED');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE TYPE "TriggerType" AS ENUM ('IMMEDIATE','SCHEDULED','CONDITION');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `CREATE TABLE IF NOT EXISTS "Flow" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "callerAddress" TEXT NOT NULL,
    "totalAmountEth" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "trigger" "TriggerType" NOT NULL,
    "triggerValue" TEXT,
    "status" "FlowStatus" NOT NULL DEFAULT 'LOCKED',
    "escrowTxHash" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Flow_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "Flow_jobId_key" ON "Flow"("jobId")`,
  `CREATE INDEX IF NOT EXISTS "Flow_callerAddress_idx" ON "Flow"("callerAddress")`,
  `CREATE INDEX IF NOT EXISTS "Flow_status_idx" ON "Flow"("status")`,

  `CREATE TABLE IF NOT EXISTS "FlowAgent" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "agentId" INTEGER NOT NULL,
    "agentAddress" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "amountEth" TEXT NOT NULL,
    "staticInputs" JSONB,
    "inputMapping" JSONB,
    "status" "AgentJobStatus" NOT NULL DEFAULT 'PENDING',
    "output" JSONB,
    "executedAt" TIMESTAMP(3),
    CONSTRAINT "FlowAgent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FlowAgent_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS "FlowAgent_flowId_idx" ON "FlowAgent"("flowId")`,
  `CREATE INDEX IF NOT EXISTS "FlowAgent_orderIndex_idx" ON "FlowAgent"("orderIndex")`,
];

async function migrate() {
  console.log("Running schema migration via Neon HTTP...");
  for (const stmt of statements) {
    try {
      await sql.query(stmt);
      console.log("OK:", stmt.trimStart().split("\n")[0].slice(0, 70));
    } catch (e: unknown) {
      console.error("FAIL:", (e as Error).message);
      process.exit(1);
    }
  }
  console.log("Migration complete.");
}

migrate();
