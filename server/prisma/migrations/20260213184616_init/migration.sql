-- CreateEnum
CREATE TYPE "Role" AS ENUM ('patient', 'nurse', 'doctor', 'admin', 'lab');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('pending_nurse_assignment', 'nurse_assigned', 'nurse_on_the_way', 'vitals_recorded', 'awaiting_doctor_review', 'awaiting_doctor_approval', 'doctor_completed', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "LabOrderStatus" AS ENUM ('pending_patient_confirmation', 'pending_sample_collection', 'sample_collection_scheduled', 'sample_collected', 'received_at_lab', 'sent_to_lab', 'report_ready', 'doctor_review_pending', 'lab_closed');

-- CreateEnum
CREATE TYPE "TriageLevel" AS ENUM ('mild', 'moderate', 'severe');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "medicalRegNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "sessionToken" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "age" INTEGER,
    "bloodGroup" TEXT,
    "allergicInfo" TEXT,
    "medicalHistory" TEXT,
    "emergencyContact" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileUpload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gcsPath" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "symptoms" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "serviceCategory" TEXT,
    "isImmediate" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT NOT NULL,
    "locationDetails" JSONB,
    "addressId" TEXT,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "scheduledEndTime" TIMESTAMP(3),
    "nurseId" TEXT,
    "doctorId" TEXT,
    "status" "ServiceStatus" NOT NULL DEFAULT 'pending_nurse_assignment',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hasProvidedMedication" BOOLEAN,
    "requiredMedicationId" TEXT,
    "requiredMedicationName" TEXT,
    "medicationCost" DOUBLE PRECISION,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalReport" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "chiefComplaint" TEXT,
    "durationOfSymptoms" TEXT,
    "vitalsJson" JSONB NOT NULL,
    "medicalHistory" TEXT,
    "allergies" TEXT,
    "currentMedications" TEXT,
    "nurseNotes" TEXT NOT NULL,
    "nurseObservations" TEXT,
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
    "clinicalNotes" TEXT,
    "advice" TEXT,
    "medications" TEXT,
    "medicinesJson" JSONB,
    "prescriptionUrl" TEXT,
    "labRecommended" BOOLEAN NOT NULL DEFAULT false,
    "referralNote" TEXT,
    "followupDate" TIMESTAMP(3),
    "followupInstruction" TEXT,
    "procedureApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvalNotes" TEXT,
    "requestNurseEdit" BOOLEAN NOT NULL DEFAULT false,
    "emergencyAction" TEXT,

    CONSTRAINT "DoctorAction_pkey" PRIMARY KEY ("id")
);

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
    "patientNameSnapshot" TEXT,
    "patientGenderSnapshot" TEXT,
    "patientDobSnapshot" TIMESTAMP(3),

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

-- CreateTable
CREATE TABLE "LabOrder" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "testsJson" JSONB NOT NULL,
    "urgency" TEXT NOT NULL,
    "status" "LabOrderStatus" NOT NULL DEFAULT 'pending_patient_confirmation',
    "totalPrice" DOUBLE PRECISION,
    "collectionTime" TIMESTAMP(3),
    "samplePhotos" JSONB,
    "barcodes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "flatNumber" TEXT,
    "buildingName" TEXT,
    "floor" TEXT,
    "landmark" TEXT,
    "area" TEXT,
    "city" TEXT,
    "pincode" TEXT,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedAddress_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "category" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "CmsService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "instantCarePremium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emergencyMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "followUpPrice" DOUBLE PRECISION NOT NULL DEFAULT 149,
    "estimatedDuration" INTEGER NOT NULL DEFAULT 30,
    "requiresDoctorReview" BOOLEAN NOT NULL DEFAULT true,
    "requiresVitals" BOOLEAN NOT NULL DEFAULT true,
    "requiresLabOption" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicPricingRule" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "zoneId" TEXT,
    "timeStart" TEXT,
    "timeEnd" TEXT,
    "surgeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DynamicPricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "radiusKm" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "demandLevel" TEXT NOT NULL DEFAULT 'normal',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "preparationInstructions" TEXT,
    "reportTAT" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LabTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabBundle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bundlePrice" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LabBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabBundleTest" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,

    CONSTRAINT "LabBundleTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionTemplate" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT,
    "name" TEXT NOT NULL,
    "defaultDiagnosisText" TEXT,
    "defaultAdvice" TEXT,
    "defaultMedications" JSONB,
    "defaultFollowUpDays" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PrescriptionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpProtocol" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT,
    "triggerCondition" TEXT NOT NULL,
    "followUpDays" INTEGER NOT NULL,
    "followUpType" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FollowUpProtocol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UseCase" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "themeColor" TEXT NOT NULL DEFAULT '#F25022',
    "backgroundGradient" TEXT,
    "ctaText" TEXT NOT NULL DEFAULT 'Book Now',
    "ctaAction" TEXT NOT NULL DEFAULT '/patient/book',
    "illustrationUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UseCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "messageTemplate" TEXT NOT NULL,
    "deliveryChannel" TEXT NOT NULL DEFAULT 'push',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT NOT NULL DEFAULT 'General',
    "unit" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 10,
    "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceConsumable" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priceAtTime" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceConsumable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "FileUpload_gcsPath_key" ON "FileUpload"("gcsPath");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalReport_serviceId_key" ON "ClinicalReport"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorAction_serviceId_key" ON "DoctorAction"("serviceId");

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

-- CreateIndex
CREATE UNIQUE INDEX "LabReport_labOrderId_key" ON "LabReport"("labOrderId");

-- CreateIndex
CREATE INDEX "Rating_serviceId_idx" ON "Rating"("serviceId");

-- CreateIndex
CREATE INDEX "Rating_toUserId_idx" ON "Rating"("toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "LabBundleTest_bundleId_testId_key" ON "LabBundleTest"("bundleId", "testId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_eventType_key" ON "NotificationTemplate"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_sku_key" ON "InventoryItem"("sku");

-- CreateIndex
CREATE INDEX "StockMovement_itemId_idx" ON "StockMovement"("itemId");

-- CreateIndex
CREATE INDEX "DynamicPricingRule_serviceId_idx" ON "DynamicPricingRule"("serviceId");

-- CreateIndex
CREATE INDEX "DynamicPricingRule_zoneId_idx" ON "DynamicPricingRule"("zoneId");

-- CreateIndex
CREATE INDEX "ServiceConsumable_serviceRequestId_idx" ON "ServiceConsumable"("serviceRequestId");

-- CreateIndex
CREATE INDEX "ServiceConsumable_itemId_idx" ON "ServiceConsumable"("itemId");

-- AddForeignKey
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "SavedAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalReport" ADD CONSTRAINT "ClinicalReport_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorAction" ADD CONSTRAINT "DoctorAction_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedAddress" ADD CONSTRAINT "SavedAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabReport" ADD CONSTRAINT "LabReport_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "LabOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicPricingRule" ADD CONSTRAINT "DynamicPricingRule_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "CmsService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicPricingRule" ADD CONSTRAINT "DynamicPricingRule_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabBundleTest" ADD CONSTRAINT "LabBundleTest_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "LabBundle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabBundleTest" ADD CONSTRAINT "LabBundleTest_testId_fkey" FOREIGN KEY ("testId") REFERENCES "LabTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionTemplate" ADD CONSTRAINT "PrescriptionTemplate_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "CmsService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpProtocol" ADD CONSTRAINT "FollowUpProtocol_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "CmsService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceConsumable" ADD CONSTRAINT "ServiceConsumable_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceConsumable" ADD CONSTRAINT "ServiceConsumable_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
