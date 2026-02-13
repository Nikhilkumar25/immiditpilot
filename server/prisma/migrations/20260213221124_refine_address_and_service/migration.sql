/*
  Warnings:

  - You are about to drop the column `details` on the `SavedAddress` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `SavedAddress` table. All the data in the column will be lost.
  - Added the required column `lat` to the `SavedAddress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lng` to the `SavedAddress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SavedAddress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SavedAddress" DROP COLUMN "details",
DROP COLUMN "location",
ADD COLUMN     "area" TEXT,
ADD COLUMN     "buildingName" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "flatNumber" TEXT,
ADD COLUMN     "floor" TEXT,
ADD COLUMN     "landmark" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "lng" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "addressId" TEXT,
ADD COLUMN     "serviceCategory" TEXT;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "SavedAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;
