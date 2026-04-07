-- Update Khoa's photo in Recruitment department (if exists)
UPDATE Employees
SET Avatar = 'https://i.ibb.co/qFmcFz9T/image.png'
WHERE FullName LIKE N'%Khoa%';

-- Update randomly for males who don't have photos
UPDATE Employees
SET Avatar = 'https://randomuser.me/api/portraits/men/' + CAST(ABS(CHECKSUM(NEWID())) % 99 + 1 AS VARCHAR) + '.jpg'
WHERE (Gender LIKE N'%Nam%' OR Gender LIKE N'%Male%') 
  AND (Avatar IS NULL OR Avatar = '')
  AND FullName NOT LIKE N'%Khoa%';

-- Update randomly for females who don't have photos
UPDATE Employees
SET Avatar = 'https://randomuser.me/api/portraits/women/' + CAST(ABS(CHECKSUM(NEWID())) % 99 + 1 AS VARCHAR) + '.jpg'
WHERE (Gender LIKE N'%Nữ%' OR Gender LIKE N'%Female%') 
  AND (Avatar IS NULL OR Avatar = '');

-- Fallback for unspecified genders
UPDATE Employees
SET Avatar = 'https://randomuser.me/api/portraits/men/' + CAST(ABS(CHECKSUM(NEWID())) % 99 + 1 AS VARCHAR) + '.jpg'
WHERE (Avatar IS NULL OR Avatar = '');
