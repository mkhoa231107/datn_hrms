SET QUOTED_IDENTIFIER ON;
GO

-- Update Position Allowances with reasonable defaults
UPDATE Positions
SET 
    DefaultMealAllowance = CASE WHEN DefaultMealAllowance = 0 THEN 730000 ELSE DefaultMealAllowance END,
    DefaultPhoneAllowance = CASE 
        WHEN DefaultPhoneAllowance = 0 THEN 
            CASE 
                WHEN PositionName LIKE N'%Giám đốc%' OR PositionName LIKE N'%Xưởng trưởng%' OR PositionName LIKE N'%Quản đốc%' OR PositionName LIKE N'%Trưởng phòng%' THEN 500000
                WHEN PositionName LIKE N'%Trưởng nhóm%' OR PositionName LIKE N'%Tổ trưởng%' OR PositionName LIKE N'%Ca trưởng%' THEN 300000
                ELSE 200000
            END
        ELSE DefaultPhoneAllowance 
    END,
    DefaultPetrolAllowance = CASE 
        WHEN DefaultPetrolAllowance = 0 THEN 
            CASE 
                WHEN PositionName LIKE N'%Giám đốc%' OR PositionName LIKE N'%Xưởng trưởng%' OR PositionName LIKE N'%Quản đốc%' OR PositionName LIKE N'%Trưởng phòng%' THEN 500000
                WHEN PositionName LIKE N'%Trưởng nhóm%' OR PositionName LIKE N'%Tổ trưởng%' OR PositionName LIKE N'%Ca trưởng%' THEN 300000
                ELSE 200000
            END
        ELSE DefaultPetrolAllowance 
    END,
    DefaultHousingAllowance = CASE 
        WHEN DefaultHousingAllowance = 0 THEN 
            CASE 
                WHEN PositionName LIKE N'%Giám đốc%' OR PositionName LIKE N'%Xưởng trưởng%' OR PositionName LIKE N'%Quản đốc%' OR PositionName LIKE N'%Trưởng phòng%' THEN 1500000
                WHEN PositionName LIKE N'%Trưởng nhóm%' OR PositionName LIKE N'%Tổ trưởng%' OR PositionName LIKE N'%Ca trưởng%' THEN 1000000
                WHEN PositionName LIKE N'%Công nhân%' THEN 2000000
                ELSE 0
            END
        ELSE DefaultHousingAllowance 
    END
WHERE 
    DefaultMealAllowance = 0 OR DefaultPhoneAllowance = 0 OR DefaultPetrolAllowance = 0 OR DefaultHousingAllowance = 0;
GO
