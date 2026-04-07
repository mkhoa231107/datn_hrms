using System.Collections.Generic;

namespace HRMS.Application.DTOs.Common
{
    /// <summary>
    /// Generic DTO for paginated results
    /// </summary>
    /// <typeparam name="T">Type of items in the result</typeparam>
    public class PagedResultDto<T>
    {
        public List<T> Items { get; set; } = new List<T>();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)System.Math.Ceiling((double)TotalCount / PageSize);
        public bool HasPreviousPage => PageNumber > 1;
        public bool HasNextPage => PageNumber < TotalPages;
    }
}
