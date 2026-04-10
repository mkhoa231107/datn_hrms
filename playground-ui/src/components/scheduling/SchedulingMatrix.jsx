import React, { useState, useEffect } from 'react';
import {
    Calendar, Save, Plus, Copy, Lock, Unlock, Download, Upload, Search, Users, Clock, Filter, X, Check
} from 'lucide-react';
import { schedulingService, departmentService } from '../../api';
import { getPrimaryRole } from '../layout/Sidebar';

export default function SchedulingMatrix({ user, onBack }) {
    const roles = user?.roles || [];
    const primaryRole = getPrimaryRole(roles);
    const isDepartmentHead = primaryRole === 'DepartmentHead';

    const [myTeam, setMyTeam] = useState(null);
    const [teamError, setTeamError] = useState(null);
    const [periods, setPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState('');
    const [shifts, setShifts] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [matrixData, setMatrixData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [pendingChanges, setPendingChanges] = useState({});

    const [viewMode, setViewMode] = useState(isDepartmentHead ? 'employee' : 'dept');
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [bulkShiftId, setBulkShiftId] = useState('');
    const [bulkFromDate, setBulkFromDate] = useState('');
    const [bulkToDate, setBulkToDate] = useState('');

    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showPatternModal, setShowPatternModal] = useState(false);
    const [selectedEmployeeForPattern, setSelectedEmployeeForPattern] = useState(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [showAutoPanel, setShowAutoPanel] = useState(false);
    const [autoShift1, setAutoShift1] = useState('');
    const [autoShift2, setAutoShift2] = useState('');
    const [autoShift3, setAutoShift3] = useState('');
    const [autoCycleStart, setAutoCycleStart] = useState(() => new Date().toISOString().split('T')[0]);
    const [autoOverwrite, setAutoOverwrite] = useState(false);
    const [autoResult, setAutoResult] = useState(null);
    const [autoLoading, setAutoLoading] = useState(false);
    const [autoError, setAutoError] = useState('');
    const [autoYear, setAutoYear] = useState(new Date().getFullYear());

    const currentRealYear = new Date().getFullYear();
    const permanentBlockStart = 2026 + Math.floor((currentRealYear - 2026) / 3) * 3;
    const availableYears = [permanentBlockStart, permanentBlockStart + 1, permanentBlockStart + 2];

    const isBeforeToday = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return targetDate < today;
    };

    const formatDateInput = (dateStr) => {
        if (!dateStr) return '';
        if (typeof dateStr !== 'string') return '';
        return dateStr.split('T')[0];
    };

    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (isDepartmentHead) {
                    const currentDeptId = user.departmentId || user.DepartmentId;
                    if (!currentDeptId) {
                        setTeamError("Bạn chưa được gán bộ phận hoặc lỗi thông tin tài khoản.");
                        setLoading(false);
                        return;
                    }
                    const [pResult, sResult, deptResult] = await Promise.all([
                        schedulingService.getPeriods(),
                        schedulingService.getShifts(),
                        departmentService.getById(currentDeptId)
                    ]);
                    setPeriods(pResult);
                    setShifts(sResult);
                    setMyTeam(deptResult);
                    setSelectedDept(String(deptResult.id));
                    setDepartments([{ id: deptResult.id, departmentName: deptResult.departmentName }]);

                    const activePeriods = pResult.filter(p => !isBeforeToday(p.endDate));
                    if (activePeriods.length > 0) {
                        setSelectedPeriod(activePeriods[0].id);
                        setSelectedYear(new Date(activePeriods[0].startDate).getFullYear());
                        setBulkFromDate(formatDateInput(activePeriods[0].startDate));
                        setBulkToDate(formatDateInput(activePeriods[0].endDate));
                    } else if (pResult.length > 0) {
                        setSelectedPeriod(pResult[0].id);
                        setBulkFromDate(formatDateInput(pResult[0].startDate));
                        setBulkToDate(formatDateInput(pResult[0].endDate));
                    }
                } else {
                    const [pResult, dResult, sResult, tResult] = await Promise.all([
                        schedulingService.getPeriods(),
                        departmentService.getAll(),
                        schedulingService.getShifts(),
                        schedulingService.getTemplates()
                    ]);
                    setPeriods(pResult);

                    const activePeriods = pResult.filter(p => !isBeforeToday(p.endDate));
                    if (activePeriods.length > 0) {
                        const defaultPeriod = activePeriods[0];
                        setSelectedPeriod(defaultPeriod.id);
                        setSelectedYear(new Date(defaultPeriod.startDate).getFullYear());
                        setBulkFromDate(formatDateInput(defaultPeriod.startDate));
                        setBulkToDate(formatDateInput(defaultPeriod.endDate));
                    } else if (pResult.length > 0) {
                        setSelectedPeriod(pResult[0].id);
                        setBulkFromDate(formatDateInput(pResult[0].startDate));
                        setBulkToDate(formatDateInput(pResult[0].endDate));
                    }
                    setDepartments(dResult);
                    setShifts(sResult);
                    setTemplates(tResult);
                }
            } catch (error) {
                console.error("Error fetching scheduling data:", error);
                if (isDepartmentHead) setTeamError('Không tìm thấy bộ phận được giao. Vui lòng liên hệ admin.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [isDepartmentHead]);

    useEffect(() => {
        if (selectedPeriod) {
            loadMatrix();
        }
    }, [selectedPeriod, selectedDept, selectedYear]);

    useEffect(() => {
        const yearPeriods = periods.filter(p => new Date(p.startDate).getFullYear() === selectedYear);
        if (yearPeriods.length > 0) {
            const currentIsInYear = yearPeriods.find(p => p.id === selectedPeriod);
            if (!currentIsInYear) {
                setSelectedPeriod(yearPeriods[0].id);
            }
        } else {
            setSelectedPeriod(null);
        }
    }, [selectedYear, periods]);

    useEffect(() => {
        if (selectedPeriod) {
            const p = periods.find(x => x.id === selectedPeriod);
            if (p) {
                const startStr = formatDateInput(p.startDate);
                const endStr = formatDateInput(p.endDate);
                setBulkFromDate(startStr);
                setBulkToDate(endStr);
            }
        } else {
            const todayStr = new Date().toISOString().split('T')[0];
            setBulkFromDate(todayStr);
            setBulkToDate(todayStr);
        }
    }, [selectedPeriod, periods]);

    const loadMatrix = async () => {
        setLoading(true);
        try {
            const data = await schedulingService.getMatrix(selectedPeriod, isDepartmentHead ? null : selectedDept);
            setMatrixData(data);
            setPendingChanges({});
            setSelectedEmployees([]);
        } catch (error) {
            console.error("Error loading matrix:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const visibleEmployees = matrixData
                .filter(row => row.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
                .filter(row => !isDepartmentHead || !(row.positionName && row.positionName.toLowerCase().includes('trưởng phòng')))
                .map(e => e.employeeId);
            setSelectedEmployees(visibleEmployees);
        } else {
            setSelectedEmployees([]);
        }
    };

    const handleSelectEmployee = (id) => {
        setSelectedEmployees(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleBulkAssignQuick = async () => {
        const period = periods.find(p => p.id === selectedPeriod);
        const fromDate = period ? formatDateInput(period.startDate) : bulkFromDate;
        const toDate = period ? formatDateInput(period.endDate) : bulkToDate;

        if (selectedEmployees.length === 0) return alert("Vui lòng chọn nhân viên (tích chọn ở cột đầu tiên của bảng)");
        if (bulkShiftId === '') return alert("Vui lòng chọn ca làm việc trên thanh công cụ");
        if (!selectedPeriod) return alert("Vui lòng chọn một Tháng làm việc cụ thể");

        setLoading(true);
        try {
            const shiftIdValue = bulkShiftId === 'null' ? null : Number(bulkShiftId);
            await schedulingService.bulkAssign({
                employeeIds: selectedEmployees,
                fromDate: fromDate,
                toDate: toDate,
                shiftId: shiftIdValue,
                periodId: selectedPeriod
            });
            await loadMatrix();
            alert(`Đã xếp ca thành công cho ${selectedEmployees.length} nhân viên trong cả tháng!`);
            setSelectedEmployees([]);
            setBulkShiftId('');
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data || error.message || "Lỗi khi xếp ca";
            alert(`Lỗi: ${errorMsg}. Vui lòng thử lại.`);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (selectedEmployees.length === 0) return alert("Vui lòng chọn nhân viên cần reset lịch");
        if (!selectedPeriod) return alert("Vui lòng chọn một Tháng làm việc cụ thể");

        const period = periods.find(p => p.id === selectedPeriod);
        if (!period) return;
        if (isBeforeToday(period.endDate)) return alert("Không được reset lịch cho các tháng trong quá khứ!");

        if (!window.confirm(`Bạn có chắc muốn Reset (xóa hết ca) cho ${selectedEmployees.length} nhân viên trong tháng này?`)) return;

        setLoading(true);
        try {
            await schedulingService.bulkAssign({
                employeeIds: selectedEmployees,
                fromDate: period.startDate.split('T')[0],
                toDate: period.endDate.split('T')[0],
                shiftId: null,
                periodId: selectedPeriod
            });
            await loadMatrix();
            alert("Đã reset lịch làm việc thành công!");
        } catch (error) {
            alert("Lỗi khi reset lịch làm việc.");
        } finally {
            setLoading(false);
        }
    };

    const handleCellChange = (empId, date, shiftId) => {
        if (isBeforeToday(date)) return alert("Không được sửa lịch cho các ngày trong quá khứ!");
        const key = `${empId}-${date}`;
        setPendingChanges(prev => ({ ...prev, [key]: shiftId === '' ? null : Number(shiftId) }));
    };

    const handleSave = async () => {
        if (selectedEmployees.length > 0 && bulkShiftId !== '') {
            const shiftName = bulkShiftId === 'null' ? "NGHỈ (OFF)" : (shifts.find(s => s.id === Number(bulkShiftId))?.shiftCode || "mới");
            const periodName = periods.find(p => p.id === selectedPeriod)?.periodName || "tháng này";
            if (window.confirm(`Bạn có chắc muốn áp dụng ca ${shiftName} cho ${selectedEmployees.length} nhân viên trong ${periodName}? (Chủ nhật tự động bỏ trống)`)) {
                await handleBulkAssignQuick();
                setIsEditing(false);
                return;
            }
        }

        if (Object.keys(pendingChanges).length === 0) {
            setIsEditing(false);
            return;
        }

        setLoading(true);
        try {
            const empChanges = {};
            Object.entries(pendingChanges).forEach(([key, shiftId]) => {
                const [empId, date] = key.split('-');
                if (!empChanges[empId]) empChanges[empId] = [];
                empChanges[empId].push({ date, shiftId });
            });

            for (const [empId, changes] of Object.entries(empChanges)) {
                for (const change of changes) {
                    await schedulingService.bulkAssign({
                        employeeIds: [Number(empId)],
                        fromDate: change.date,
                        toDate: change.date,
                        shiftId: change.shiftId,
                        periodId: selectedPeriod
                    });
                }
            }

            await loadMatrix();
            setIsEditing(false);
            setPendingChanges({});
            alert("Đã lưu thay đổi thành công!");
        } catch (error) {
            alert("Lỗi khi lưu thay đổi. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    const handleAutoSchedule = async () => {
        setAutoError('');
        setAutoResult(null);
        const deptId = isDepartmentHead ? (departments[0]?.id) : (selectedDept ? Number(selectedDept) : null);
        if (!deptId) { setAutoError('Vui lòng chọn phòng ban.'); return; }
        if (!autoShift1 || !autoShift2 || !autoShift3) { setAutoError('Vui lòng chọn đủ Ca 1, Ca 2 và Ca 3.'); return; }
        if (!autoCycleStart) { setAutoError('Vui lòng nhập ngày bắt đầu xếp ca.'); return; }
        const startYear = new Date(autoCycleStart).getFullYear();
        if (startYear > autoYear) { setAutoError(`Ngày bắt đầu xếp ca không được nằm sau năm ${autoYear}.`); return; }

        if (!window.confirm(
            `Xếp ca tự động 8 tuần cho phòng ban này?\n\n` +
            `Năm: ${autoYear}\n` +
            `Xoay vòng: Ca 1, Ca 2, Ca 3\n` +
            (autoOverwrite ? 'Sẽ ghi đè lịch đã có.' : 'Chỉ điền ngày chưa có lịch.')
        )) return;

        setAutoLoading(true);
        try {
            const result = await schedulingService.autoScheduleDept({
                year: autoYear,
                departmentId: deptId,
                cycleStartDate: autoCycleStart,
                shift1Id: Number(autoShift1),
                shift2Id: Number(autoShift2),
                shift3Id: Number(autoShift3),
                overwriteExisting: autoOverwrite
            });
            setAutoResult(result);
            await loadMatrix();
        } catch (err) {
            setAutoError(err.response?.data?.message || err.message || 'Lỗi khi xếp ca tự động.');
        } finally {
            setAutoLoading(false);
        }
    };

    const handleCopyPrevious = async () => {
        if (!selectedPeriod) return;
        const currentIdx = periods.findIndex(p => p.id === selectedPeriod);
        if (currentIdx === periods.length - 1) return alert("Không tìm thấy kỳ trước để sao chép!");

        const targetPeriod = periods[currentIdx];
        if (isBeforeToday(targetPeriod.endDate)) return alert("Không được sao chép lịch vào các tháng trong quá khứ!");

        const sourcePeriodId = periods[currentIdx + 1].id;
        if (window.confirm(`Bạn có muốn sao chép bảng công từ ${periods[currentIdx + 1].periodName} sang ${periods[currentIdx].periodName}?`)) {
            setLoading(true);
            try {
                await schedulingService.copyPrevious({
                    sourcePeriodId,
                    targetPeriodId: selectedPeriod,
                    departmentId: isDepartmentHead ? null : (selectedDept || null)
                });
                await loadMatrix();
                alert("Sao chép thành công!");
            } catch (error) {
                alert("Lỗi khi sao chép.");
            } finally {
                setLoading(false);
            }
        }
    };

    const exportToCSV = () => {
        if (matrixData.length === 0) return;
        const days = matrixData[0].schedules.map(s => new Date(s.date).getDate());
        const header = ["Mã NV", "Họ tên", "Phòng ban", ...days].join(",");
        const rows = matrixData.map(row => {
            const shifts = row.schedules.map(s => s.shiftCode || "OFF").join(",");
            return `${row.employeeCode},${row.fullName},${row.departmentName},${shifts}`;
        });
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [header, ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `LichLamViec_${periods.find(p => p.id === selectedPeriod)?.periodName || 'Export'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getDayName = (dateStr) => {
        const date = new Date(dateStr);
        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        return dayNames[date.getDay()];
    };

    const isWeekend = (dateStr) => {
        const day = new Date(dateStr).getDay();
        return day === 0 || day === 6;
    };

    const handleGenerateYear = async (year) => {
        if (!window.confirm(`Hệ thống sẽ tự động tạo dữ liệu 12 tháng năm ${year}. Tiếp tục?`)) return;
        setLoading(true);
        try {
            const promises = [];
            for (let m = 1; m <= 12; m++) {
                const startDate = new Date(year, m - 1, 1);
                const endDate = new Date(year, m, 0);
                const startStr = new Date(startDate.getTime() - (startDate.getTimezoneOffset() * 60000)).toISOString();
                const endStr = new Date(endDate.getTime() - (endDate.getTimezoneOffset() * 60000)).toISOString();
                promises.push(schedulingService.createPeriod({
                    periodName: `Tháng ${String(m).padStart(2, '0')}/${year}`,
                    startDate: startStr,
                    endDate: endStr,
                    organizationId: 1
                }));
            }
            await Promise.all(promises);
            alert(`Đã tạo xong dữ liệu năm ${year}!`);
            const pResult = await schedulingService.getPeriods();
            setPeriods(pResult);
        } catch (error) {
            alert("Có lỗi khi tạo dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    const days = matrixData.length > 0 ? (matrixData[0].schedules || []).map(s => s.date) : [];

    return (
        <div className="ef-wrap" style={{ paddingBottom: '80px', overflowX: 'hidden' }}>
            <div className="ef-toolbar print:hidden">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="ef-toolbar-title">
                        <Calendar size={16} style={{ color: '#1a56db' }} />
                        <strong>LỊCH LÀM VIỆC TỔNG HỢP</strong>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '5px' }}>
                        {!isDepartmentHead && (
                            <select className="ef-select" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} style={{ width: '180px' }}>
                                <option value="">-- Tất cả phòng ban --</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                            </select>
                        )}
                        <select className="ef-select" value={selectedYear} onChange={(e) => {
                            const newYear = Number(e.target.value);
                            setSelectedYear(newYear);
                            const yearPeriods = periods.filter(p => new Date(p.startDate).getFullYear() === newYear);
                            if (yearPeriods.length > 0) setSelectedPeriod(yearPeriods[0].id);
                            else setSelectedPeriod(null);
                        }}>
                            {availableYears.map(y => <option key={y} value={y}>Năm {y}</option>)}
                        </select>
                        <select className="ef-select" value={selectedPeriod || ''} onChange={(e) => setSelectedPeriod(Number(e.target.value))}>
                            <option value="">-- Chọn Tháng --</option>
                            {periods.filter(p => new Date(p.startDate).getFullYear() === selectedYear).map(p => (
                                <option key={p.id} value={p.id}>{p.periodName.replace('Kỳ lương', 'Tháng')}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    {/* <button onClick={() => setShowAutoPanel(!showAutoPanel)} className="ef-btn">⚡ XẾP CA TỰ ĐỘNG</button> */}
                    {onBack && <button onClick={onBack} className="ef-btn">Đóng</button>}
                </div>
            </div>

            {/* Auto Schedule Panel */}
            {showAutoPanel && (
                <div style={{ background: '#f5f5f5', border: '1px solid #d0d0d0', padding: '15px', marginBottom: '15px' }}>
                    <div className="ef-section-title" style={{ marginTop: 0 }}>Cấu hình tự động xếp ca 8 tuần (Xoay vòng)</div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold' }}>Ca 1 (Tuần 1-2, 7-8)</label>
                            <select className="ef-select" value={autoShift1} onChange={e => setAutoShift1(e.target.value)} style={{ width: '100%' }}>
                                <option value="">- Chọn ca -</option>
                                {shifts.map(s => <option key={s.id} value={s.id}>{s.shiftCode}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold' }}>Ca 2 (Tuần 3-4)</label>
                            <select className="ef-select" value={autoShift2} onChange={e => setAutoShift2(e.target.value)} style={{ width: '100%' }}>
                                <option value="">- Chọn ca -</option>
                                {shifts.map(s => <option key={s.id} value={s.id}>{s.shiftCode}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold' }}>Ca 3 (Tuần 5-6)</label>
                            <select className="ef-select" value={autoShift3} onChange={e => setAutoShift3(e.target.value)} style={{ width: '100%' }}>
                                <option value="">- Chọn ca -</option>
                                {shifts.map(s => <option key={s.id} value={s.id}>{s.shiftCode}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold' }}>Bắt đầu từ ngày</label>
                            <input type="date" className="ef-input" value={autoCycleStart} onChange={e => setAutoCycleStart(e.target.value)} style={{ width: '100%', padding: '4px' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold' }}>Ghi đè lịch cũ</label>
                            <input type="checkbox" checked={autoOverwrite} onChange={e => setAutoOverwrite(e.target.checked)} style={{ marginTop: '8px' }} />
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                            <button onClick={handleAutoSchedule} disabled={autoLoading} className="ef-btn ef-btn-primary" style={{ width: '100%' }}>CHẠY TỰ ĐỘNG</button>
                        </div>
                    </div>
                    {autoError && <div style={{ color: 'red', fontSize: '12px', fontWeight: 'bold' }}>{autoError}</div>}
                    {autoResult && <div style={{ color: 'green', fontSize: '12px', fontWeight: 'bold' }}>{autoResult.message}</div>}
                </div>
            )}

            {periods.filter(p => new Date(p.startDate).getFullYear() === selectedYear).length === 0 && (
                <div style={{ marginBottom: '15px' }}>
                    <button onClick={() => handleGenerateYear(selectedYear)} disabled={loading} className="ef-btn ef-btn-primary">
                        {loading ? 'ĐANG TẠO...' : `Khởi tạo 12 tháng năm ${selectedYear}`}
                    </button>
                </div>
            )}

            {/* Quick Actions Bar */}
            <div className="ef-toolbar print:hidden" style={{ background: '#fcfcfc', borderBottom: '1px solid #d0d0d0', padding: '10px 15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', width: '100%' }}>
                    <input type="text" placeholder="Tìm tên hoặc mã nhân viên..." className="ef-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '220px' }} />
                    
                    <div style={{ flex: 1 }}></div>

                    <button onClick={exportToCSV} className="ef-btn">XUẤT EXCEL</button>
                </div>
            </div>

            {/* Matrix Data Grid */}
            <div className="ef-table-wrap">
                <table className="ef-table no-top-border" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
                    <thead>
                        <tr>
                            <th className="c" style={{ width: '40px', position: 'sticky', left: 0, zIndex: 10, background: '#f5f5f5', borderRight: '1px solid #d0d0d0' }}>#</th>
                            <th style={{ width: '200px', position: 'sticky', left: '40px', zIndex: 10, background: '#f5f5f5', borderRight: '1px solid #d0d0d0' }}>Nhân Viên</th>
                            {!isDepartmentHead && <th style={{ width: '150px' }}>Phòng Ban</th>}
                            <th style={{ width: '150px' }}>Chức Danh</th>
                            
                            {days.map((date, idx) => (
                                <th key={idx} className="c" style={{ width: '45px', padding: '4px', background: isWeekend(date) ? '#efefef' : '#f5f5f5' }}>
                                    <div style={{ fontSize: '10px' }}>{new Date(date).getDate()}/{new Date(date).getMonth() + 1}</div>
                                    <div style={{ fontSize: '11px', color: isWeekend(date) ? '#d9534f' : '#666' }}>{getDayName(date)}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={days.length + 5} className="ef-empty">Đang tải biểu mẫu...</td></tr>
                        ) : matrixData.length === 0 ? (
                            <tr><td colSpan={days.length + 5} className="ef-empty">Chưa có dữ liệu lịch làm việc.</td></tr>
                        ) : matrixData
                                .filter(row => row.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
                                .filter(row => !isDepartmentHead || !(row.positionName && row.positionName.toLowerCase().includes('trưởng phòng')))
                                .map((row, idx) => (
                            <tr key={idx}>
                                <td className="c" style={{ position: 'sticky', left: 0, zIndex: 5, background: '#fff', borderRight: '1px solid #eaeaea' }}>
                                    {idx + 1}
                                </td>
                                <td style={{ position: 'sticky', left: '40px', zIndex: 5, background: '#fff', borderRight: '1px solid #eaeaea' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{row.fullName}</div>
                                    <div style={{ fontSize: '10px', color: '#888' }}>{row.employeeCode}</div>
                                </td>
                                {!isDepartmentHead && (
                                    <td style={{ fontSize: '11px' }}>{row.departmentName}</td>
                                )}
                                <td style={{ fontSize: '11px' }}>{row.positionName}</td>
                                
                                {row.schedules.map((s, sIdx) => {
                                    const pendingShiftId = pendingChanges[`${row.employeeId}-${s.date}`];
                                    const displayShiftId = pendingShiftId !== undefined ? pendingShiftId : s.shiftId;
                                    const displayShiftCode = pendingShiftId !== undefined
                                        ? (shifts.find(sh => sh.id === pendingShiftId)?.shiftCode || 'OFF')
                                        : (s.shiftCode || 'OFF');
                                    
                                    const cellBackground = isWeekend(s.date) ? '#fbfbfb' : 'transparent';
                                    const textClass = displayShiftCode !== 'OFF' ? 'ef-text-ok' : '';

                                    return (
                                        <td key={sIdx} className="c" style={{ padding: '2px', background: cellBackground }}>
                                            <span className={textClass} style={{ fontSize: '10px', fontWeight: 'bold', color: displayShiftCode === 'OFF' ? '#aaa' : undefined }}>
                                                {displayShiftCode === 'OFF' ? '' : displayShiftCode}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div style={{ padding: '15px', background: '#f5f5f5', borderTop: '1px solid #d0d0d0', fontSize: '11px' }}>
                <strong>GHI CHÚ CA: </strong>
                {shifts.map(s => (
                    <span key={s.id} style={{ marginLeft: '15px' }}>{s.shiftCode}: {s.startTime} - {s.endTime}</span>
                ))}
                <span style={{ marginLeft: '15px' }}>OFF: Nghỉ</span>
            </div>
            
        </div>
    );
}
