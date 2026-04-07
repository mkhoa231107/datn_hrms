using HRMS.Application.Interfaces.Recruitment;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;
using iText.Kernel.Pdf.Canvas.Parser.Listener;

namespace HRMS.Infrastructure.Services.Recruitment
{
    public class AICvScreeningService : IAICvScreeningService
    {
        private readonly HRMSDbContext _context;
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;

        public AICvScreeningService(HRMSDbContext context, HttpClient httpClient, IConfiguration config)
        {
            _context = context;
            _httpClient = httpClient;
            _config = config;
        }

        public async Task<(int MatchScore, string Recommendation)> EvaluateCvAsync(Stream cvStream, int jobPostingId)
        {
            Console.WriteLine($"\n[AI-TRACE] Starting Ollama evaluation for JobID: {jobPostingId}");
            try
            {
                // 1. Lấy thông tin bài đăng và tiêu chí
                var jobPosting = await _context.JobPostings
                    .Include(jp => jp.JobCriteria)
                    .FirstOrDefaultAsync(jp => jp.Id == jobPostingId);

                if (jobPosting == null || jobPosting.JobCriteria == null)
                {
                    return (0, "Không thể đánh giá: Không tìm thấy tiêu chí tuyển dụng cho vị trí này.");
                }

                var criteria = jobPosting.JobCriteria;

                // 2. Trích xuất Text từ file PDF
                string cvText = ExtractTextFromPdf(cvStream);
                if (string.IsNullOrWhiteSpace(cvText))
                {
                    return (0, "Không thể đánh giá: CV không chứa text (có thể là file ảnh hoặc file rỗng).");
                }

                Console.WriteLine($"[AI-TRACE] PDF Text Extracted: {cvText.Length} chars");
                
                // 3. Gọi Ollama API
                var baseUrl = _config["Ollama:BaseUrl"] ?? "http://localhost:11434";
                var modelName = _config["Ollama:Model"] ?? "llama3";

                var prompt = BuildPrompt(cvText, jobPosting.Title, criteria.MustHaveSkills, criteria.NiceToHaveSkills, criteria.MinYearsOfExperience, criteria.OtherRequirements);

                Console.WriteLine($"[AI-TRACE] Calling Ollama ({modelName})...");
                var result = await CallOllamaApiAsync(prompt, baseUrl, modelName);
                Console.WriteLine($"[AI-TRACE] AI Result: Score={result.MatchScore}");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AI-TRACE] CRITICAL ERROR: {ex.Message}");
                return (0, $"Lỗi hệ thống trong quá trình AI phân tích CV: {ex.Message}");
            }
        }

        private string ExtractTextFromPdf(Stream pdfStream)
        {
            try
            {
                if (pdfStream.Position != 0)
                {
                    pdfStream.Position = 0; // Reset lại vị trí stream
                }

                StringBuilder textBuilder = new StringBuilder();
                using (var pdfReader = new PdfReader(pdfStream))
                using (var pdfDocument = new PdfDocument(pdfReader))
                {
                    for (int i = 1; i <= pdfDocument.GetNumberOfPages(); i++)
                    {
                        var page = pdfDocument.GetPage(i);
                        var strategy = new SimpleTextExtractionStrategy();
                        var currentText = PdfTextExtractor.GetTextFromPage(page, strategy);
                        textBuilder.AppendLine(currentText);
                    }
                }
                
                var fullText = textBuilder.ToString();
                
                // Cắt bớt nếu CV quá dài (Ollama context limit tùy model)
                if (fullText.Length > 10000) 
                {
                    fullText = fullText.Substring(0, 10000) + "... [TRUNCATED]";
                }
                
                return fullText;
            }
            catch
            {
                return string.Empty;
            }
        }

        private string BuildPrompt(string cvText, string jobTitle, string mustHaveSkills, string? niceToHaveSkills, int? minYears, string? otherRequirements)
        {
            return $@"
Bạn là một chuyên gia tuyển dụng. Hãy đánh giá CV sau cho vị trí {jobTitle}.
Tiêu chí:
- Bắt buộc: {mustHaveSkills}
- Ưu tiên: {niceToHaveSkills ?? "N/A"}
- Kinh nghiệm: {minYears?.ToString() ?? "0"} năm.

CV:
{cvText}

Yêu cầu: Trả về JSON duy nhất: {{""score"": <0-100>, ""recommendation"": ""<nhận xét tiếng Việt, gạch đầu dòng>""}}. KHÔNG giải thích gì thêm ngoài JSON.
";
        }

        private async Task<(int MatchScore, string Recommendation)> CallOllamaApiAsync(string prompt, string baseUrl, string model)
        {
            var url = $"{baseUrl.TrimEnd('/')}/api/generate";
            var requestBody = new
            {
                model = model,
                prompt = prompt,
                stream = false,
                format = "json"
            };

            var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            
            var response = await _httpClient.PostAsync(url, jsonContent);
            var responseString = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new Exception($"Ollama error: {response.StatusCode} - {responseString}");
            }

            // Parse response từ Ollama
            using var document = JsonDocument.Parse(responseString);
            var root = document.RootElement;
            
            if (root.TryGetProperty("response", out var aiResponse))
            {
                var textResponse = aiResponse.GetString()?.Trim() ?? string.Empty;
                
                try
                {
                    var resultObj = JsonDocument.Parse(textResponse).RootElement;
                    int score = resultObj.TryGetProperty("score", out var s) ? s.GetInt32() : 0;
                    string rec = resultObj.TryGetProperty("recommendation", out var r) ? r.GetString() ?? "" : "";
                    
                    return (score, rec);
                }
                catch (Exception ex)
                {
                    return (0, $"Lỗi parse JSON từ Ollama: {ex.Message}. Raw: {textResponse}");
                }
            }

            return (0, "Ollama không trả về trường 'response'.");
        }
    }
}