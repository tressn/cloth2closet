-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'DRESSMAKER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'FIT_SAMPLE_SENT', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('REQUIRES_PAYMENT_METHOD', 'REQUIRES_CONFIRMATION', 'REQUIRES_ACTION', 'PROCESSING', 'SUCCEEDED', 'CANCELED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'INVOICED', 'PAID', 'RELEASED', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'PAID_OUT', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('STRIPE', 'PAYONEER', 'PENDING');

-- CreateEnum
CREATE TYPE "AttireType" AS ENUM ('DRESS', 'SUIT', 'TOP', 'SKIRT', 'PANTS', 'OUTERWEAR', 'TRADITIONAL', 'OTHER', 'BRIDAL', 'EVENINGWEAR');

-- CreateEnum
CREATE TYPE "DressmakerApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_EMAIL_VERIFICATION', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('QUOTE_REQUESTED', 'QUOTE_APPROVED', 'PAYMENT_SUCCEEDED', 'PROJECT_UPDATE', 'SUPPORT_TICKET_CREATED', 'PAYMENT_REFUNDED', 'DISPUTE_OPENED');

-- CreateEnum
CREATE TYPE "LabelStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SupportCategory" AS ENUM ('ACCOUNT_ROLE', 'PAYMENTS', 'DISPUTE', 'TECHNICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "MilestoneType" AS ENUM ('DEPOSIT', 'FINAL');

-- CreateEnum
CREATE TYPE "LabelScope" AS ENUM ('PROJECT', 'PORTFOLIO', 'SPECIALTY');

-- CreateEnum
CREATE TYPE "FilePurpose" AS ENUM ('MESSAGE_ATTACHMENT', 'PROJECT_REFERENCE', 'PORTFOLIO_IMAGE', 'REVIEW_PHOTO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "username" TEXT,
    "passwordHash" TEXT,
    "termsAcceptedAt" TIMESTAMP(3),
    "termsAcceptedVersion" TEXT,
    "role" "Role",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING_EMAIL_VERIFICATION',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "timezoneIana" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT,
    "subdivisionCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DressmakerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "bio" TEXT,
    "timezoneIana" TEXT,
    "countryCode" TEXT,
    "languages" TEXT[],
    "basePriceFrom" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "yearsExperience" INTEGER,
    "websiteUrl" TEXT,
    "instagramHandle" TEXT,
    "socialLinks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "approvalStatus" "DressmakerApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectionReason" TEXT,

    CONSTRAINT "DressmakerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutProfile" (
    "id" TEXT NOT NULL,
    "dressmakerProfileId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'STRIPE',
    "stripeAccountId" TEXT,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "requirementsJson" JSONB,
    "payoneerEmail" TEXT,
    "payoneerId" TEXT,
    "legalName" TEXT,
    "countryCode" TEXT,
    "subdivisionCode" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "id" TEXT NOT NULL,
    "dressmakerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "attireType" "AttireType" NOT NULL DEFAULT 'OTHER',
    "imageUrls" TEXT[],
    "description" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "projectCode" TEXT NOT NULL,
    "title" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'REQUESTED',
    "customerId" TEXT NOT NULL,
    "dressmakerId" TEXT NOT NULL,
    "payoutMethod" "PayoutMethod" NOT NULL DEFAULT 'PENDING',
    "dressmakerCountryCode" TEXT,
    "quotedTotalAmount" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "depositPercent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDetails" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3),
    "shipByDate" TIMESTAMP(3),
    "fabricNotes" TEXT,
    "referenceImages" TEXT[],
    "fabricAgreed" BOOLEAN NOT NULL DEFAULT false,
    "fabricAgreedNote" TEXT,
    "requireSketch" BOOLEAN NOT NULL DEFAULT false,
    "isRush" BOOLEAN NOT NULL DEFAULT false,
    "wantsCalico" BOOLEAN NOT NULL DEFAULT false,
    "dressmakerPrivateNotes" TEXT,
    "sketchSubmittedAt" TIMESTAMP(3),
    "sketchApprovedAt" TIMESTAMP(3),
    "measurementsRequested" TEXT[],
    "measurementsConfirmedByDressmakerAt" TIMESTAMP(3),
    "measurementsConfirmedByCustomerAt" TIMESTAMP(3),
    "fitSampleSentAt" TIMESTAMP(3),
    "fitSampleReceivedAt" TIMESTAMP(3),
    "finalImages" TEXT[],
    "finalSubmittedAt" TIMESTAMP(3),
    "finalApprovedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "colorPreferences" TEXT,
    "sizeNotes" TEXT,
    "budgetCeiling" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Measurement" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "fieldsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Measurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMeasurementGate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requestedFields" TEXT[],
    "dressmakerConfirmedAt" TIMESTAMP(3),
    "customerConfirmedAt" TIMESTAMP(3),
    "snapshotFieldsJson" JSONB,
    "lockedAt" TIMESTAMP(3),
    "sourceMeasurementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMeasurementGate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "dressmakerId" TEXT NOT NULL,
    "projectId" TEXT,
    "isGeneral" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "text" TEXT,
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationRead" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'REQUIRES_PAYMENT_METHOD',
    "stripePaymentIntentId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "MilestoneType" NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3),
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "payoutEligibleAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "platformFeeAmount" INTEGER,
    "shippingAmount" INTEGER,
    "transferGroup" TEXT,
    "serviceFeeAmount" INTEGER,
    "taxAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "stripeTransferId" TEXT,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "photoUrls" TEXT[],
    "authorId" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileName" TEXT,
    "byteSize" INTEGER,
    "purpose" "FilePurpose" NOT NULL,
    "ownerId" TEXT,
    "messageId" TEXT,
    "projectId" TEXT,
    "portfolioItemId" TEXT,
    "reviewId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "SavedDressmaker" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "dressmakerProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedDressmaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SketchSubmission" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "imageUrls" TEXT[],
    "note" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SketchSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectShipping" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "carrierId" TEXT,
    "carrierOther" TEXT,
    "trackingNumber" TEXT,
    "shippedAt" TIMESTAMP(3),
    "quotedAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectShipping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioItemLabel" (
    "id" TEXT NOT NULL,
    "portfolioItemId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioItemLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DressmakerSpecialty" (
    "id" TEXT NOT NULL,
    "dressmakerProfileId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DressmakerSpecialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Label" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "scope" "LabelScope" NOT NULL DEFAULT 'PROJECT',
    "status" "LabelStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectLabel" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    CONSTRAINT "ProjectLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "requesterEmail" TEXT,
    "projectId" TEXT,
    "category" "SupportCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachmentUrls" TEXT[],
    "status" "SupportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActionLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingCarrier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingCarrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_userId_key" ON "CustomerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DressmakerProfile_userId_key" ON "DressmakerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutProfile_dressmakerProfileId_key" ON "PayoutProfile"("dressmakerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutProfile_stripeAccountId_key" ON "PayoutProfile"("stripeAccountId");

-- CreateIndex
CREATE INDEX "PortfolioItem_dressmakerId_idx" ON "PortfolioItem"("dressmakerId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectCode_key" ON "Project"("projectCode");

-- CreateIndex
CREATE INDEX "Project_customerId_idx" ON "Project"("customerId");

-- CreateIndex
CREATE INDEX "Project_dressmakerId_idx" ON "Project"("dressmakerId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDetails_projectId_key" ON "ProjectDetails"("projectId");

-- CreateIndex
CREATE INDEX "Measurement_customerId_idx" ON "Measurement"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMeasurementGate_projectId_key" ON "ProjectMeasurementGate"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_projectId_key" ON "Conversation"("projectId");

-- CreateIndex
CREATE INDEX "Conversation_customerId_idx" ON "Conversation"("customerId");

-- CreateIndex
CREATE INDEX "Conversation_dressmakerId_idx" ON "Conversation"("dressmakerId");

-- CreateIndex
CREATE INDEX "Conversation_projectId_idx" ON "Conversation"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_customerId_dressmakerId_projectId_key" ON "Conversation"("customerId", "dressmakerId", "projectId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "ConversationRead_userId_idx" ON "ConversationRead"("userId");

-- CreateIndex
CREATE INDEX "ConversationRead_conversationId_idx" ON "ConversationRead"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationRead_conversationId_userId_key" ON "ConversationRead"("conversationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_projectId_key" ON "Payment"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_stripeCheckoutSessionId_key" ON "Milestone"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_stripePaymentIntentId_key" ON "Milestone"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Milestone_projectId_idx" ON "Milestone"("projectId");

-- CreateIndex
CREATE INDEX "Milestone_status_idx" ON "Milestone"("status");

-- CreateIndex
CREATE INDEX "Milestone_payoutEligibleAt_idx" ON "Milestone"("payoutEligibleAt");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_projectId_type_key" ON "Milestone"("projectId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_milestoneId_key" ON "Transfer"("milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_stripeTransferId_key" ON "Transfer"("stripeTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_projectId_key" ON "Review"("projectId");

-- CreateIndex
CREATE INDEX "FileAsset_ownerId_idx" ON "FileAsset"("ownerId");

-- CreateIndex
CREATE INDEX "FileAsset_projectId_idx" ON "FileAsset"("projectId");

-- CreateIndex
CREATE INDEX "FileAsset_messageId_idx" ON "FileAsset"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "SavedDressmaker_customerId_idx" ON "SavedDressmaker"("customerId");

-- CreateIndex
CREATE INDEX "SavedDressmaker_dressmakerProfileId_idx" ON "SavedDressmaker"("dressmakerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedDressmaker_customerId_dressmakerProfileId_key" ON "SavedDressmaker"("customerId", "dressmakerProfileId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "SketchSubmission_projectId_key" ON "SketchSubmission"("projectId");

-- CreateIndex
CREATE INDEX "SketchSubmission_submittedById_idx" ON "SketchSubmission"("submittedById");

-- CreateIndex
CREATE INDEX "SketchSubmission_approvedById_idx" ON "SketchSubmission"("approvedById");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectShipping_projectId_key" ON "ProjectShipping"("projectId");

-- CreateIndex
CREATE INDEX "PortfolioItemLabel_labelId_idx" ON "PortfolioItemLabel"("labelId");

-- CreateIndex
CREATE INDEX "PortfolioItemLabel_portfolioItemId_idx" ON "PortfolioItemLabel"("portfolioItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioItemLabel_portfolioItemId_labelId_key" ON "PortfolioItemLabel"("portfolioItemId", "labelId");

-- CreateIndex
CREATE INDEX "DressmakerSpecialty_labelId_idx" ON "DressmakerSpecialty"("labelId");

-- CreateIndex
CREATE INDEX "DressmakerSpecialty_dressmakerProfileId_idx" ON "DressmakerSpecialty"("dressmakerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "DressmakerSpecialty_dressmakerProfileId_labelId_key" ON "DressmakerSpecialty"("dressmakerProfileId", "labelId");

-- CreateIndex
CREATE INDEX "Label_scope_status_idx" ON "Label"("scope", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Label_scope_slug_key" ON "Label"("scope", "slug");

-- CreateIndex
CREATE INDEX "ProjectLabel_projectId_idx" ON "ProjectLabel"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectLabel_projectId_labelId_key" ON "ProjectLabel"("projectId", "labelId");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_createdAt_idx" ON "SupportTicket"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AdminActionLog_entity_entityId_idx" ON "AdminActionLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AdminActionLog_adminId_createdAt_idx" ON "AdminActionLog"("adminId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingCarrier_name_key" ON "ShippingCarrier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DressmakerProfile" ADD CONSTRAINT "DressmakerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DressmakerProfile" ADD CONSTRAINT "DressmakerProfile_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutProfile" ADD CONSTRAINT "PayoutProfile_dressmakerProfileId_fkey" FOREIGN KEY ("dressmakerProfileId") REFERENCES "DressmakerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_dressmakerId_fkey" FOREIGN KEY ("dressmakerId") REFERENCES "DressmakerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_dressmakerId_fkey" FOREIGN KEY ("dressmakerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDetails" ADD CONSTRAINT "ProjectDetails_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMeasurementGate" ADD CONSTRAINT "ProjectMeasurementGate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_dressmakerId_fkey" FOREIGN KEY ("dressmakerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationRead" ADD CONSTRAINT "ConversationRead_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationRead" ADD CONSTRAINT "ConversationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_portfolioItemId_fkey" FOREIGN KEY ("portfolioItemId") REFERENCES "PortfolioItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedDressmaker" ADD CONSTRAINT "SavedDressmaker_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedDressmaker" ADD CONSTRAINT "SavedDressmaker_dressmakerProfileId_fkey" FOREIGN KEY ("dressmakerProfileId") REFERENCES "DressmakerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SketchSubmission" ADD CONSTRAINT "SketchSubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SketchSubmission" ADD CONSTRAINT "SketchSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SketchSubmission" ADD CONSTRAINT "SketchSubmission_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectShipping" ADD CONSTRAINT "ProjectShipping_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectShipping" ADD CONSTRAINT "ProjectShipping_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "ShippingCarrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItemLabel" ADD CONSTRAINT "PortfolioItemLabel_portfolioItemId_fkey" FOREIGN KEY ("portfolioItemId") REFERENCES "PortfolioItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItemLabel" ADD CONSTRAINT "PortfolioItemLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DressmakerSpecialty" ADD CONSTRAINT "DressmakerSpecialty_dressmakerProfileId_fkey" FOREIGN KEY ("dressmakerProfileId") REFERENCES "DressmakerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DressmakerSpecialty" ADD CONSTRAINT "DressmakerSpecialty_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Label" ADD CONSTRAINT "Label_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLabel" ADD CONSTRAINT "ProjectLabel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLabel" ADD CONSTRAINT "ProjectLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActionLog" ADD CONSTRAINT "AdminActionLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

