-- CreateEnum
CREATE TYPE "ContextType" AS ENUM ('OPERACION', 'SIMULACION');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN_PILOTO', 'DR', 'EQUIPO_REGIONAL', 'NIVEL_CENTRAL_SIM');

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contextType" "ContextType" NOT NULL,
    "contextId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Simulation" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "electionYear" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "contextType" "ContextType" NOT NULL,
    "contextId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "criticality" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "contextType" "ContextType" NOT NULL,
    "contextId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "prevHash" TEXT,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_contextType_contextId_idx" ON "Membership"("contextType", "contextId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE INDEX "Simulation_regionId_idx" ON "Simulation"("regionId");

-- CreateIndex
CREATE INDEX "Case_contextType_contextId_idx" ON "Case"("contextType", "contextId");

-- CreateIndex
CREATE INDEX "Event_caseId_idx" ON "Event"("caseId");

-- CreateIndex
CREATE INDEX "Event_contextType_contextId_idx" ON "Event"("contextType", "contextId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
