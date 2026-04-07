import React, { useState } from 'react';
import './DailyAttendanceAdmin.css';
import { Search, Download, Edit3, ArrowDownUp, ChevronLeft, ChevronRight } from 'lucide-react';

/* ──────────────────────────────────────────────────────────────
   MOCK DATA — 20 records across 2 pages
────────────────────────────────────────────────────────────── */
const ALL_DATA = [
    { id: 1,  code: 'NV0001', name: 'Nguyễn Văn An',       date: '29/03/2026', checkIn: '08:00', checkOut: '17:00', hours: '8.0',  statusId: 'ok',       status: 'Đúng giờ',         note: '' },
    { id: 2,  code: 'NV0002', name: 'Phạm Thị Bình',       date: '29/03/2026', checkIn: '08:15', checkOut: '17:00', hours: '7.75', statusId: 'late',      status: 'Muộn 15p',         note: 'Kẹt xe' },
    { id: 3,  code: 'NV0034', name: 'Lê Hoàng Cường',      date: '29/03/2026', checkIn: '07:50', checkOut: '16:30', hours: '7.6',  statusId: 'early',     status: 'Về sớm 30p',       note: 'Xin phép' },
    { id: 4,  code: 'NV0055', name: 'Phạm Văn Dũng',       date: '29/03/2026', checkIn: '--:--', checkOut: '--:--', hours: '0.0',  statusId: 'leave',     status: 'Nghỉ có phép',     note: 'Phép năm' },
    { id: 5,  code: 'NV0102', name: 'Hoàng Thị Em',        date: '29/03/2026', checkIn: '07:58', checkOut: '--:--', hours: '--',   statusId: 'missing',   status: 'Quên check-out',   note: '' },
    { id: 6,  code: 'NV0156', name: 'Đặng Khắc Phục',      date: '29/03/2026', checkIn: '08:30', checkOut: '17:15', hours: '7.75', statusId: 'late',      status: 'Muộn 30p',         note: '' },
    { id: 7,  code: 'NV0207', name: 'Vũ Thị Giang',        date: '29/03/2026', checkIn: '08:00', checkOut: '17:01', hours: '8.02', statusId: 'ok',        status: 'Đúng giờ',         note: '' },
    { id: 8,  code: 'NV0012', name: 'Ngô Văn Hải',         date: '29/03/2026', checkIn: '--:--', checkOut: '--:--', hours: '0.0',  statusId: 'unlawful',  status: 'Nghỉ không phép',  note: 'Chưa liên lạc được' },
    { id: 9,  code: 'NV0089', name: 'Trần Minh Khoa',      date: '29/03/2026', checkIn: '08:05', checkOut: '17:00', hours: '7.92', statusId: 'late',      status: 'Muộn 5p',          note: '' },
    { id: 10, code: 'NV0134', name: 'Nguyễn Thị Lan',      date: '29/03/2026', checkIn: '08:00', checkOut: '17:00', hours: '8.0',  statusId: 'ok',        status: 'Đúng giờ',         note: '' },
    { id: 11, code: 'NV0201', name: 'Lưu Quang Minh',      date: '29/03/2026', checkIn: '07:50', checkOut: '17:10', hours: '8.33', statusId: 'ok',        status: 'Đúng giờ',         note: '' },
    { id: 12, code: 'NV0045', name: 'Đinh Thị Ngọc',       date: '29/03/2026', checkIn: '07:58', checkOut: '16:45', hours: '7.78', statusId: 'early',     status: 'Về sớm 15p',       note: 'Hẹn bác sĩ' },
    { id: 13, code: 'NV0178', name: 'Bùi Văn Oai',         date: '29/03/2026', checkIn: '--:--', checkOut: '--:--', hours: '0.0',  statusId: 'leave',     status: 'Nghỉ có phép',     note: 'Nghỉ hiếu' },
    { id: 14, code: 'NV0223', name: 'Trịnh Thị Phương',    date: '29/03/2026', checkIn: '08:20', checkOut: '17:05', hours: '7.75', statusId: 'late',      status: 'Muộn 20p',         note: '' },
    { id: 15, code: 'NV0067', name: 'Hồ Quốc Quân',        date: '29/03/2026', checkIn: '07:57', checkOut: '--:--', hours: '--',   statusId: 'missing',   status: 'Quên check-out',   note: '' },
    { id: 16, code: 'NV0188', name: 'Phan Thị Rạng',       date: '29/03/2026', checkIn: '08:00', checkOut: '17:00', hours: '8.0',  statusId: 'ok',        status: 'Đúng giờ',         note: '' },
    { id: 17, code: 'NV0009', name: 'Nguyễn Văn Sơn',      date: '29/03/2026', checkIn: '08:10', checkOut: '17:00', hours: '7.83', statusId: 'late',      status: 'Muộn 10p',         note: 'Để xe hỏng' },
    { id: 18, code: 'NV0311', name: 'Cao Thị Thùy',        date: '29/03/2026', checkIn: '08:00', checkOut: '17:03', hours: '8.05', statusId: 'ok',        status: 'Đúng giờ',         note: '' },
    { id: 19, code: 'NV0092', name: 'Đoàn Văn Uy',         date: '29/03/2026', checkIn: '08:00', checkOut: '16:55', hours: '7.92', statusId: 'ok',        status: 'Đúng giờ',         note: '' },
    { id: 20, code: 'NV0141', name: 'Mai Thị Vân',         date: '29/03/2026', checkIn: '07:55', checkOut: '17:05', hours: '8.16', statusId: 'ok',        status: 'Đúng giờ',         note: '' },
];

const TABS = [
    { id: 'all',     label: 'Tất cả',         filter: () => true },
    { id: 'late',    label: 'Đi muộn',        filter: d => d.statusId === 'late' },
    { id: 'early',   label: 'Về sớm',         filter: d => d.statusId === 'early' },
    { id: 'leave',   label: 'Nghỉ có phép',   filter: d => d.statusId === 'leave' },
    { id: 'missing', label: 'Quên check-out', filter: d => d.statusId === 'missing' },
];

const NAV_ITEMS = ['Tổng quan', 'Bảng Công Hàng Ngày', 'Đăng Ký Nghỉ', 'Báo Cáo'];

const DEPTS = ['Tất cả phòng ban', 'Phòng Nhân Sự', 'Phòng Kế Toán', 'Phòng Kỹ Thuật', 'Phòng Kinh Doanh'];
const MONTHS = [
    'Tháng 03/2026', 'Tháng 02/2026', 'Tháng 01/2026',
    'Tháng 12/2025', 'Tháng 11/2025',
];

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50];

/* ──────────────────────────────────────────────────────────────
   COMPONENT
────────────────────────────────────────────────────────────── */
export default function DailyAttendanceAdmin() {
    const [activeNav,    setActiveNav]    = useState('Bảng Công Hàng Ngày');
    const [activeTab,    setActiveTab]    = useState('all');
    const [dept,         setDept]         = useState(DEPTS[0]);
    const [month,        setMonth]        = useState(MONTHS[0]);
    const [searchInput,  setSearchInput]  = useState('');
    const [searchQuery,  setSearchQuery]  = useState('');
    const [currentPage,  setCurrentPage]  = useState(1);
    const [rowsPerPage,  setRowsPerPage]  = useState(10);

    /* ── Filtering ── */
    const tabFilter = TABS.find(t => t.id === activeTab)?.filter ?? (() => true);

    const filteredData = ALL_DATA.filter(row => {
        if (!tabFilter(row)) return false;
        if (dept !== DEPTS[0] && !row.dept && dept !== DEPTS[0]) {/* dept not in mock, skip */}
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return row.name.toLowerCase().includes(q) || row.code.toLowerCase().includes(q);
        }
        return true;
    });

    /* ── Pagination ── */
    const totalRows  = filteredData.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
    const safePage   = Math.min(currentPage, totalPages);
    const pageStart  = (safePage - 1) * rowsPerPage;
    const pageData   = filteredData.slice(pageStart, pageStart + rowsPerPage);

    const goPage = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

    const handleSearch = () => {
        setSearchQuery(searchInput);
        setCurrentPage(1);
    };

    const handleTabChange = (id) => {
        setActiveTab(id);
        setCurrentPage(1);
    };

    /* ── Tab counts ── */
    const getTabCount = (tabId) => {
        const f = TABS.find(t => t.id === tabId)?.filter ?? (() => true);
        return ALL_DATA.filter(f).length;
    };

    /* ── Status CSS class ── */
    const statusClass = (id) => ({
        ok: 'status-ok',
        late: 'status-late',
        early: 'status-early',
        leave: 'status-leave',
        missing: 'status-missing',
        unlawful: 'status-unlawful',
    }[id] ?? 'status-ok');

    /* ── Page number buttons (like image: 1 2 3 4 5 ... 21) ── */
    const renderPageButtons = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (safePage > 4) pages.push('...');
            const start = Math.max(2, safePage - 1);
            const end   = Math.min(totalPages - 1, safePage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (safePage < totalPages - 3) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    /* ── Summary stats ── */
    const statCount = (id) => ALL_DATA.filter(d => d.statusId === id).length;

    return (
        <div className="da-container">

            {/* ══ TOP APP BAR ══ */}
            <div className="da-app-bar">
                <div className="da-app-brand">≡ NHÂN SỰ</div>
                <div className="da-top-nav">
                    {NAV_ITEMS.map(nav => (
                        <div
                            key={nav}
                            className={`da-nav-item${activeNav === nav ? ' active' : ''}`}
                            onClick={() => setActiveNav(nav)}
                        >
                            {nav}
                        </div>
                    ))}
                </div>
            </div>

            {/* ══ PAGE HEADER ══ */}
            <div className="da-page-header">
                <h1 className="da-page-title">Bảng Công Hàng Ngày</h1>
                <div className="da-breadcrumb">
                    🏠 / Chấm công / Bảng Công Hàng Ngày
                </div>
            </div>

            {/* ══ SUMMARY STATS BAR ══ */}
            <div className="da-stats-bar">
                <div className="da-stat-item">
                    <span className="da-stat-number">{ALL_DATA.length}</span>
                    <span>Tổng cộng</span>
                </div>
                <div className="da-stat-item">
                    <span className="da-stat-number green">{statCount('ok')}</span>
                    <span>Đúng giờ</span>
                </div>
                <div className="da-stat-item">
                    <span className="da-stat-number red">{statCount('late')}</span>
                    <span>Đi muộn</span>
                </div>
                <div className="da-stat-item">
                    <span className="da-stat-number orange">{statCount('early')}</span>
                    <span>Về sớm</span>
                </div>
                <div className="da-stat-item">
                    <span className="da-stat-number purple">{statCount('leave')}</span>
                    <span>Nghỉ phép</span>
                </div>
                <div className="da-stat-item">
                    <span className="da-stat-number gray">{statCount('missing')}</span>
                    <span>Quên c-out</span>
                </div>
            </div>

            {/* ══ TOOLBAR / FILTER ROW ══ */}
            <div className="da-toolbar">
                {/* Phòng ban */}
                <span className="da-toolbar-label">Phòng ban:</span>
                <select
                    id="da-dept-select"
                    className="da-select"
                    value={dept}
                    onChange={e => { setDept(e.target.value); setCurrentPage(1); }}
                >
                    {DEPTS.map(d => <option key={d}>{d}</option>)}
                </select>

                {/* Tháng/Năm */}
                <span className="da-toolbar-label">Tháng/Năm:</span>
                <select
                    id="da-month-select"
                    className="da-select"
                    value={month}
                    onChange={e => setMonth(e.target.value)}
                >
                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                </select>

                {/* Tìm kiếm */}
                <div className="da-search-group">
                    <span className="da-search-icon">
                        <Search size={13} />
                    </span>
                    <input
                        id="da-search-input"
                        type="text"
                        className="da-search-input"
                        placeholder="Tên / Mã nhân viên..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <button id="da-btn-search" className="da-btn-search" onClick={handleSearch}>
                    <Search size={13} /> Tìm kiếm
                </button>

                <div className="da-toolbar-spacer" />

                {/* Xuất Excel */}
                <button id="da-btn-export" className="da-btn-export">
                    <Download size={13} /> Xuất Excel
                </button>

                {/* Chốt công */}
                <button id="da-btn-commit" className="da-btn-commit">
                    Duyệt/Chốt Công Tháng
                </button>
            </div>

            {/* ══ STATUS TABS ══ */}
            <div className="da-tabs-bar">
                {TABS.map(tab => (
                    <div
                        key={tab.id}
                        id={`da-tab-${tab.id}`}
                        className={`da-tab${activeTab === tab.id ? ' active' : ''}`}
                        onClick={() => handleTabChange(tab.id)}
                    >
                        {tab.label}{' '}
                        <span className="da-tab-count">({getTabCount(tab.id)})</span>
                    </div>
                ))}
            </div>

            {/* ══ DATA TABLE ══ */}
            <div className="da-table-wrapper">
                <table className="da-table">
                    <thead>
                        <tr>
                            <th className="center" style={{ width: 36 }}>
                                <input type="checkbox" className="da-checkbox" id="da-chk-all" />
                            </th>
                            <th className="center" style={{ width: 44 }}>STT</th>
                            <th style={{ width: 90 }}>
                                <div className="da-th-inner">
                                    Mã NV <ArrowDownUp size={11} className="da-sort-icon" />
                                </div>
                            </th>
                            <th style={{ width: 160 }}>
                                <div className="da-th-inner">
                                    Họ và Tên <ArrowDownUp size={11} className="da-sort-icon" />
                                </div>
                            </th>
                            <th style={{ width: 100 }}>Ngày</th>
                            <th style={{ width: 80 }} className="center">Giờ Vào</th>
                            <th style={{ width: 80 }} className="center">Giờ Ra</th>
                            <th style={{ width: 90 }} className="center">Số Giờ Làm</th>
                            <th style={{ width: 130 }}>Trạng Thái</th>
                            <th>Ghi chú</th>
                            <th style={{ width: 70 }} className="center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageData.length === 0 ? (
                            <tr className="da-empty-row">
                                <td colSpan={11}>
                                    Không có dữ liệu phù hợp.
                                </td>
                            </tr>
                        ) : (
                            pageData.map((row, idx) => (
                                <tr key={row.id}>
                                    <td className="center">
                                        <input type="checkbox" className="da-checkbox" />
                                    </td>
                                    <td className="center">{pageStart + idx + 1}</td>
                                    <td>{row.code}</td>
                                    <td>{row.name}</td>
                                    <td>{row.date}</td>
                                    <td className="center">
                                        {row.checkIn === '--:--'
                                            ? <span className="da-time-missing">--:--</span>
                                            : row.checkIn
                                        }
                                    </td>
                                    <td className="center">
                                        {row.checkOut === '--:--'
                                            ? <span className="da-time-missing">--:--</span>
                                            : row.checkOut
                                        }
                                    </td>
                                    <td className="center">{row.hours}</td>
                                    <td className={statusClass(row.statusId)}>
                                        {row.status}
                                    </td>
                                    <td>
                                        {row.note
                                            ? row.note
                                            : <span className="da-note-empty">--</span>
                                        }
                                    </td>
                                    <td>
                                        <div className="da-action-cell">
                                            <button
                                                className="da-edit-btn"
                                                title="Chỉnh sửa"
                                                id={`da-edit-${row.id}`}
                                            >
                                                <Edit3 size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ══ PAGINATION ROW ══ */}
            <div className="da-pagination-row">
                {/* Trái: Tổng số bản ghi */}
                <div className="da-page-total">
                    Tổng số bản ghi: <strong>{totalRows}</strong>
                </div>

                {/* Phải: Range + số trang + per-page */}
                <div className="da-page-right">
                    <span className="da-record-range">
                        {totalRows === 0 ? '0 bản ghi' : `${pageStart + 1}–${Math.min(pageStart + rowsPerPage, totalRows)} bản ghi`}
                    </span>

                    <div className="da-page-numbers">
                        {/* Prev */}
                        <button
                            className="da-page-btn"
                            onClick={() => goPage(safePage - 1)}
                            disabled={safePage === 1}
                            id="da-page-prev"
                        >
                            <ChevronLeft size={13} />
                        </button>

                        {/* Page buttons */}
                        {renderPageButtons().map((p, i) =>
                            p === '...' ? (
                                <span key={`ellipsis-${i}`} className="da-page-ellipsis">...</span>
                            ) : (
                                <button
                                    key={p}
                                    id={`da-page-${p}`}
                                    className={`da-page-btn${safePage === p ? ' active' : ''}`}
                                    onClick={() => goPage(p)}
                                >
                                    {p}
                                </button>
                            )
                        )}

                        {/* Next */}
                        <button
                            className="da-page-btn"
                            onClick={() => goPage(safePage + 1)}
                            disabled={safePage === totalPages}
                            id="da-page-next"
                        >
                            <ChevronRight size={13} />
                        </button>
                    </div>

                    {/* Rows per page */}
                    <select
                        id="da-per-page-select"
                        className="da-per-page-select"
                        value={rowsPerPage}
                        onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    >
                        {ROWS_PER_PAGE_OPTIONS.map(n => (
                            <option key={n} value={n}>{n} / trang</option>
                        ))}
                    </select>
                </div>
            </div>

        </div>
    );
}
