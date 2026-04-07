using System;
using Microsoft.Data.SqlClient;
using System.Collections.Generic;
using System.Data;

class Program
{
    static void Main(string[] args)
    {
        string connectionString = "Server=localhost\\SQLEXPRESS;Database=HRMS_DATN;Trusted_Connection=True;TrustServerCertificate=True";
        
        using (SqlConnection conn = new SqlConnection(connectionString))
        {
            conn.Open();
            Console.WriteLine("Connected to database.");

            // 1. Update Departments
            var depts = new Dictionary<string, string>
            {
                { "HR", "Phòng Nhân sự" },
                { "ACC", "Phòng Kế toán" },
                { "SALES", "Phòng Kinh doanh" },
                { "MKT", "Phòng Marketing" },
                { "PRD", "Phòng Sản xuất" },
                { "HR-REC", "Tổ Tuyển dụng" },
                { "HR-CB", "Tổ Lương Thưởng (C&B)" },
                { "ACC-TAX", "Kế toán Thuế" },
                { "ACC-INT", "Kế toán Nội bộ" },
                { "SALES-N", "Kinh doanh Miền Bắc" },
                { "SALES-S", "Kinh doanh Miền Nam" },
                { "MKT-DIG", "Digital Marketing" },
                { "MKT-EVT", "Tổ chức Sự kiện" },
                { "PRD-ASS", "Xưởng Lắp ráp" },
                { "PRD-QA", "Quản lý Chất lượng" }
            };

            foreach (var dept in depts)
            {
                using (SqlCommand cmd = new SqlCommand("UPDATE Departments SET DepartmentName = @name WHERE DepartmentCode = @code", conn))
                {
                    cmd.Parameters.AddWithValue("@name", dept.Value);
                    cmd.Parameters.AddWithValue("@code", dept.Key);
                    cmd.ExecuteNonQuery();
                }
            }
            Console.WriteLine("Departments updated.");

            // 2. Update Positions
            using (SqlCommand cmd = new SqlCommand(@"
                UPDATE Positions 
                SET PositionName = CASE 
                    WHEN PositionCode = 'HR-DIR' THEN N'Trưởng phòng Nhân sự'
                    WHEN PositionCode = 'ACC-DIR' THEN N'Trưởng phòng Kế toán'
                    WHEN PositionCode = 'SALES-DIR' THEN N'Trưởng phòng Kinh doanh'
                    WHEN PositionCode = 'MKT-DIR' THEN N'Trưởng phòng Marketing'
                    WHEN PositionCode = 'PRD-DIR' THEN N'Trưởng phòng Sản xuất'
                    ELSE PositionName 
                END WHERE PositionCode LIKE '%-DIR'", conn))
            {
                cmd.ExecuteNonQuery();
            }

            // Update sub-dept positions
            using (SqlCommand cmd = new SqlCommand(@"
                UPDATE p
                SET p.PositionName = CASE 
                    WHEN p.Level = 1 THEN N'Trưởng bộ phận ' + d.DepartmentName
                    WHEN p.Level = 3 THEN N'Nhân viên ' + d.DepartmentName
                    ELSE p.PositionName
                END
                FROM Positions p
                JOIN Departments d ON p.DepartmentId = d.Id
                WHERE d.ParentDepartmentId IS NOT NULL", conn))
            {
                cmd.ExecuteNonQuery();
            }
            Console.WriteLine("Positions updated.");

            // 3. Update Employees FullName based on their Position and Department
            string[] names = {
                "An", "Bình", "Cường", "Dũng", "Giang", "Hải", "Hoa", "Hùng", "Khoa", "Lan",
                "Linh", "Long", "Mai", "Nam", "Nga", "Ngọc", "Nhung", "Phong", "Phương", "Quân",
                "Sơn", "Tài", "Thắng", "Thu", "Toàn", "Tuấn", "Xuân", "Yến", "Đức", "Hằng",
                "Tâm", "Hạnh", "Khánh", "Minh", "Thanh", "Thị", "Vân", "Việt", "Diệp", "Loan",
                "Trung", "Hiếu", "Duy", "Hoàng", "Quang", "Nhi", "Trang", "Thảo", "Hương", "Đạt",
                "Anh", "Bảo", "Chi", "Đan", "Gia", "Hà", "Khang", "Lâm", "My", "Ngân",
                "Oanh", "Phú", "Quyên", "Sang", "Thiên", "Uyên", "Vinh", "Vy", "Bách", "Cẩm",
                "Đào", "Kim", "Liên", "Nghĩa", "Phát", "Quốc", "Sương", "Thủy", "Út", "Vương",
                "Đông", "Hiền", "Lợi", "Mận", "Nhựt", "Phúc", "Rằng", "Sinh", "Tiến", "Vi",
                "Xanh", "Bích", "Cúc", "Lộc", "Huy", "Kiệt", "Hào", "Trinh", "Thông", "Trâm",
                "Tú", "Nhân", "Thành", "Dương", "Lệ", "Hồng", "Phượng", "Trọng", "Hiệp", "Khôi",
                "Mỹ", "Tuyết", "Cảnh", "Tuệ", "Bắc", "Doanh", "Hảo", "Lực", "Tín", "Kiên"
            };

            var employees = new List<(int Id, string Username, string PositionName, int Level)>();
            using (SqlCommand cmd = new SqlCommand(@"
                SELECT e.Id, u.Username, p.PositionName, p.Level
                FROM Employees e
                JOIN Users u ON e.UserId = u.Id
                JOIN Positions p ON e.PositionId = p.Id
                ORDER BY e.Id", conn))
            {
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        employees.Add((reader.GetInt32(0), reader.GetString(1), reader.GetString(2), reader.GetInt32(3)));
                    }
                }
            }

            int idx = 0;
            foreach (var emp in employees)
            {
                string newName;
                if (emp.Username == "admin") {
                    newName = "Quản trị hệ thống";
                } else {
                    string firstName = names[idx % names.Length];
                    newName = emp.PositionName + " - " + firstName;
                    idx++;
                }

                using (SqlCommand upd = new SqlCommand("UPDATE Employees SET FullName = @name WHERE Id = @id", conn))
                {
                    upd.Parameters.AddWithValue("@name", newName);
                    upd.Parameters.AddWithValue("@id", emp.Id);
                    upd.ExecuteNonQuery();
                }

                using (SqlCommand upd = new SqlCommand("UPDATE Users SET FullName = @name WHERE Id = (SELECT UserId FROM Employees WHERE Id = @id)", conn))
                {
                    upd.Parameters.AddWithValue("@name", newName);
                    upd.Parameters.AddWithValue("@id", emp.Id);
                    upd.ExecuteNonQuery();
                }
            }
            Console.WriteLine("Employees updated.");
            
            // 4. Update Addresses
            using (SqlCommand cmd = new SqlCommand("UPDATE Employees SET Address = N'Hà Nội, Việt Nam'", conn))
            {
                cmd.ExecuteNonQuery();
            }
            Console.WriteLine("Addresses updated.");

            Console.WriteLine("--- Verification ---");
            using (SqlCommand cmd = new SqlCommand("SELECT TOP 5 FullName FROM Employees", conn))
            {
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        Console.WriteLine("Row: " + reader.GetString(0));
                    }
                }
            }
        }
        Console.WriteLine("All done!");
    }
}
