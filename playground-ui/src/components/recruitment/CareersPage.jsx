import React, { useState, useEffect } from 'react';
import { api, authService } from '../../api';
import { 
    Briefcase, MapPin, DollarSign, Clock, ChevronRight, UploadCloud, Globe, CheckCircle, 
    Search, Filter, ChevronLeft, Star, Users, Award, Zap, Phone, Mail, MessageSquare, LayoutGrid, LogOut
} from 'lucide-react';
import BackButton from '../layout/BackButton';
import toast from 'react-hot-toast';
import CandidateAuthModal from './CandidateAuthModal';

const CareersPage = ({ onBack, onLoginClick, candidateUser: candidateUserProp, onCandidateLogin, onCandidateLogout }) => {
    const [jobs, setJobs] = useState([]);
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState(null);
    const [applying, setApplying] = useState(false);
    
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', cv: null, coverLetter: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState('home'); // home, recruitment, news, contact
    const jobsPerPage = 5;

    // Auth state for candidate (ứng viên bên ngoài)
    const [candidateUser, setCandidateUser] = useState(candidateUserProp || null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [pendingJob, setPendingJob] = useState(null); // job being applied after login

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [jobsRes, newsRes] = await Promise.all([
                api.get('/PublicCareers/jobs'),
                api.get('/PublicCareers/news')
            ]);
            setJobs(jobsRes.data);
            setNews(newsRes.data);
        } catch (error) {
            toast.error('Lỗi khi tải dữ liệu tuyển dụng');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (e) => {
        e.preventDefault();
        if (!formData.cv) return toast.error('Vui lòng đính kèm CV (PDF)');

        try {
            const fd = new FormData();
            fd.append('JobPostingId', selectedJob.id);
            fd.append('CandidateName', formData.name);
            fd.append('CandidateEmail', formData.email);
            fd.append('CandidatePhone', formData.phone);
            fd.append('CVFile', formData.cv);
            fd.append('CoverLetter', formData.coverLetter);

            await api.post('/CandidateApplications', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            toast.success('Ứng tuyển thành công! Cảm ơn bạn đã quan tâm.');
            setApplying(false);
            setSelectedJob(null);
            setFormData({ name: '', email: '', phone: '', cv: null, coverLetter: '' });
        } catch (error) {
            if (error.response?.status === 401) {
                toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                handleCandidateLogout();
            } else {
                toast.error('Lỗi khi gửi hồ sơ ứng tuyển');
            }
        }
    };

    // Auth helpers
    const handleApplyClick = (job) => {
        if (!candidateUser) {
            setPendingJob(job);
            setShowAuthModal(true);
        } else {
            setSelectedJob(job);
            setApplying(true);
            // Pre-fill form with candidate info
            setFormData(prev => ({
                ...prev,
                name: candidateUser.fullName || prev.name,
                email: candidateUser.email || prev.email,
            }));
        }
    };

    const handleAuthSuccess = (userData) => {
        setCandidateUser(userData);
        setShowAuthModal(false);
        if (onCandidateLogin) onCandidateLogin(userData);
        if (pendingJob) {
            setSelectedJob(pendingJob);
            setApplying(true);
            setFormData(prev => ({
                ...prev,
                name: userData.fullName || prev.name,
                email: userData.email || prev.email,
            }));
            setPendingJob(null);
        } else {
            toast.success(`Đăng nhập thành công, ${userData.fullName}!`);
        }
    };

    const handleCandidateLogout = () => {
        authService.logout();
        setCandidateUser(null);
        if (onCandidateLogout) onCandidateLogout();
        toast.success('Đã đăng xuất.');
    };

    // Dữ liệu mẫu hiển thị nếu chưa có bài post thật trong DB
    const displayJobs = jobs.length > 0 ? jobs : [
        { id: 'demo1', title: 'Senior Backend Developer (.NET)', location: 'Hà Nội', salaryRange: 'Từ $1,500 - $2,500', description: 'Đảm nhận việc phát triển các tính năng Core API cho hệ thống HRMS Net, tối ưu hóa CSDL SQL Server và tham gia thiết kế System Architecture.', requirements: '- Ít nhất 3 năm kinh nghiệm với .NET Core/EF Core\n- Nắm vững kiến trúc Microservices / Clean Architecture\n- Khả năng làm việc độc lập và xử lý vấn đề độc lập tốt.', closingDate: new Date(Date.now() + 864000000).toISOString() },
        { id: 'demo2', title: 'Chuyên viên Nhân sự (Tuyển dụng & Đào tạo)', location: 'Hồ Chí Minh', salaryRange: '15 - 20 Triệu VNĐ', description: 'Trực tiếp lên kế hoạch tuyển dụng, tìm kiếm nguồn nhân lực chất lượng cao, và hỗ trợ các hoạt động gắn kết nhân sự nội bộ (Teambuilding, Training).', requirements: '- Trình độ Đại học chuyên ngành Quản trị nhân lực hoặc tương đương.\n- Có kỹ năng giao tiếp, thuyết phục xuất sắc.\n- Sử dụng thành thạo các công cụ tin học văn phòng.', closingDate: new Date(Date.now() + 432000000).toISOString() },
        { id: 'demo3', title: 'UI/UX Designer', location: 'Remote / Hybrid', salaryRange: 'Thỏa thuận', description: 'Nghiên cứu hành vi người dùng, thiết kế giao diện (Wireframe, Prototype) và phối hợp cùng team Frontend triển khai các sản phẩm SaaS mang tính đột phá.', requirements: '- Portfolio ấn tượng với các dự án Web App, SaaS.\n- Thành thạo Figma, Sketch, hiểu rõ design systems.\n- Tinh thần sáng tạo và học hỏi không ngừng.', closingDate: new Date(Date.now() + 1200000000).toISOString() }
    ];

    const displayNews = news.length > 0 ? news : [
        { id: 'demo-n1', title: 'HRMS Net vinh dự nhận giải thưởng "Nơi làm việc tốt nhất Châu Á 2026"', publishedAt: new Date().toISOString(), imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=300&auto=format&fit=crop' },
        { id: 'demo-n2', title: 'DX Summit 2026: HRMS Net ra mắt bộ công cụ quản trị nhân sự tích hợp AI thế hệ mới', publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(), imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=300&auto=format&fit=crop' },
        { id: 'demo-n3', title: 'Chương trình Thực tập sinh tài năng "HRMS Net Future Leaders 2026" chính thức mở đơn', publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(), imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=300&auto=format&fit=crop' },
        { id: 'demo-n4', title: 'Workshop: "Chuyển đổi số trong Quản trị nhân sự: Xu hướng và Thách thức"', publishedAt: new Date(Date.now() - 86400000 * 10).toISOString(), imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=300&auto=format&fit=crop' }
    ];

    const categories = ['All', 'Engineering', 'Human Resources', 'Design', 'Sales', 'Marketing'];

    const filteredJobs = displayJobs.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (job.description?.toLowerCase() || "").includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || job.title.includes(categoryFilter) || 
                                (job.description?.includes(categoryFilter));
        return matchesSearch && matchesCategory;
    });

    const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
    const indexOfLastJob = currentPage * jobsPerPage;
    const indexOfFirstJob = indexOfLastJob - jobsPerPage;
    const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);

    const testimonials = [
        { id: 1, name: 'Nguyễn Minh Anh', role: 'Staff Software Engineer', content: 'HRMS Net là môi trường tuyệt vời để phát triển kỹ năng với những bài toán công nghệ thách thức và quy mô lớn.', avatar: 'https://i.pravatar.cc/150?u=a1' },
        { id: 2, name: 'Lê Hoàng Nam', role: 'HR Business Partner', content: 'Văn hóa công ty minh bạch, coi trọng giá trị con người chính là điều khiến tôi gắn bó với HRMS Net.', avatar: 'https://i.pravatar.cc/150?u=a2' },
        { id: 3, name: 'Trần Thu Hà', role: 'Product Designer', content: 'Tại đây, sự sáng tạo không có giới hạn. Tôi được khuyến khích thử nghiệm những trải nghiệm người dùng đột phá.', avatar: 'https://i.pravatar.cc/150?u=a3' }
    ];

    const navItems = [
        { id: 'home', label: 'Trang chủ', icon: Globe },
        { id: 'recruitment', label: 'Tuyển dụng', icon: Briefcase },
        { id: 'news', label: 'Tin tức', icon: LayoutGrid },
        { id: 'contact', label: 'Liên hệ', icon: Phone },
    ];

    // Sub-renderers
    const renderNavbar = () => (
        <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 px-8 py-3 w-full">
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xl">H</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900">HRMS <span className="text-blue-600">Net</span></span>
                </div>

                <div className="hidden md:flex items-center gap-10">
                    <div className="flex items-center gap-8 mr-8">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => {setActiveTab(item.id); setSelectedJob(null); setApplying(false);}}
                                className={`text-[15px] font-bold transition-all relative py-1 ${
                                    activeTab === item.id 
                                    ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-blue-600' 
                                    : 'text-slate-500 hover:text-blue-600'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        {candidateUser ? (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                        {(candidateUser.fullName || candidateUser.username || 'U')[0].toUpperCase()}
                                    </div>
                                    <span className="text-sm font-bold text-blue-700 max-w-[120px] truncate">{candidateUser.fullName || candidateUser.username}</span>
                                </div>
                                <button
                                    onClick={handleCandidateLogout}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg text-sm font-bold transition-all border border-slate-200"
                                >
                                    <LogOut size={14} /> Đăng xuất
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAuthModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 shadow-sm shadow-blue-200"
                            >
                                Đăng nhập / Đăng ký
                            </button>
                        )}
                        <button 
                            onClick={onLoginClick}
                            className="bg-slate-50 hover:bg-slate-100 text-blue-600 px-5 py-2 rounded-lg text-sm font-bold transition-all border border-slate-200 active:scale-95"
                        >
                            Đăng nhập nội bộ
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );

    const renderHome = () => (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-400">
            {/* FPT Style Hero Section */}
            <div className="relative h-[550px] w-full rounded-lg overflow-hidden group">
                <img 
                    src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000" 
                    alt="Workspace" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-slate-900/40 flex flex-col items-center justify-center text-center p-6">
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight leading-tight">
                        Cùng Bạn Kiến Tạo <br/><span className="text-blue-400">Tương Lai Số</span>
                    </h1>
                    <p className="text-white/90 text-lg md:text-xl max-w-2xl font-medium mb-12">
                        Khám phá hàng ngàn cơ hội nghề nghiệp hấp dẫn tại tập đoàn công nghệ hàng đầu Việt Nam.
                    </p>

                    {/* Horizontal Search Bar Overlay */}
                    <div className="w-full max-w-5xl bg-white p-3 rounded-lg shadow-2xl flex flex-col md:flex-row gap-2">
                        <div className="flex-[2] relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-lg focus:ring-0 text-slate-700 font-medium" 
                                placeholder="Vị trí ứng tuyển, từ khóa..." 
                                value={searchQuery}
                                onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}}
                            />
                        </div>
                        <div className="flex-1 border-l border-slate-100 hidden md:flex items-center">
                            <select className="w-full px-6 py-4 bg-white border-none focus:ring-0 text-slate-600 font-semibold appearance-none cursor-pointer">
                                <option>Tất cả chuyên ngành</option>
                                <option>Công nghệ thông tin</option>
                                <option>Kinh doanh</option>
                            </select>
                        </div>
                        <div className="flex-1 border-l border-slate-100 hidden md:flex items-center">
                            <select className="w-full px-6 py-4 bg-white border-none focus:ring-0 text-slate-600 font-semibold appearance-none cursor-pointer">
                                <option>Tất cả địa điểm</option>
                                <option>Hà Nội</option>
                                <option>TP. Hồ Chí Minh</option>
                                <option>Đà Nẵng</option>
                            </select>
                        </div>
                        <button 
                            onClick={() => setActiveTab('recruitment')}
                            className="bg-blue-600 text-white px-10 py-4 rounded-lg font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                        >
                            Tìm kiếm ngay
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-10">
                    <section>
                        <h2 className="text-3xl font-bold text-slate-900 mb-6 tracking-tight">Về chúng tôi</h2>
                        <div className="bg-white rounded-lg p-8 border border-slate-200 shadow-sm leading-relaxed">
                            <p className="text-lg text-slate-600 font-medium mb-8">
                                HRMS Net được thành lập với tầm nhìn trở thành "Hệ điều hành" cho mọi doanh nghiệp muốn tối ưu hóa nguồn lực con người thông qua công nghệ 4.0.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {[
                                    { t: 'Công nghệ AI', d: 'Tích hợp Machine Learning vào quy trình đánh giá và dự báo nhân sự.' },
                                    { t: 'Trải nghiệm số', d: 'Giao diện hiện đại, tối giản, tập trung vào sự tiện lợi của người dùng.' },
                                    { t: 'Bảo mật tuyệt đối', d: 'Hệ thống đạt chuẩn an toàn thông tin quốc tế ISO 27001.' },
                                    { t: 'Hỗ trợ 24/7', d: 'Đội ngũ chuyên gia luôn sẵn sàng đồng hành cùng doanh nghiệp.' },
                                ].map((item, i) => (
                                    <div key={i} className="space-y-1">
                                        <h4 className="font-bold text-blue-600 text-sm">{item.t}</h4>
                                        <p className="text-slate-500 text-sm font-medium leading-relaxed">{item.d}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                <div className="space-y-8">
                    <div className="bg-white rounded-lg p-8 border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-8 flex items-center gap-2 border-b border-slate-100 pb-4">
                            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                            Đội ngũ nhân sự
                        </h3>
                        <div className="space-y-8">
                            {testimonials.map(t => (
                                <div key={t.id} className="relative group">
                                    <div className="flex gap-4 items-start">
                                        <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-lg border border-slate-100 shrink-0 object-cover" />
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm">{t.name}</h4>
                                            <p className="text-[10px] text-blue-600 font-bold mb-2 uppercase tracking-widest">{t.role}</p>
                                            <p className="text-sm text-slate-500 italic leading-snug">"{t.content}"</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderRecruitment = () => {
        if (applying && selectedJob) {
            return (
                <div className="max-w-2xl mx-auto animate-in fade-in duration-400">
                    <button onClick={() => setApplying(false)} className="mb-6 text-slate-500 hover:text-indigo-600 font-bold flex items-center gap-2 transition-colors text-sm">
                        <ChevronLeft className="w-4 h-4" /> Quay lại thông tin vị trí
                    </button>
                    <div className="bg-white rounded-lg border border-slate-200 p-8 md:p-12 shadow-sm">
                        {renderCandidateBanner()}
                        <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Ứng tuyển vị trí</h2>
                        <p className="text-blue-600 font-bold mb-10 text-lg">{selectedJob.title}</p>

                        <form onSubmit={handleApply} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Họ và tên *</label>
                                    <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 transition-all" 
                                        placeholder="Nguyễn Văn A" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Số điện thoại *</label>
                                    <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 transition-all" 
                                        placeholder="0xxxxxxxxx" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Email *</label>
                                <input required type="email" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 transition-all" 
                                    placeholder="email@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Hồ sơ năng lực (CV - PDF) *</label>
                                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-100 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all group">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="p-3 bg-white rounded-lg shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                            <UploadCloud className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <p className="text-sm text-slate-600 font-bold mb-1">Click để tải lên CV (PDF)</p>
                                        <p className="text-xs text-slate-400 font-medium">{formData.cv ? formData.cv.name : 'Dung lượng tối đa 5MB'}</p>
                                    </div>
                                    <input required type="file" accept=".pdf" className="hidden" onChange={e => setFormData({...formData, cv: e.target.files[0]})} />
                                </label>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Thư ngỏ</label>
                                <textarea rows={4} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 transition-all" 
                                    value={formData.coverLetter} onChange={e => setFormData({...formData, coverLetter: e.target.value})} placeholder="Giới thiệu thêm về kinh nghiệm của bạn..." />
                            </div>

                            <div className="pt-6 flex gap-4">
                                <button type="button" onClick={() => setApplying(false)} className="px-8 py-3.5 rounded-lg font-bold text-slate-500 hover:bg-slate-100 transition-colors">Hủy</button>
                                <button type="submit" className="flex-1 px-8 py-3.5 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">Gửi hồ sơ ngay</button>
                            </div>
                        </form>
                    </div>
                </div>
            );
        }

        if (selectedJob) {
            return (
                <div className="max-w-4xl mx-auto animate-in fade-in duration-400">
                    <button onClick={() => setSelectedJob(null)} className="mb-6 text-slate-500 hover:text-indigo-600 font-bold flex items-center gap-2 transition-colors text-sm">
                        <ChevronLeft className="w-4 h-4" /> Quay lại danh sách vị trí
                    </button>
                    <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/50">
                        <div className="p-10 border-b border-slate-50 bg-slate-50/30">
                            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-10">
                                <div className="text-center md:text-left">
                                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg mb-4">Hot Job</span>
                                    <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">{selectedJob.title}</h1>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-8 text-sm font-semibold text-slate-500">
                                        <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-600"/> {selectedJob.location || 'Hà Nội'}</span>
                                        <span className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-blue-600"/> {selectedJob.salaryRange || 'Cạnh tranh'}</span>
                                        <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-600"/> {selectedJob.closingDate ? new Date(selectedJob.closingDate).toLocaleDateString('vi-VN') : 'Mới'}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleApplyClick(selectedJob)} className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-lg transition-all shadow-lg shadow-blue-200">
                                    {candidateUser ? 'Ứng tuyển ngay' : '🔐 Đăng nhập để ứng tuyển'}
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-10 md:p-12 space-y-12">
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 border-l-4 border-blue-600 pl-4 py-1">
                                    Mô tả công việc
                                </h3>
                                <div className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap text-base">{selectedJob.description}</div>
                            </div>
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 border-l-4 border-blue-600 pl-4 py-1">
                                    Yêu cầu ứng viên
                                </h3>
                                <div className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap text-base">{selectedJob.requirements}</div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <>
                {/* Sidebar + Main Listing Layout like FPT */}
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10">
                    {/* Left Sidebar Filters */}
                    <div className="lg:w-80 space-y-8">
                        <div className="bg-white p-8 rounded-lg border border-slate-100 shadow-sm">
                            <h4 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-50 pb-4">Lọc ứng tuyển</h4>
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Ngành nghề</p>
                                    <div className="space-y-2">
                                        {categories.map(cat => (
                                            <button 
                                                key={cat}
                                                onClick={() => {setCategoryFilter(cat); setCurrentPage(1);}}
                                                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                                    categoryFilter === cat 
                                                    ? 'bg-blue-50 text-blue-600' 
                                                    : 'text-slate-500 hover:bg-slate-50'
                                                }`}
                                            >
                                                {cat === 'All' ? 'Tất cả lĩnh vực' : cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Listing */}
                    <div className="flex-1 space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                                Tìm thấy <span className="text-blue-600">{filteredJobs.length}</span> vị trí tuyển dụng
                            </h2>
                        </div>
                        
                        {currentJobs.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {currentJobs.map(job => (
                                    <div key={job.id} onClick={() => setSelectedJob(job)} 
                                        className="group bg-white p-8 rounded-lg border border-slate-200 hover:border-blue-300 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight line-clamp-2">{job.title}</h3>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                                    <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                                                    {job.location || 'Hà Nội'}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm font-bold text-blue-600">
                                                    <DollarSign className="w-4 h-4 shrink-0" />
                                                    {job.salaryRange || 'Thỏa thuận'}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{job.closingDate ? `Hạn: ${new Date(job.closingDate).toLocaleDateString('vi-VN')}` : 'Mới cập nhật'}</span>
                                             <button
                                                onClick={(e) => { e.stopPropagation(); handleApplyClick(job); }}
                                                className="px-5 py-2.5 bg-slate-50 group-hover:bg-blue-600 text-slate-400 group-hover:text-white rounded-lg text-xs font-bold transition-all"
                                             >
                                                {candidateUser ? 'Ứng tuyển' : '🔐 Ứng tuyển'}
                                             </button>
                                        </div>
                                    </div>
                                ))}

                                {totalPages > 1 && (
                                    <div className="col-span-1 md:col-span-2 flex items-center justify-center gap-4 pt-12">
                                        <button 
                                            onClick={() => {setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 300, behavior: 'smooth' });}}
                                            disabled={currentPage === 1}
                                            className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 transition-all shadow-sm"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        
                                        {[...Array(totalPages)].map((_, i) => (
                                            <button 
                                                key={i}
                                                onClick={() => {setCurrentPage(i + 1); window.scrollTo({ top: 300, behavior: 'smooth' });}}
                                                className={`w-12 h-12 rounded-lg text-sm font-bold transition-all ${currentPage === i + 1 
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                                                    : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-200'}`}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}

                                        <button 
                                            onClick={() => {setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 300, behavior: 'smooth' });}}
                                            disabled={currentPage === totalPages}
                                            className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 transition-all shadow-sm"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white p-16 rounded-lg text-center border border-slate-200 shadow-sm max-w-2xl mx-auto">
                                <Search className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Không có kết quả</h3>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Hãy thử một từ khóa tìm kiếm khác.</p>
                            </div>
                        )}
                    </div>
                </div>
            </>
        );
    };

    const renderNews = () => (
        <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500">
            <div className="text-center md:text-left mb-12">
                <p className="text-blue-600 font-bold uppercase tracking-widest mb-2 text-xs">Tin tức mới nhất</p>
                <h2 className="text-4xl font-bold text-slate-900 tracking-tight">Sự kiện & Thông báo</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayNews.map(item => (
                    <div key={item.id} className="group bg-white rounded-lg overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
                        <div className="relative h-56 overflow-hidden">
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-60" />
                            <div className="absolute bottom-4 left-4 text-white">
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-1">{new Date(item.publishedAt).toLocaleDateString('vi-VN')}</p>
                                <span className="bg-blue-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase">Tin tức</span>
                            </div>
                        </div>
                        <div className="p-8 space-y-4">
                            <h4 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 line-clamp-2 leading-tight transition-colors">{item.title}</h4>
                            <p className="text-slate-500 font-medium line-clamp-2 text-sm leading-relaxed">Cập nhật những thông tin mới nhất về môi trường làm việc và công nghệ tại HRMS Net.</p>
                            <button className="text-blue-600 font-bold text-sm flex items-center gap-2 group/btn">
                                Xem chi tiết 
                                <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderContact = () => (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 animate-in fade-in duration-500">
            <div className="space-y-12">
                <div>
                    <p className="text-blue-600 font-bold uppercase tracking-widest mb-4 text-sm">Liên hệ ngay</p>
                    <h2 className="text-5xl font-bold text-slate-900 tracking-tight mb-8">Chúng tôi luôn lắng nghe bạn</h2>
                    <p className="text-slate-500 text-lg leading-relaxed font-medium">Mọi thắc mắc về tuyển dụng hoặc giải pháp nhân sự, vui lòng để lại lời nhắn, chúng tôi sẽ phản hồi trong vòng 24h.</p>
                </div>

                <div className="space-y-8">
                    {[
                        { icon: MapPin, t: 'Địa chỉ', d: 'Tòa nhà FPT, Khu Công nghệ cao Quận 9, TP. HCM', c: 'text-blue-600' },
                        { icon: Phone, t: 'Hotline', d: '1900 6606', c: 'text-blue-600' },
                        { icon: Mail, t: 'Email', d: 'recruitment@hrmsnet.vn', c: 'text-blue-600' }
                    ].map((item, i) => (
                        <div key={i} className="flex gap-6 items-start p-8 bg-white rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-all">
                            <div className={`p-4 rounded-lg bg-blue-50 ${item.c}`}>
                                <item.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-lg mb-1">{item.t}</h4>
                                <p className="text-slate-500 font-medium">{item.d}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-lg p-10 md:p-12 border border-slate-100 shadow-xl shadow-slate-200/50">
                <h3 className="text-2xl font-bold text-slate-900 mb-10 tracking-tight">Gửi lời nhắn</h3>
                <form className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Tên của bạn</label>
                        <input className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700" placeholder="Nguyễn Văn A" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Email</label>
                        <input className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700" placeholder="email@example.com" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Lời nhắn</label>
                        <textarea rows={5} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700" placeholder="Tôi muốn hỏi về..." />
                    </div>
                    <button type="submit" className="w-full py-5 bg-blue-600 text-white font-bold text-lg rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                        Gửi lời nhắn ngay
                    </button>
                </form>
            </div>
        </div>
    );

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse font-bold">Đang tải dữ liệu...</div>;

    // Candidate info bar on top of apply form
    const renderCandidateBanner = () => {
        if (!candidateUser) return null;
        return (
            <div className="mb-6 px-6 py-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {(candidateUser.fullName || candidateUser.username || 'U')[0].toUpperCase()}
                </div>
                <div>
                    <p className="text-sm font-bold text-blue-800">{candidateUser.fullName}</p>
                    <p className="text-xs text-blue-500">{candidateUser.email}</p>
                </div>
                <span className="ml-auto text-xs bg-blue-600 text-white px-3 py-1 rounded-lg font-bold">Đã đăng nhập</span>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#fafbff] font-['Plus_Jakarta_Sans'] text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
            {/* Auth Modal */}
            <CandidateAuthModal
                isOpen={showAuthModal}
                onClose={() => { setShowAuthModal(false); setPendingJob(null); }}
                onSuccess={handleAuthSuccess}
                message={pendingJob ? `Đăng nhập để ứng tuyển vị trí: ${pendingJob.title}` : 'Đăng nhập hoặc tạo tài khoản để ứng tuyển'}
            />

            {/* Navbar - Full Width Background */}
            {renderNavbar()}

            {/* Main Content Area - Constrained for readability */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 pb-24">
                {/* Tab Content */}
                <main className="relative pt-2">
                    {activeTab === 'home' && renderHome()}
                    {activeTab === 'recruitment' && renderRecruitment()}
                    {activeTab === 'news' && renderNews()}
                    {activeTab === 'contact' && renderContact()}
                </main>
            </div>

            {/* Smaller, More Compact Footer */}
            <footer className="bg-slate-900 text-white py-12 px-8 mt-12">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="md:col-span-2 space-y-4">
                        <h2 className="text-2xl font-bold tracking-tight">HRMS <span className="text-blue-400">Net</span></h2>
                        <p className="text-slate-400 max-w-sm text-sm leading-relaxed font-medium text-pretty">Nền tảng quản trị nhân sự hàng đầu Việt Nam.</p>
                        <div className="flex gap-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-600 transition-all cursor-pointer group">
                                    <div className="w-4 h-4 bg-slate-400 group-hover:bg-white mask-icon" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-blue-400">Khám phá</h4>
                        <div className="space-y-2">
                            {navItems.map(item => (
                                <button key={item.id} onClick={() => {setActiveTab(item.id); window.scrollTo({top: 0, behavior: 'smooth'});}} className="block text-slate-400 hover:text-white text-sm font-semibold transition-colors">
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-blue-400">Tin tuyển dụng</h4>
                        <p className="text-slate-400 text-xs font-medium">Nhận thông báo việc làm mới nhất.</p>
                        <div className="relative">
                            <input className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all" placeholder="Email của bạn..." />
                            <button className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-blue-600 p-1.5 rounded-lg hover:bg-blue-700 transition-colors shadow-lg">
                                <ChevronRight className="w-3 h-3 text-white" />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest text-center md:text-left">© 2026 HRMS NET. Vận hành bởi bộ phận Tuyển dụng.</p>
                    <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        <span className="hover:text-blue-400 cursor-pointer transition-colors">Chính sách bảo mật</span>
                        <span className="hover:text-blue-400 cursor-pointer transition-colors">Điều khoản sử dụng</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default CareersPage;
