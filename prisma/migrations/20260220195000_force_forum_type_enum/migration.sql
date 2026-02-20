DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ForumType') THEN
        CREATE TYPE "ForumType" AS ENUM ('FORUM', 'REVIEW', 'TIPS');
    END IF;
END$$;

ALTER TABLE "Forum" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Forum" ALTER COLUMN "type" SET DATA TYPE "ForumType" USING ("type"::text::"ForumType");
ALTER TABLE "Forum" ALTER COLUMN "type" SET DEFAULT 'FORUM'::"ForumType";
