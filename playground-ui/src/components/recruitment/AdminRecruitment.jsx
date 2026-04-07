import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Briefcase, Users, Plus, Edit, Trash, Activity, CheckCircle, Mail, Clock } from 'lucide-react';

import toast from 'react-hot-toast';

export default function AdminRecruitment({ onBack }) {
    const [activeTab, setActiveTab] = useState('jobs'); // 'jobs', 'applications'
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Job Form
    const [showJobModal, setShowJobModal] = useState(false);
    const [editJob, setEditJob] = useState(null);
    const [jobForm, setJobForm] = useState({ title: '', description: '', requirements: '', location: '', salaryRange: '', isActive: true });

    // Applications Support
    const [selectedJobId, setSelectedJobId] = useState('');
    const [applications, setApplications] = useState([]);
    const [appsLoading, setAppsLoading] = useState(false);
    const [appFilter, setAppFilter] = useState('all'); // 'all', 'high_match', 'archived'

    // AI Criteria Form
    const [showCriteriaModal, setShowCriteriaModal] = useState(false);
    const [currentJobForCriteria, setCurrentJobForCriteria] = useState(null);
    const [criteriaForm, setCriteriaForm] = useState({ mustHaveSkills: '', niceToHaveSkills: '', minYearsOfExperience: 0, otherRequirements: '' });
    const [criteriaLoading, setCriteriaLoading] = useState(false);

    useEffect(() => {
        loadJobs();
    }, []);

    const loadJobs = async () => {
        try {
            const res = await api.get('/HRRecruitment/jobs');
            setJobs(res.data);
            if (res.data.length > 0 && !selectedJobId) {
                setSelectedJobId(res.data[0].id);
            }
        } catch (error) {
            toast.error('Lỗi tải danh sách công việc');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'applications' && selectedJobId) {
            loadApplications();
        }
    }, [activeTab, selectedJobId]);

    const loadApplications = async () => {
        setAppsLoading(true);
        try {
            const res = await api.get(`/HRRecruitment/jobs/${selectedJobId}/applications`);
            setApplications(res.data);
        } catch (error) {
            toast.error('Lỗi tải danh sách hồ sơ');
        } finally {
            setAppsLoading(false);
        }
    };

    const handleSaveJob = async () => {
        try {
            if (editJob) {
                await api.put(`/HRRecruitment/jobs/${editJob.id}`, jobForm);
                toast.success('Cập nhật thành công');
            } else {
                await api.post('/HRRecruitment/jobs', jobForm);
                toast.success('Thêm mới thành công');
            }
            setShowJobModal(false);
            setEditJob(null);
            loadJobs();
        } catch (error) {
            toast.error('Có lỗi xảy ra khi lưu');
        }
    };

    const handleOpenCriteria = async (job) => {
        setCurrentJobForCriteria(job);
        setCriteriaLoading(true);
        setShowCriteriaModal(true);
        
        try {
            const res = await api.get(`/JobCriteria/job/${job.id}`);
            if (res.data) {
                setCriteriaForm({
                    mustHaveSkills: res.data.mustHaveSkills || '',
                    niceToHaveSkills: res.data.niceToHaveSkills || '',
                    minYearsOfExperience: res.data.minYearsOfExperience || 0,
                    otherRequirements: res.data.otherRequirements || ''
                });
            }
        } catch (err) {
            // It's normal to get 404 if criteria doesn't exist yet
            setCriteriaForm({ mustHaveSkills: '', niceToHaveSkills: '', minYearsOfExperience: 0, otherRequirements: '' });
        } finally {
            setCriteriaLoading(false);
        }
    };

    const handleSaveCriteria = async () => {
        if (!criteriaForm.mustHaveSkills.trim()) {
            return toast.error("Vui lòng nhập kỹ năng bắt buộc");
        }
        
        const payload = {
            jobPostingId: currentJobForCriteria.id,
            ...criteriaForm
        };

        const t = toast.loading('Đang lưu tiêu chí AI...');
        try {
            await api.post('/JobCriteria', payload);
            toast.success('Lưu tiêu chí thành công', { id: t });
            setShowCriteriaModal(false);
        } catch (error) {
            toast.error('Lỗi khi lưu tiêu chí', { id: t });
        }
    };

    const runAiScreening = async (appId) => {
        const t = toast.loading('AI đang phân tích CV...');
        try {
            await api.post(`/HRRecruitment/applications/${appId}/screen`);
            toast.success('Phân tích hoàn tất', { id: t });
            loadApplications();
        } catch (error) {
            toast.error('Lỗi khi chạy AI', { id: t });
            loadApplications(); // Reload to show the error message in the card
        }
    };

    const runAiScreeningAll = async () => {
        // Consider applications "new" if they haven't been analyzed OR if they had a previous error
        const pendingApps = applications.filter(app => 
            app.aiMatchScore === null || 
            (app.aiMatchScore === 0 && app.aiRecommendation && app.aiRecommendation.includes('Lỗi'))
        );
        
        if (pendingApps.length === 0) {
            return toast.error('Không có hồ sơ nào mới cần phân tích');
        }

        const t = toast.loading(`Đang phân tích bộ ${pendingApps.length} hồ sơ...`);
        let successCount = 0;
        let failCount = 0;

        for (const app of pendingApps) {
            try {
                const res = await api.post(`/HRRecruitment/applications/${app.id}/screen`);
                if (res.data && res.data.aiMatchScore > 0) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (error) {
                failCount++;
            }
        }

        toast.success(`Hoàn tất: ${successCount} thành công, ${failCount} thất bại`, { id: t });
        loadApplications();
    };

    const sendAcceptance = async (appId) => {
        const t = toast.loading('Đang gửi email trúng tuyển & cập nhật trạng thái...');
        try {
            const res = await api.post(`/HRRecruitment/applications/${appId}/accept`);
            toast.success(res.data.message || 'Thành công', { id: t });
            loadApplications();
        } catch (error) {
            toast.error('Lỗi xử lý', { id: t });
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8">
            <div className="flex items-center gap-4 mb-6">

                <div>
                    <p className="text-slate-500 text-sm">Quản trị viên / Nhân sự</p>
                </div>
            </div>

            {/* Custom Tabs */}
            <div className="flex gap-2 p-1.5 bg-slate-100/80 w-fit rounded-xl border border-slate-200 backdrop-blur-sm shadow-inner mb-6">
                <button
                    onClick={() => setActiveTab('jobs')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300
                        ${activeTab === 'jobs' 
                            ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                    <Briefcase className="w-4 h-4" />
                    Tin tuyển dụng
                </button>
                <button
                    onClick={() => setActiveTab('applications')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300
                        ${activeTab === 'applications' 
                            ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                    <Users className="w-4 h-4" />
                    Hồ sơ ứng viên
                </button>
            </div>

            {activeTab === 'jobs' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-indigo-500" />
                            Danh sách công việc
                        </h2>
                        <button onClick={() => { setEditJob(null); setJobForm({ title: '', description: '', requirements: '', location: '', salaryRange: '', isActive: true }); setShowJobModal(true); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-indigo-200">
                            <Plus className="w-4 h-4" /> Thêm mới
                        </button>
                    </div>
                    
                    {loading ? <div className="p-8 text-center text-slate-400">Đang tải...</div> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                        <th className="px-6 py-4">Vị trí</th>
                                        <th className="px-6 py-4">Địa điểm</th>
                                        <th className="px-6 py-4">Mức lương</th>
                                        <th className="px-6 py-4">Trạng thái</th>
                                        <th className="px-6 py-4">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                    {jobs.map(job => (
                                        <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 text-slate-800">{job.title}</td>
                                            <td className="px-6 py-4">{job.location}</td>
                                            <td className="px-6 py-4 text-emerald-600">{job.salaryRange}</td>
                                            <td className="px-6 py-4">
                                                {job.isActive ? <span className="text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded text-xs">Mở</span> : <span className="text-rose-500 bg-rose-50 px-2.5 py-1 rounded text-xs">Đóng</span>}
                                            </td>
                                            <td className="px-6 py-4 flex gap-2">
                                                <button onClick={() => { setEditJob(job); setJobForm(job); setShowJobModal(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Sửa tin"><Edit className="w-4 h-4"/></button>
                                                <button onClick={() => handleOpenCriteria(job)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Thiết lập Tiêu chí AI">
                                                    <Activity className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'applications' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="w-full sm:max-w-xs">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Lọc theo Vị trí ứng tuyển</label>
                            <select 
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                value={selectedJobId}
                                onChange={(e) => setSelectedJobId(e.target.value)}
                            >
                                {jobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
                            </select>
                        </div>

                        <div className="flex items-end flex-wrap gap-2">
                            <button 
                                onClick={() => setAppFilter('all')}
                                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${appFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                            >
                                Tất cả CV
                            </button>
                            <button 
                                onClick={() => setAppFilter('high_match')}
                                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${appFilter === 'high_match' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50'}`}
                            >
                                <span className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    Nổi bật (AI &gt;= 90%)
                                </span>
                            </button>
                            <button 
                                onClick={() => setAppFilter('archived')}
                                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${appFilter === 'archived' ? 'bg-slate-500 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                            >
                                Lưu trữ (AI &lt; 90%)
                            </button>
                            
                            <button 
                                onClick={runAiScreeningAll}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all flex items-center gap-2 shadow-sm"
                            >
                                <Activity className="w-4 h-4" />
                                Phân tích tất cả CV mới
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {appsLoading ? (
                            <div className="col-span-full p-8 text-center text-slate-400">Đang tải hồ sơ...</div>
                        ) : applications.filter(app => {
                            if (appFilter === 'high_match') return app.aiMatchScore >= 90;
                            if (appFilter === 'archived') return app.aiMatchScore !== null && app.aiMatchScore < 90;
                            return true;
                        }).length === 0 ? (
                            <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 border-dashed text-slate-500">
                                {applications.length === 0 ? 'Chưa có hồ sơ ứng tuyển nào cho vị trí này.' : 'Không có hồ sơ nào phù hợp với bộ lọc.'}
                            </div>
                        ) : (
                            applications.filter(app => {
                                if (appFilter === 'high_match') return app.aiMatchScore >= 90;
                                if (appFilter === 'archived') return app.aiMatchScore !== null && app.aiMatchScore < 90;
                                return true;
                            }).map(app => (
                                <div key={app.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-indigo-500 transition-colors"></div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg">{app.candidateName}</h3>
                                            <p className="text-sm text-slate-500">{app.candidateEmail}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 mb-6 text-sm">
                                        <p className="flex justify-between border-b border-slate-50 pb-1">
                                            <span className="text-slate-500">Trạng thái:</span>
                                            <span className="font-bold">
                                                {app.status === 0 ? 'Pending' : 
                                                 app.status === 1 ? 'Screening' : 
                                                 app.status === 2 ? 'Matching' : 
                                                 app.status === 3 ? 'Not Matching' : 
                                                 app.status === 4 ? 'Accepted' : 
                                                 'Rejected'}
                                            </span>
                                        </p>
                                        <p className="flex justify-between border-b border-slate-50 pb-1">
                                            <span className="text-slate-500">AI Score:</span>
                                            <span className={`font-bold ${app.aiMatchScore >= 70 ? 'text-emerald-500' : app.aiMatchScore ? 'text-amber-500' : 'text-slate-400'}`}>
                                                {app.aiMatchScore !== null ? `${app.aiMatchScore}%` : 'Chưa phân tích'}
                                            </span>
                                        </p>
                                    </div>

                                    {app.aiRecommendation && (
                                        <div className="mb-6 p-3 bg-indigo-50 rounded-xl text-xs text-indigo-800 leading-relaxed border border-indigo-100 italic">
                                            "{app.aiRecommendation}"
                                        </div>
                                    )}

                                    <div className="flex gap-2 justify-end">
                                        <a href={`http://localhost:5253${app.cvFilePath}`} target="_blank" rel="noreferrer" className="flex-1 py-2 text-center text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200">
                                            Xem CV
                                        </a>
                                        {/* Show AI button if not analyzed, or if score < 100 for re-run */}
                                        <button 
                                            onClick={() => runAiScreening(app.id)} 
                                            className="flex items-center gap-2 px-3 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100" 
                                            title="Trợ lý AI Phân tích CV"
                                        >
                                            <Activity className="w-4 h-4" />
                                            <span className="text-[10px] font-bold uppercase">AI Phân tích</span>
                                        </button>
                                        {/* Accept and send email */}
                                        {app.aiMatchScore >= 90 && app.status !== 4 && (
                                            <button onClick={() => sendAcceptance(app.id)} className="flex items-center justify-center p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-100" title="Duyệt & Gửi Email Offer">
                                                <Mail className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {showJobModal && (
                <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-xl font-bold">{editJob ? 'Cập nhật tin tuyển dụng' : 'Tạo tin tuyển dụng'}</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Vị trí *</label>
                                <input className="w-full p-2.5 border rounded-lg" value={jobForm.title} onChange={e => setJobForm({...jobForm, title: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Khu vực</label>
                                    <input className="w-full p-2.5 border rounded-lg" value={jobForm.location} onChange={e => setJobForm({...jobForm, location: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Mức lương</label>
                                    <input className="w-full p-2.5 border rounded-lg" value={jobForm.salaryRange} onChange={e => setJobForm({...jobForm, salaryRange: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Mô tả công việc</label>
                                <textarea rows="4" className="w-full p-2.5 border rounded-lg" value={jobForm.description} onChange={e => setJobForm({...jobForm, description: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Yêu cầu</label>
                                <textarea rows="3" className="w-full p-2.5 border rounded-lg" value={jobForm.requirements} onChange={e => setJobForm({...jobForm, requirements: e.target.value})} />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="isActive" checked={jobForm.isActive} onChange={e => setJobForm({...jobForm, isActive: e.target.checked})} className="w-4 h-4" />
                                <label htmlFor="isActive" className="text-sm font-medium">Đang mở tuyển dụng</label>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
                            <button onClick={() => setShowJobModal(false)} className="px-6 py-2 rounded-lg font-medium bg-slate-100 text-slate-600">Hủy</button>
                            <button onClick={handleSaveJob} className="px-6 py-2 rounded-lg font-bold bg-indigo-600 text-white">Lưu lại</button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Criteria Modal */}
            {showCriteriaModal && (
                <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-indigo-100 bg-indigo-50/50">
                            <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-indigo-600" />
                                Thiết lập Tiêu chí AI CV Matching
                            </h2>
                            <p className="text-sm text-indigo-600/80 mt-1">
                                Vị trí: <span className="font-semibold">{currentJobForCriteria?.title}</span>
                            </p>
                        </div>
                        
                        {criteriaLoading ? (
                            <div className="p-12 text-center text-slate-500">Đang tải cấu hình...</div>
                        ) : (
                            <div className="p-6 space-y-5">
                                <div className="p-4 bg-blue-50 text-blue-800 text-sm rounded-xl border border-blue-100 flex gap-3 items-start">
                                    <Clock className="w-5 h-5 flex-shrink-0 text-blue-500 mt-0.5" />
                                    <div>
                                        AI sẽ sử dụng các tiêu chí này làm thước đo để tự động chấm điểm CV của ứng viên (thang điểm 100). 
                                        Kỹ năng bắt buộc (Must have) vô cùng quan trọng đối với điểm số.
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">
                                        Kỹ năng bắt buộc (Must have) <span className="text-red-500">*</span>
                                    </label>
                                    <textarea 
                                        rows="3" 
                                        placeholder="Ví dụ: C#, .NET 8, ReactJS, SQL Server"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors" 
                                        value={criteriaForm.mustHaveSkills} 
                                        onChange={e => setCriteriaForm({...criteriaForm, mustHaveSkills: e.target.value})} 
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">
                                        Kỹ năng ưu tiên (Nice to have)
                                    </label>
                                    <textarea 
                                        rows="2" 
                                        placeholder="Ví dụ: Biết Docker, Redis là một lợi thế"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors" 
                                        value={criteriaForm.niceToHaveSkills} 
                                        onChange={e => setCriteriaForm({...criteriaForm, niceToHaveSkills: e.target.value})} 
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">
                                        Số năm kinh nghiệm tối thiểu
                                    </label>
                                    <input 
                                        type="number"
                                        min="0"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors" 
                                        value={criteriaForm.minYearsOfExperience} 
                                        onChange={e => setCriteriaForm({...criteriaForm, minYearsOfExperience: parseInt(e.target.value) || 0})} 
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">
                                        Yêu cầu khác
                                    </label>
                                    <textarea 
                                        rows="2" 
                                        placeholder="Ví dụ: Tốt nghiệp Đại học, tiếng Anh TOEIC 600+"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors" 
                                        value={criteriaForm.otherRequirements} 
                                        onChange={e => setCriteriaForm({...criteriaForm, otherRequirements: e.target.value})} 
                                    />
                                </div>
                            </div>
                        )}
                        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end items-center bg-slate-50/50">
                            <button onClick={() => setShowCriteriaModal(false)} className="px-6 py-2.5 rounded-xl font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
                                Đóng
                            </button>
                            <button 
                                onClick={handleSaveCriteria} 
                                disabled={criteriaLoading}
                                className="px-6 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 disabled:opacity-50"
                            >
                                Lưu cấu hình AI
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
