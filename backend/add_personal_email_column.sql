-- SQL Script to add PersonalEmail column to Employees table
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[Employees]') 
    AND name = 'PersonalEmail'
)
BEGIN
    ALTER TABLE [dbo].[Employees] ADD [PersonalEmail] NVARCHAR(MAX) NULL;
END
GO
