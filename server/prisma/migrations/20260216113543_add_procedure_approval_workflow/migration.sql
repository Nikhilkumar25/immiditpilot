/*
  Warnings:

  - You are about to drop the column `createdAt` on the `DoctorAction` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "ServiceStatus" ADD VALUE 'awaiting_doctor_approval';

-- AlterTable
ALTER TABLE "ClinicalReport" ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "chiefComplaint" TEXT,
ADD COLUMN     "currentMedications" TEXT,
ADD COLUMN     "durationOfSymptoms" TEXT,
ADD COLUMN     "medicalHistory" TEXT,
ADD COLUMN     "nurseObservations" TEXT;

-- AlterTable
ALTER TABLE "DoctorAction" DROP COLUMN "createdAt",
ADD COLUMN     "approvalNotes" TEXT,
ADD COLUMN     "clinicalNotes" TEXT,
ADD COLUMN     "emergencyAction" TEXT,
ADD COLUMN     "followupInstruction" TEXT,
ADD COLUMN     "medicinesJson" JSONB,
ADD COLUMN     "procedureApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requestNurseEdit" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicalReportId" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "summaryNotes" TEXT,
    "vitalsSnapshotJson" JSONB NOT NULL,
    "nurseObservations" TEXT,
    "medicinesJson" JSONB NOT NULL,
    "followUpInstruction" TEXT,
    "pdfUrl" TEXT,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionVersion" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "vitalsSnapshotJson" JSONB NOT NULL,
    "nurseObservations" TEXT,
    "medicinesJson" JSONB NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "summaryNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrescriptionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpTask" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "instruction" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_clinicalReportId_key" ON "Prescription"("clinicalReportId");

-- CreateIndex
CREATE INDEX "Prescription_serviceId_idx" ON "Prescription"("serviceId");

-- CreateIndex
CREATE INDEX "Prescription_doctorId_idx" ON "Prescription"("doctorId");

-- CreateIndex
CREATE INDEX "Prescription_patientId_idx" ON "Prescription"("patientId");

-- CreateIndex
CREATE INDEX "PrescriptionVersion_prescriptionId_idx" ON "PrescriptionVersion"("prescriptionId");

-- CreateIndex
CREATE INDEX "FollowUpTask_serviceId_idx" ON "FollowUpTask"("serviceId");

-- CreateIndex
CREATE INDEX "FollowUpTask_patientId_idx" ON "FollowUpTask"("patientId");

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_clinicalReportId_fkey" FOREIGN KEY ("clinicalReportId") REFERENCES "ClinicalReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionVersion" ADD CONSTRAINT "PrescriptionVersion_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
