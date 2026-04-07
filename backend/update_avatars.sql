-- Update Khoa's photo in Recruitment department (if exists)
UPDATE "Employees"
SET "Avatar" = 'https://i.ibb.co/qFmcFz9T/image.png'
WHERE "FullName" ILIKE '%Khoa%';

-- Update randomly for males who don't have photos
UPDATE "Employees"
SET "Avatar" = 'https://randomuser.me/api/portraits/men/' || (floor(random() * 99) + 1)::int || '.jpg'
WHERE ("Gender" ILIKE '%Nam%' OR "Gender" ILIKE '%Male%') 
  AND ("Avatar" IS NULL OR "Avatar" = '')
  AND "FullName" NOT ILIKE '%Khoa%';

-- Update randomly for females who don't have photos
UPDATE "Employees"
SET "Avatar" = 'https://randomuser.me/api/portraits/women/' || (floor(random() * 99) + 1)::int || '.jpg'
WHERE ("Gender" ILIKE '%Nữ%' OR "Gender" ILIKE '%Female%') 
  AND ("Avatar" IS NULL OR "Avatar" = '');

-- Fallback for unspecified genders
UPDATE "Employees"
SET "Avatar" = 'https://randomuser.me/api/portraits/men/' || (floor(random() * 99) + 1)::int || '.jpg'
WHERE ("Avatar" IS NULL OR "Avatar" = '');
