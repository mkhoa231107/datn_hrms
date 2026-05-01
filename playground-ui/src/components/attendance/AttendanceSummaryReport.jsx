import React, { useState, useEffect } from 'react';
import { Download, Search, Filter, AlertCircle, RefreshCw, ChevronLeft } from 'lucide-react';
import { api, departmentService } from '../../api';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';

export default function AttendanceSummaryReport({ user, onBack }) {
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [departmentId, setDepartmentId] = useState('');
    const [departments, setDepartments] = useState([]);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Sort state
    const [sortConfig, setSortConfig] = useState({ key: 'EmployeeName', direction: 'asc' });

    useEffect(() => {
        fetchDepartments();
    }, []);

    useEffect(() => {
        fetchReport();
    }, [month, departmentId]);

    const fetchDepartments = async () => {
        try {
            const depts = await departmentService.getAll();
            setDepartments(depts);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await api.get('/attendance/report/summary', {
                params: {
                    month,
                    departmentId: departmentId || null,
                    page: 1,
                    limit: 1000 // Get all for client-side display/sort
                }
            });
            setData(res.data.data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi tải báo cáo');
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedItems = React.useMemo(() => {
        if (!data?.items) return [];
        let sortableItems = [...data.items];
        sortableItems.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        return sortableItems;
    }, [data?.items, sortConfig]);

    // Group items by department for the view
    const groupedItems = React.useMemo(() => {
        const groups = {};
        sortedItems.forEach(item => {
            if (!groups[item.departmentName]) {
                groups[item.departmentName] = [];
            }
            groups[item.departmentName].push(item);
        });
        return groups;
    }, [sortedItems]);

    const exportToExcel = async () => {
        if (!data?.items || data.items.length === 0) {
            toast.error('Không có dữ liệu để xuất');
            return;
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Báo Cáo Chấm Công');

            // Add Header
            worksheet.columns = [
                { header: 'STT', key: 'stt', width: 5 },
                { header: 'Họ và tên', key: 'name', width: 25 },
                { header: 'Mã NV', key: 'code', width: 15 },
                { header: 'Phòng ban', key: 'dept', width: 25 },
                { header: 'Ngày công chuẩn', key: 'stdDays', width: 15 },
                { header: 'Ngày công thực tế', key: 'actualDays', width: 15 },
                { header: 'Giờ tăng ca (OT)', key: 'ot', width: 15 },
                { header: 'Nghỉ phép', key: 'leave', width: 10 },
                { header: 'Đi trễ/Về sớm', key: 'late', width: 15 },
                { header: 'Tỷ lệ đúng giờ (%)', key: 'ontime', width: 15 },
            ];

            // Style Header
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4F46E5' } // Indigo-600
            };
            worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

            let rowIndex = 2;
            Object.keys(groupedItems).forEach(deptName => {
                const items = groupedItems[deptName];
                
                // Add dept header row
                const deptRow = worksheet.addRow([deptName]);
                deptRow.font = { bold: true };
                deptRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
                worksheet.mergeCells(`A${rowIndex}:J${rowIndex}`);
                rowIndex++;

                let deptStd = 0, deptActual = 0, deptOT = 0, deptLeave = 0, deptLate = 0;

                items.forEach((item, index) => {
                    deptStd += item.totalWorkingDays;
                    deptActual += item.actualWorkingDays;
                    deptOT += item.totalOvertimeHours;
                    deptLeave += item.totalLeaveDays;
                    deptLate += item.lateOrEarlyCount;

                    worksheet.addRow({
                        stt: index + 1,
                        name: item.employeeName,
                        code: item.employeeCode,
                        dept: item.departmentName,
                        stdDays: item.totalWorkingDays,
                        actualDays: item.actualWorkingDays,
                        ot: item.totalOvertimeHours,
                        leave: item.totalLeaveDays,
                        late: item.lateOrEarlyCount,
                        ontime: item.onTimePercentage
                    });
                    rowIndex++;
                });

                // Add summary row for department
                const summaryRow = worksheet.addRow({
                    stt: '', name: 'Tổng cộng', code: '', dept: '',
                    stdDays: deptStd, actualDays: deptActual, ot: deptOT, leave: deptLeave, late: deptLate, ontime: ''
                });
                summaryRow.font = { bold: true, color: { argb: 'FF0D9488' } }; // Teal
                summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
                rowIndex++;
            });

            // Auto fit column widths
            worksheet.columns.forEach(column => {
                column.alignment = { vertical: 'middle', horizontal: 'left' };
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `BaoCaoChamCong_${month}.xlsx`;
            anchor.click();
            window.URL.revokeObjectURL(url);
            
            toast.success('Xuất file Excel thành công');
        } catch (error) {
            console.error(error);
            toast.error('Lỗi khi xuất file Excel');
        }
    };

    const renderSortIcon = (key) => {
        if (sortConfig.key !== key) return null;
        return <span className="ml-1 text-indigo-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-up pb-10">
            {/* Header */}
            <div className="flex items-center gap-4 mb-2">
                <button 
                    onClick={onBack}
                    className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Báo Cáo Tổng Hợp Chấm Công</h1>
                    <p className="text-sm text-slate-500">Xem và xuất báo cáo chấm công toàn công ty theo tháng</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tháng</label>
                        <input
                            type="month"
                            className="input w-48 font-bold text-slate-700"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phòng ban</label>
                        <select
                            className="input w-64"
                            value={departmentId}
                            onChange={(e) => setDepartmentId(e.target.value)}
                        >
                            <option value="">Tất cả phòng ban</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.departmentName}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-end gap-2 mt-auto">
                    <button onClick={fetchReport} className="btn btn-ghost border-slate-200 text-slate-600 hover:bg-slate-50 !p-3" title="Làm mới">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={exportToExcel} className="btn btn-primary !px-6 bg-emerald-600 hover:bg-emerald-700 border-none shadow-lg shadow-emerald-600/20">
                        <Download size={18} /> Xuất Excel
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="card !p-0 overflow-hidden shadow-sm border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('employeeName')}>
                                    Họ và tên {renderSortIcon('employeeName')}
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500">Mã NV</th>
                                <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('totalWorkingDays')}>
                                    Công chuẩn {renderSortIcon('totalWorkingDays')}
                                </th>
                                <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('actualWorkingDays')}>
                                    Thực tế {renderSortIcon('actualWorkingDays')}
                                </th>
                                <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('totalOvertimeHours')}>
                                    Giờ OT {renderSortIcon('totalOvertimeHours')}
                                </th>
                                <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('totalLeaveDays')}>
                                    Nghỉ phép {renderSortIcon('totalLeaveDays')}
                                </th>
                                <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('lateOrEarlyCount')}>
                                    Trễ/Sớm {renderSortIcon('lateOrEarlyCount')}
                                </th>
                                <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('onTimePercentage')}>
                                    Đúng giờ {renderSortIcon('onTimePercentage')}
                                </th>
                            </tr>
                        </thead>
                        
                        {loading ? (
                            <tbody>
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={8} className="p-4"><div className="skeleton h-10 w-full rounded"></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        ) : !data?.items?.length ? (
                            <tbody>
                                <tr>
                                    <td colSpan={8} className="p-12 text-center">
                                        <AlertCircle size={48} className="mx-auto text-slate-300 mb-3" />
                                        <p className="text-slate-500 font-medium">Không tìm thấy dữ liệu chấm công cho bộ lọc này.</p>
                                    </td>
                                </tr>
                            </tbody>
                        ) : (
                            Object.keys(groupedItems).map(deptName => {
                                const items = groupedItems[deptName];
                                
                                let deptStd = 0, deptActual = 0, deptOT = 0, deptLeave = 0, deptLate = 0;
                                items.forEach(i => {
                                    deptStd += i.totalWorkingDays;
                                    deptActual += i.actualWorkingDays;
                                    deptOT += i.totalOvertimeHours;
                                    deptLeave += i.totalLeaveDays;
                                    deptLate += i.lateOrEarlyCount;
                                });

                                return (
                                    <tbody key={deptName} className="border-b-2 border-slate-200 last:border-b-0">
                                        {/* Group Header */}
                                        <tr className="bg-slate-100">
                                            <td colSpan={8} className="px-4 py-2 font-bold text-indigo-700 text-sm">
                                                Phòng: {deptName}
                                            </td>
                                        </tr>
                                        
                                        {/* Group Items */}
                                        {items.map((item, idx) => (
                                            <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-slate-700 text-sm">{item.employeeName}</div>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-500 font-mono bg-slate-50 rounded">#{item.employeeCode}</td>
                                                <td className="px-4 py-3 text-right text-sm font-medium text-slate-600">{item.totalWorkingDays}</td>
                                                <td className="px-4 py-3 text-right text-sm font-bold text-indigo-600">{item.actualWorkingDays}</td>
                                                <td className="px-4 py-3 text-right text-sm font-medium text-slate-600">{item.totalOvertimeHours > 0 ? <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">+{item.totalOvertimeHours}</span> : '-'}</td>
                                                <td className="px-4 py-3 text-right text-sm font-medium text-slate-600">{item.totalLeaveDays > 0 ? <span className="text-amber-600">{item.totalLeaveDays}</span> : '-'}</td>
                                                <td className="px-4 py-3 text-right text-sm font-medium text-slate-600">{item.lateOrEarlyCount > 0 ? <span className="text-rose-500">{item.lateOrEarlyCount}</span> : '-'}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="inline-flex items-center justify-end gap-2">
                                                        <span className="text-sm font-bold text-slate-700">{item.onTimePercentage}%</span>
                                                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full ${item.onTimePercentage >= 95 ? 'bg-emerald-500' : item.onTimePercentage >= 80 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                                style={{ width: `${item.onTimePercentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Group Summary Row */}
                                        <tr className="bg-indigo-50/50">
                                            <td colSpan={2} className="px-4 py-3 text-right text-sm font-bold text-indigo-700">Tổng cộng {deptName}:</td>
                                            <td className="px-4 py-3 text-right text-sm font-bold text-indigo-700">{deptStd}</td>
                                            <td className="px-4 py-3 text-right text-sm font-bold text-indigo-700">{deptActual}</td>
                                            <td className="px-4 py-3 text-right text-sm font-bold text-indigo-700">{deptOT}</td>
                                            <td className="px-4 py-3 text-right text-sm font-bold text-indigo-700">{deptLeave}</td>
                                            <td className="px-4 py-3 text-right text-sm font-bold text-indigo-700">{deptLate}</td>
                                            <td className="px-4 py-3"></td>
                                        </tr>
                                    </tbody>
                                );
                            })
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
