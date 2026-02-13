-- CreateEnum
CREATE TYPE "Role" AS ENUM ('patient', 'nurse', 'doctor', 'admin');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('pending_nurse_assignment', 'nurse_assigned', 'nurse_on_the_way', 'vitals_recorded', 'awaiting_doctor_review', 'doctor_completed', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "LabOrderStatus" AS ENUM ('pending_patient_confirmation', 'pending_sample_collection', 'sample_collection_scheduled', 'sample_collected', 'sent_to_lab', 'report_ready', 'doctor_review_pending', 'lab_closed');

-- CreateEnum
CREATE TYPE "TriageLevel" AS ENUM ('mild', 'moderate', 'severe');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "nurseId" TEXT,
    "doctorId" TEXT,
    "serviceType" TEXT NOT NULL,
    "symptoms" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'pending_nurse_assignment',
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalReport" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "vitalsJson" JSONB NOT NULL,
    "nurseNotes" TEXT NOT NULL,
    "attachments" TEXT[],
    "triageLevel" "TriageLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorAction" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "prescriptionUrl" TEXT,
    "labRecommended" BOOLEAN NOT NULL DEFAULT false,
    "referralNote" TEXT,
    "followupDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabOrder" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "testsJson" JSONB NOT NULL,
    "urgency" TEXT NOT NULL,
    "status" "LabOrderStatus" NOT NULL DEFAULT 'pending_patient_confirmation',
    "collectionTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabReport" (
    "id" TEXT NOT NULL,
    "labOrderId" TEXT NOT NULL,
    "reportUrl" TEXT NOT NULL,
    "doctorReviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalReport_serviceId_key" ON "ClinicalReport"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorAction_serviceId_key" ON "DoctorAction"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "LabReport_labOrderId_key" ON "LabReport"("labOrderId");

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalReport" ADD CONSTRAINT "ClinicalReport_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorAction" ADD CONSTRAINT "DoctorAction_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabReport" ADD CONSTRAINT "LabReport_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "LabOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
