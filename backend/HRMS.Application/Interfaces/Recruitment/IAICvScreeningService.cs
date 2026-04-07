using System.IO;
using System.Threading.Tasks;

namespace HRMS.Application.Interfaces.Recruitment
{
    public interface IAICvScreeningService
    {
        /// <summary>
        /// Reads a CV (PDF format) and evaluates it against the given Job Criteria.
        /// Returns a value tuple with (MatchScore 0-100, AI Recommendation HTML/Markdown).
        /// </summary>
        Task<(int MatchScore, string Recommendation)> EvaluateCvAsync(Stream cvStream, int jobPostingId);
    }
}
