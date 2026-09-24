-- CreateTable
CREATE TABLE "ConnectivityCheck" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectivityCheck_pkey" PRIMARY KEY ("id")
);
