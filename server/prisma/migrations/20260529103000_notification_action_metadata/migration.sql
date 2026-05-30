-- Add optional navigation metadata so notifications can point to songs, albums,
-- reports, artist dashboards, or other in-app destinations.
ALTER TABLE "Notification"
ADD COLUMN "targetType" VARCHAR(50),
ADD COLUMN "targetId" INTEGER,
ADD COLUMN "actionUrl" VARCHAR(500);

CREATE INDEX "Notification_targetType_targetId_idx" ON "Notification"("targetType", "targetId");
