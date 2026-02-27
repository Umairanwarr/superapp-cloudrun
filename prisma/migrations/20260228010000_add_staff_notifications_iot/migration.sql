-- AlterEnum: Add STAFF to Role
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'STAFF';

-- AlterEnum: Add missing values to JobStatus
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'AWAITING_REVIEW';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('MAINTENANCE', 'UTILITIES', 'TAX', 'OTHER');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('FOR_SALE', 'FOR_RENT');

-- CreateEnum
CREATE TYPE "ForumType" AS ENUM ('FORUM', 'REVIEW', 'TIPS');

-- AlterTable: Add missing columns to Job
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "propertyId" INTEGER;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "hotelId" INTEGER;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "beforeImage" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "afterImage" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

-- AlterTable: Add missing columns to Property
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "neighborhoodInsights" TEXT[];
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "listingType" "ListingType" NOT NULL DEFAULT 'FOR_SALE';

-- AlterTable: Add missing columns to Hotel
ALTER TABLE "Hotel" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Add missing columns to Room
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "image" TEXT;

-- AlterTable: Add fullName back to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fullName" TEXT;

-- CreateTable: Staff
CREATE TABLE IF NOT EXISTS "Staff" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "propertyId" INTEGER,
    "hotelId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Notification
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "relatedId" INTEGER,
    "relatedType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Expense
CREATE TABLE IF NOT EXISTS "Expense" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receiptUrl" TEXT,
    "userId" INTEGER NOT NULL,
    "propertyId" INTEGER,
    "hotelId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Wishlist
CREATE TABLE IF NOT EXISTS "Wishlist" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "propertyId" INTEGER,
    "hotelId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Forum
CREATE TABLE IF NOT EXISTS "Forum" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "ForumType" NOT NULL DEFAULT 'FORUM',
    "link" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Forum_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ForumLike
CREATE TABLE IF NOT EXISTS "ForumLike" (
    "id" SERIAL NOT NULL,
    "forumId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "ForumLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ForumComment
CREATE TABLE IF NOT EXISTS "ForumComment" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "forumId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: IoTDevice
CREATE TABLE IF NOT EXISTS "IoTDevice" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Normal',
    "ownerId" INTEGER NOT NULL,
    "location" TEXT,
    "propertyId" INTEGER,
    "hotelId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IoTDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Message
CREATE TABLE IF NOT EXISTS "Message" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "propertyId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (using IF NOT EXISTS pattern via DO blocks)
CREATE UNIQUE INDEX IF NOT EXISTS "Staff_userId_key" ON "Staff"("userId");
CREATE INDEX IF NOT EXISTS "Staff_propertyId_idx" ON "Staff"("propertyId");
CREATE INDEX IF NOT EXISTS "Staff_hotelId_idx" ON "Staff"("hotelId");

CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");

CREATE INDEX IF NOT EXISTS "Expense_userId_idx" ON "Expense"("userId");
CREATE INDEX IF NOT EXISTS "Expense_propertyId_idx" ON "Expense"("propertyId");
CREATE INDEX IF NOT EXISTS "Expense_hotelId_idx" ON "Expense"("hotelId");
CREATE INDEX IF NOT EXISTS "Expense_category_idx" ON "Expense"("category");

CREATE INDEX IF NOT EXISTS "IoTDevice_ownerId_idx" ON "IoTDevice"("ownerId");

CREATE INDEX IF NOT EXISTS "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX IF NOT EXISTS "Message_receiverId_idx" ON "Message"("receiverId");
CREATE INDEX IF NOT EXISTS "Message_propertyId_idx" ON "Message"("propertyId");

CREATE INDEX IF NOT EXISTS "Forum_userId_idx" ON "Forum"("userId");
CREATE INDEX IF NOT EXISTS "Forum_type_idx" ON "Forum"("type");
CREATE INDEX IF NOT EXISTS "ForumComment_forumId_idx" ON "ForumComment"("forumId");
CREATE INDEX IF NOT EXISTS "ForumComment_userId_idx" ON "ForumComment"("userId");
CREATE INDEX IF NOT EXISTS "ForumLike_forumId_idx" ON "ForumLike"("forumId");
CREATE INDEX IF NOT EXISTS "ForumLike_userId_idx" ON "ForumLike"("userId");

-- Unique constraints for Wishlist and ForumLike
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Wishlist_userId_propertyId_key') THEN
    ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_propertyId_key" UNIQUE ("userId", "propertyId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Wishlist_userId_hotelId_key') THEN
    ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_hotelId_key" UNIQUE ("userId", "hotelId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ForumLike_forumId_userId_key') THEN
    ALTER TABLE "ForumLike" ADD CONSTRAINT "ForumLike_forumId_userId_key" UNIQUE ("forumId", "userId");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Wishlist_userId_idx" ON "Wishlist"("userId");
CREATE INDEX IF NOT EXISTS "Wishlist_propertyId_idx" ON "Wishlist"("propertyId");
CREATE INDEX IF NOT EXISTS "Wishlist_hotelId_idx" ON "Wishlist"("hotelId");

-- AddForeignKeys (using DO block to avoid errors if they already exist)
DO $$ BEGIN
  -- Staff foreign keys
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Staff_userId_fkey') THEN
    ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Staff_propertyId_fkey') THEN
    ALTER TABLE "Staff" ADD CONSTRAINT "Staff_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Staff_hotelId_fkey') THEN
    ALTER TABLE "Staff" ADD CONSTRAINT "Staff_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  -- Notification foreign keys
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_userId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- Expense foreign keys
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Expense_userId_fkey') THEN
    ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Expense_propertyId_fkey') THEN
    ALTER TABLE "Expense" ADD CONSTRAINT "Expense_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Expense_hotelId_fkey') THEN
    ALTER TABLE "Expense" ADD CONSTRAINT "Expense_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  -- IoTDevice foreign keys
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IoTDevice_ownerId_fkey') THEN
    ALTER TABLE "IoTDevice" ADD CONSTRAINT "IoTDevice_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IoTDevice_propertyId_fkey') THEN
    ALTER TABLE "IoTDevice" ADD CONSTRAINT "IoTDevice_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IoTDevice_hotelId_fkey') THEN
    ALTER TABLE "IoTDevice" ADD CONSTRAINT "IoTDevice_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  -- Job foreign keys (new ones for property/hotel)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Job_propertyId_fkey') THEN
    ALTER TABLE "Job" ADD CONSTRAINT "Job_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Job_hotelId_fkey') THEN
    ALTER TABLE "Job" ADD CONSTRAINT "Job_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  -- Message foreign keys
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Message_senderId_fkey') THEN
    ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Message_receiverId_fkey') THEN
    ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Message_propertyId_fkey') THEN
    ALTER TABLE "Message" ADD CONSTRAINT "Message_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- Wishlist foreign keys
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Wishlist_userId_fkey') THEN
    ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Wishlist_propertyId_fkey') THEN
    ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Wishlist_hotelId_fkey') THEN
    ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- Forum foreign keys
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Forum_userId_fkey') THEN
    ALTER TABLE "Forum" ADD CONSTRAINT "Forum_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ForumLike_forumId_fkey') THEN
    ALTER TABLE "ForumLike" ADD CONSTRAINT "ForumLike_forumId_fkey" FOREIGN KEY ("forumId") REFERENCES "Forum"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ForumLike_userId_fkey') THEN
    ALTER TABLE "ForumLike" ADD CONSTRAINT "ForumLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ForumComment_forumId_fkey') THEN
    ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_forumId_fkey" FOREIGN KEY ("forumId") REFERENCES "Forum"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ForumComment_userId_fkey') THEN
    ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
