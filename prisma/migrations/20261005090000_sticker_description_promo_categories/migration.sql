-- Long description + promo code on stickers.
ALTER TABLE "sticker" ADD COLUMN "description" TEXT;
ALTER TABLE "sticker" ADD COLUMN "offerCode" TEXT;

-- Remap legacy categories to the Product Hunt / outbid-style list.
UPDATE "sticker" SET "category" = CASE "category"
  WHEN 'AI' THEN 'AI & Agents'
  WHEN 'SaaS' THEN 'Productivity'
  WHEN 'Design' THEN 'Design & Creative'
  WHEN 'Marketing' THEN 'Marketing & SEO'
  WHEN 'Games' THEN 'Games & Entertainment'
  WHEN 'Mobile' THEN 'Other'
  WHEN 'Open Source' THEN 'Developer Tools'
  WHEN 'Newsletter' THEN 'Media & Newsletters'
  WHEN 'Community' THEN 'Social & Community'
  WHEN 'Services' THEN 'Agencies & Services'
  ELSE "category"
END;
