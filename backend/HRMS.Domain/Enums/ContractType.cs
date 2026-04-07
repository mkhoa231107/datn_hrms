namespace HRMS.Domain.Enums
{
    /// <summary>
    /// Type of employment contract
    /// </summary>
    public enum ContractType
    {
        Probation = 1,      // Hợp đồng thử việc
        FixedTerm = 2,      // Hợp đồng xác định thời hạn
        Indefinite = 3,     // Hợp đồng không xác định thời hạn
        Seasonal = 4,       // Hợp đồng theo mùa vụ
        PartTime = 5        // Hợp đồng bán thời gian
    }
}
