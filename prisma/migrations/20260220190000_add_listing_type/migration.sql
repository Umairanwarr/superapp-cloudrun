-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('FOR_SALE', 'FOR_RENT');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "listingType" "ListingType" NOT NULL DEFAULT 'FOR_SALE';
