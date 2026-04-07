import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { FileText, Clock, CheckCircle, XCircle, BrainCircuit } from 'lucide-react';


export default function MyApplications({ onBack }) {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/CandidateApplications/my')
            .then(res => setApplications(res.data))
            .finally(() => setLoading(false));
    }, []);

    const getStatusBadge = (status) => {
        const badges = {
            0: <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> Chờ xử lý</span>, // Pending
            1: <span className="px-2.5 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-bold flex items-center gap-1"><BrainCircuit className="w-3 h-3"/> AI đang lọc</span>, // Screening
            2: <span className="px-2.5 py-1 bg-emerald-100 text-emerald-600 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Phù hợp</span>, // Matching
            3: <span className="px-2.5 py-1 bg-rose-100 text-rose-600 rounded-full text-xs font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> Chưa phù hợp</span>, // NotMatching
            4: <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Đã trúng tuyển</span>, // HRApproved
            5: <span className="px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> Đã từ chối</span>, // HRRejected
        };
        return badges[status] || badges[0];
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <div className="flex items-center gap-4 mb-8">

                <div>
                    <p className="text-slate-500 text-sm">Theo dõi trạng thái các vị trí mà bạn đã nộp CV</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center p-8 text-slate-500 animate-pulse">Đang tải...</div>
            ) : applications.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-1">Chưa có hồ sơ nào</h3>
                    <p className="text-slate-500 text-sm">Bạn chưa ứng tuyển vị trí nào. Hãy về trang Cơ hội việc làm để bắt đầu.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="divide-y divide-slate-100">
                        {applications.map(app => (
                            <div key={app.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                                <div>
                                    <h4 className="font-bold text-slate-800 text-lg mb-1">{app.jobPostingTitle}</h4>
                                    <p className="text-xs text-slate-500 flex items-center gap-3">
                                        <span>Ngày nộp: {new Date(app.appliedAt).toLocaleDateString('vi-VN')}</span>
                                        {app.aiMatchScore != null && (
                                            <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">AI Match: {app.aiMatchScore}%</span>
                                        )}
                                    </p>
                                </div>
                                <div className="shrink-0">
                                    {getStatusBadge(app.status)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
