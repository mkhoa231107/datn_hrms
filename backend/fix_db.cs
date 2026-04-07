using Microsoft.Data.SqlClient;
using System;

class Program
{
    static void Main(string[] args)
    {
        string connectionString = "Server=(localdb)\\MSSQLLocalDB;Database=HRMS_DB;Trusted_Connection=True;TrustServerCertificate=True;";
        string sql = @"
            -- Overtime Module
            IF OBJECT_ID('[OvertimeRequests]') IS NULL
                CREATE TABLE [OvertimeRequests] (
                    Id int PRIMARY KEY IDENTITY,
                    [Date] datetime2 NOT NULL,
                    StartTime time NOT NULL,
                    EndTime time NOT NULL,
                    Reason nvarchar(max) NULL,
                    DepartmentId int NOT NULL,
                    CreatedById int NOT NULL,
                    [Status] nvarchar(max) NOT NULL DEFAULT 'Scheduled',
                    CreatedAt datetime2 NOT NULL DEFAULT GETUTCDATE()
                );

            IF OBJECT_ID('[EmployeeOvertimes]') IS NULL
                CREATE TABLE [EmployeeOvertimes] (
                    Id int PRIMARY KEY IDENTITY,
                    EmployeeId int NOT NULL,
                    OvertimeRequestId int NOT NULL,
                    CONSTRAINT FK_EmployeeOvertimes_OvertimeRequests_OvertimeRequestId FOREIGN KEY (OvertimeRequestId) REFERENCES [OvertimeRequests](Id) ON DELETE CASCADE
                );

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[AttendanceSummaries]') AND name = 'OvertimeHours')
                ALTER TABLE [AttendanceSummaries] ADD [OvertimeHours] decimal(18,2) NOT NULL DEFAULT 0;

            -- Cleanup Duplicate/Ghost Contracts for User 13 (Fixing persistent notification)
            UPDATE EmployeeContracts 
            SET Status = 7 -- Terminated
            WHERE EmployeeId = 13 
              AND Status = 4 -- WaitingSign
              AND EXISTS (SELECT 1 FROM EmployeeContracts WHERE EmployeeId = 13 AND Status = 5); -- If Active exists
        ";

        try
        {
            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();
                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.ExecuteNonQuery();
                    Console.WriteLine("✅ Database tables created successfully!");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("❌ ERROR: " + ex.Message);
        }
    }
}
