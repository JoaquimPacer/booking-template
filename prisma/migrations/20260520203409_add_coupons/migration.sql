-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "couponCents" INTEGER,
ADD COLUMN     "couponId" TEXT;

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customerEmail" TEXT,
    "amountCents" INTEGER NOT NULL,
    "status" "CouponStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT,
    "sourceBookingId" TEXT,
    "redeemedBookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_studioId_status_idx" ON "Coupon"("studioId", "status");

-- CreateIndex
CREATE INDEX "Coupon_customerEmail_idx" ON "Coupon"("customerEmail");

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
