import React, { useState, useEffect, useMemo } from 'react';
import {
    Container,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Box,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Drawer,
    List,
    ListItem,
    ListItemText,
    ListItemButton,
    Checkbox,
    Divider,
    Alert,
    ListItemIcon,
    Snackbar
} from '@mui/material';
import {
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Add as AddIcon,
    Close as CloseIcon,
    Menu as MenuIcon,
    ErrorOutline as ErrorOutlineIcon,
    CheckCircleOutline as CheckCircleOutlineIcon
} from '@mui/icons-material';
import ShiftAssignmentForm from '../components/ShiftAssignmentForm';
import { useDrawer } from '../contexts/DrawerContext';
import { getDaysInMonth as getDaysInMonthFromDateFns, parse, differenceInHours, addDays, format, subDays, isBefore, startOfDay } from 'date-fns';

interface CalendarDay {
    day: number;
    isCurrentMonth: boolean;
}

interface Employee {
    id: string;
    name: string;
    employeeId: string;
}

interface ShiftAssignment {
    employeeId: string;
    date: string; // YYYY-MM-DD 格式
    shiftName: string;  // 改為 shiftName
}

interface ShiftDisplay {
    employeeId: string;
    employeeName: string;
    shiftName: string;
}

interface ScheduleProps {
    employees: Employee[]; // 從 props 接收員工列表
}

// Define Shift Time Details
interface ShiftDetails {
    name: string;
    startTime: string; // HH:MM or empty for off shifts
    endTime: string; // HH:MM or empty for off shifts
    isWorkShift: boolean; // Is it a shift that counts towards work hours/interval checks?
    isOffShift: boolean; // Is it 休假 or 例假?
    isRestDay: boolean; // Is it 休假?
    isMandatoryOff: boolean; // Is it 例假?
}

// Central map for shift details
const shiftDetailsMap: Map<string, ShiftDetails> = new Map([
    ['白班', { name: '白班', startTime: '07:30', endTime: '15:30', isWorkShift: true, isOffShift: false, isRestDay: false, isMandatoryOff: false }],
    ['配器械班', { name: '配器械班', startTime: '07:30', endTime: '17:30', isWorkShift: true, isOffShift: false, isRestDay: false, isMandatoryOff: false }],
    ['小夜班', { name: '小夜班', startTime: '15:00', endTime: '23:00', isWorkShift: true, isOffShift: false, isRestDay: false, isMandatoryOff: false }],
    ['大夜班', { name: '大夜班', startTime: '23:00', endTime: '08:00', isWorkShift: true, isOffShift: false, isRestDay: false, isMandatoryOff: false }], // Spans midnight
    ['12-8班', { name: '12-8班', startTime: '12:00', endTime: '20:00', isWorkShift: true, isOffShift: false, isRestDay: false, isMandatoryOff: false }],
    ['9-5班', { name: '9-5班', startTime: '09:00', endTime: '17:00', isWorkShift: true, isOffShift: false, isRestDay: false, isMandatoryOff: false }],
    ['白班待命', { name: '白班待命', startTime: '07:00', endTime: '15:00', isWorkShift: false, isOffShift: false, isRestDay: false, isMandatoryOff: false }],
    ['小夜待命', { name: '小夜待命', startTime: '15:00', endTime: '23:00', isWorkShift: false, isOffShift: false, isRestDay: false, isMandatoryOff: false }],
    ['大夜待命', { name: '大夜待命', startTime: '23:00', endTime: '07:00', isWorkShift: false, isOffShift: false, isRestDay: false, isMandatoryOff: false }], // Spans midnight
    ['Off日待', { name: 'Off日待', startTime: '07:00', endTime: '19:00', isWorkShift: false, isOffShift: false, isRestDay: false, isMandatoryOff: false }],
    ['Off夜待', { name: 'Off夜待', startTime: '19:00', endTime: '07:00', isWorkShift: false, isOffShift: false, isRestDay: false, isMandatoryOff: false }], // Spans midnight
    ['休假', { name: '休假', startTime: '', endTime: '', isWorkShift: false, isOffShift: true, isRestDay: true, isMandatoryOff: false }],
    ['例假', { name: '例假', startTime: '', endTime: '', isWorkShift: false, isOffShift: true, isRestDay: false, isMandatoryOff: true }],
]);

// Helper function to get date object from assignment
const getShiftDateTime = (assignmentDate: string, timeStr: string): Date | null => {
    if (!timeStr) return null;
    try {
        return parse(`${assignmentDate} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());
    } catch (e) {
        console.error("Error parsing date/time:", assignmentDate, timeStr, e);
        return null;
    }
};

// Helper to check if a shift spans midnight
const doesShiftSpanMidnight = (shiftName: string): boolean => {
    const details = shiftDetailsMap.get(shiftName);
    if (!details || !details.startTime || !details.endTime) return false;
    return details.startTime > details.endTime; // Simple check: start time is later than end time
};

// Validation function
const validateScheduleRules = (assignments: ShiftAssignment[], employees: Employee[], year: number, month: number): string[] => {
    const errors: string[] = [];
    const assignmentsByEmployee: { [key: string]: ShiftAssignment[] } = {};

    // Group assignments by employee for easier lookup
    assignments.forEach(a => {
        if (!assignmentsByEmployee[a.employeeId]) {
            assignmentsByEmployee[a.employeeId] = [];
        }
        assignmentsByEmployee[a.employeeId].push(a);
        // Sort assignments by date for each employee
        assignmentsByEmployee[a.employeeId].sort((a1, a2) => a1.date.localeCompare(a2.date));
    });

    const daysInMonthValue = getDaysInMonthFromDateFns(new Date(year, month));

    employees.forEach(employee => {
        const empAssignments = assignmentsByEmployee[employee.id] || [];
        if (empAssignments.length === 0) return; // Skip employees with no assignments

        const employeeName = employee.name;

        // 1. Check 12-hour interval rule
        for (let i = 1; i < empAssignments.length; i++) {
            const currentAssignment = empAssignments[i];
            const prevAssignment = empAssignments[i - 1];

            // Only check if previous day is exactly one day before current day
            const currentDate = parse(currentAssignment.date, 'yyyy-MM-dd', new Date());
            const prevDate = parse(prevAssignment.date, 'yyyy-MM-dd', new Date());

            if (differenceInHours(currentDate, prevDate) <= 24) { // Check only consecutive days
                const currentShiftDetails = shiftDetailsMap.get(currentAssignment.shiftName);
                const prevShiftDetails = shiftDetailsMap.get(prevAssignment.shiftName);

                if (currentShiftDetails?.isWorkShift && prevShiftDetails?.isWorkShift) {
                    const prevEndTimeStr = prevShiftDetails.endTime;
                    const currentStartTimeStr = currentShiftDetails.startTime;

                    if (prevEndTimeStr && currentStartTimeStr) {
                        let prevEndDateTime = getShiftDateTime(prevAssignment.date, prevEndTimeStr);
                        let currentStartDateTime = getShiftDateTime(currentAssignment.date, currentStartTimeStr);

                        if (prevEndDateTime && currentStartDateTime) {
                            // Adjust previous end time if it spans midnight
                            if (doesShiftSpanMidnight(prevAssignment.shiftName)) {
                                prevEndDateTime = addDays(prevEndDateTime, 1);
                            }
                            // If current shift starts before previous shift ended (possible with midnight shifts)
                            if (isBefore(currentStartDateTime, prevEndDateTime)) {
                                const hoursDiff = differenceInHours(prevEndDateTime, currentStartDateTime); // Order reversed intentionally
                                if (hoursDiff > 0) { // Should not happen with correct logic, but safety check
                                    // This case needs careful handling if needed, maybe error? Currently means overlap or error.
                                } else {
                                    // Standard case
                                    const intervalHours = differenceInHours(currentStartDateTime, prevEndDateTime);
                                    if (intervalHours < 12) {
                                        errors.push(`${employeeName}: ${prevAssignment.date} (${prevAssignment.shiftName}) 與 ${currentAssignment.date} (${currentAssignment.shiftName}) 間隔不足 12 小時 (間隔 ${intervalHours} 小時)。`);
                                    }
                                }
                            } else {
                                const intervalHours = differenceInHours(currentStartDateTime, prevEndDateTime);
                                if (intervalHours < 12) {
                                    errors.push(`${employeeName}: ${prevAssignment.date} (${prevAssignment.shiftName}) 與 ${currentAssignment.date} (${currentAssignment.shiftName}) 間隔不足 12 小時 (間隔 ${intervalHours} 小時)。`);
                                }
                            }
                        }
                    }
                }
            }
        }

        // 2. Check 7-day rest rule (1 休 + 1 例)
        for (let day = 1; day <= daysInMonthValue; day++) {
            const currentCheckDate = new Date(year, month, day);
            const startDate = subDays(currentCheckDate, 6);

            let hasRestDay = false;
            let hasMandatoryOff = false;

            const assignmentsInWindow = empAssignments.filter(a => {
                const assignmentDate = parse(a.date, 'yyyy-MM-dd', new Date());
                return !isBefore(assignmentDate, startOfDay(startDate)) && !isBefore(startOfDay(addDays(currentCheckDate, 1)), assignmentDate);
            });

            if (assignmentsInWindow.length < 7 && day > 6) {
                // If we don't have full 7 days of assignments in the window (for periods at month start/end),
                // the rule might not be strictly applicable or needs data from previous/next month.
                // For simplicity, we only check full 7-day windows based on available data.
                // More robust check would need data beyond current month view.
                continue; // Skip check if window isn't fully populated within the month's assignments
            }

            for (const assignment of assignmentsInWindow) {
                const details = shiftDetailsMap.get(assignment.shiftName);
                if (details?.isRestDay) hasRestDay = true;
                if (details?.isMandatoryOff) hasMandatoryOff = true;
            }

            // Only flag error if the 7-day window is fully within the checked period
            if (day >= 7) {
                const windowStartDateStr = format(startDate, 'MM/dd');
                const windowEndDateStr = format(currentCheckDate, 'MM/dd');
                if (!hasRestDay) {
                    errors.push(`${employeeName}: ${windowStartDateStr} - ${windowEndDateStr} 區間缺少「休假」。`);
                }
                if (!hasMandatoryOff) {
                    errors.push(`${employeeName}: ${windowStartDateStr} - ${windowEndDateStr} 區間缺少「例假」。`);
                }
            }
        }
    });

    // Remove duplicate error messages using Array.from
    return Array.from(new Set(errors));
};

// 工具函數：取得指定日期是星期幾（0-6）
const getWeekDay = (year: number, month: number, day: number) => {
    return new Date(year, month, day).getDay();
};

// 工具函數：產生月曆資料
const generateCalendarData = (year: number, month: number) => {
    const daysInMonth = getDaysInMonthFromDateFns(new Date(year, month));
    const firstDayWeekDay = getWeekDay(year, month, 1);
    const weeks: CalendarDay[][] = [];

    // 計算上個月的天數
    const prevMonth = month - 1 < 0 ? 11 : month - 1;
    const prevMonthYear = month - 1 < 0 ? year - 1 : year;
    const daysInPrevMonth = getDaysInMonthFromDateFns(new Date(prevMonthYear, prevMonth));

    // 填充上個月的日期
    let currentWeek: CalendarDay[] = [];
    for (let i = 0; i < firstDayWeekDay; i++) {
        currentWeek.push({
            day: daysInPrevMonth - firstDayWeekDay + i + 1,
            isCurrentMonth: false
        });
    }

    // 填充當前月份的日期
    for (let day = 1; day <= daysInMonth; day++) {
        currentWeek.push({
            day,
            isCurrentMonth: true
        });

        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }

    // 填充下個月的日期
    if (currentWeek.length > 0) {
        let nextMonthDay = 1;
        while (currentWeek.length < 7) {
            currentWeek.push({
                day: nextMonthDay++,
                isCurrentMonth: false
            });
        }
        weeks.push(currentWeek);
    }

    return weeks;
};

// !!重新加入 generateTestSchedule 函數定義!!
const generateTestSchedule = (year: number, month: number, employees: Employee[]): ShiftAssignment[] => {
    console.log(`[generateTestSchedule] Generating for ${year}-${month + 1} with ${employees.length} employees.`); // Log: Start
    if (employees.length === 0) {
        console.log("[generateTestSchedule] No employees provided, returning empty array."); // Log: No employees
        return [];
    }

    const assignments: ShiftAssignment[] = [];
    const daysInMonth = getDaysInMonthFromDateFns(new Date(year, month));
    console.log(`[generateTestSchedule] Days in month: ${daysInMonth}`); // Log: Days count
    const shifts = ['白班', '配器械班', '小夜班', '大夜班', '12-8班', '9-5班', '白班待命', '小夜待命', '大夜待命', 'Off日待', 'Off夜待', '休假', '例假'];
    const offShiftTypes = ['休假', '例假', 'Off日待', 'Off夜待'];

    for (let day = 1; day <= daysInMonth; day++) {
        // console.log(`[generateTestSchedule] Processing day ${day}`); // Log: Processing day (can be verbose)
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        let dailyShifts: string[] = [];
        const numEmployees = employees.length;
        const maxOffShifts = Math.max(1, Math.floor(numEmployees / 3));
        let currentOffShifts = 0;

        // 1. 建立每日班別池
        for (let i = 0; i < numEmployees; i++) {
            let randomShift: string;
            let attempts = 0;
            do {
                randomShift = shifts[Math.floor(Math.random() * shifts.length)];
                attempts++;
                if (((offShiftTypes.includes(randomShift) && currentOffShifts < maxOffShifts) || !offShiftTypes.includes(randomShift)) || attempts > shifts.length * 2) {
                    break;
                }
            } while (true);

            if (attempts > shifts.length * 2 && offShiftTypes.includes(randomShift)) {
                do {
                    randomShift = shifts[Math.floor(Math.random() * shifts.length)];
                } while (offShiftTypes.includes(randomShift));
            }

            dailyShifts.push(randomShift);
            if (offShiftTypes.includes(randomShift)) {
                currentOffShifts++;
            }
        }
        // console.log(`[generateTestSchedule] Day ${day} initial pool:`, dailyShifts); // Log: Daily pool before shuffle

        // 確保班別數量足夠
        while (dailyShifts.length < numEmployees) {
            console.warn(`[generateTestSchedule] Day ${day} pool size mismatch. Fixing...`); // Log: Fixing pool size
            let randomWorkShift: string;
            do {
                randomWorkShift = shifts[Math.floor(Math.random() * shifts.length)];
            } while (offShiftTypes.includes(randomWorkShift));
            dailyShifts.push(randomWorkShift);
        }

        // 2. 隨機打亂每日班別池
        for (let i = dailyShifts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [dailyShifts[i], dailyShifts[j]] = [dailyShifts[j], dailyShifts[i]];
        }
        // console.log(`[generateTestSchedule] Day ${day} shuffled pool:`, dailyShifts); // Log: Daily pool after shuffle


        // 3. 分配給員工
        employees.forEach((employee, index) => {
            if (index < dailyShifts.length) {
                assignments.push({
                    employeeId: employee.id,
                    date: dateStr,
                    shiftName: dailyShifts[index]
                });
            } else {
                console.error(`[generateTestSchedule] Error assigning shift for employee ${employee.id} on day ${day}. Index out of bounds.`); // Log: Assignment error
            }
        });
    }
    console.log(`[generateTestSchedule] Finished generation. Total assignments: ${assignments.length}`); // Log: Finish
    return assignments;
};

// 班別顏色映射
const shiftColorMap: { [key: string]: { main: string, light: string } } = {
    '白班': { main: '#2196f3', light: '#bbdefb' },  // 藍色系
    '配器械班': { main: '#673ab7', light: '#d1c4e9' },  // 深紫色系
    '白班待命': { main: '#90caf9', light: '#e3f2fd' },
    '小夜班': { main: '#ff9800', light: '#ffe0b2' },  // 橙色系
    '小夜待命': { main: '#ffb74d', light: '#fff3e0' },
    '大夜班': { main: '#4caf50', light: '#c8e6c9' },  // 綠色系
    '大夜待命': { main: '#81c784', light: '#e8f5e9' },
    '12-8班': { main: '#9c27b0', light: '#e1bee7' },  // 紫色系
    '9-5班': { main: '#3f51b5', light: '#c5cae9' },  // 靛藍色系
    'Off日待': { main: '#ff5722', light: '#ffccbc' },  // 深橙色系
    'Off夜待': { main: '#795548', light: '#d7ccc8' },  // 棕色系
    '休假': { main: '#9e9e9e', light: '#f5f5f5' },  // 灰色系
    '例假': { main: '#607d8b', light: '#cfd8dc' }   // 藍灰色系
};

// 獲取班別顏色的函數
const getShiftColor = (shiftName: string) => {
    return shiftColorMap[shiftName] || { main: '#757575', light: '#eeeeee' }; // 默認灰色
};

// 修改函數定義
const getShiftDisplays = (
    date: string | null,
    assignments: ShiftAssignment[],
    employees: Employee[]
): ShiftDisplay[] => {
    if (!date) return [];
    const dayAssignments = assignments.filter(a => a.date === date);
    return dayAssignments.map(assignment => {
        const employee = employees.find((e: Employee) => e.employeeId === assignment.employeeId);
        return {
            employeeId: assignment.employeeId,
            employeeName: employee ? employee.name : '未知員工',
            shiftName: assignment.shiftName
        };
    });
};

const getFilteredShiftDisplays = (
    date: string | null,
    assignments: ShiftAssignment[],
    employees: Employee[],
    selectedEmployees: string[]
): ShiftDisplay[] => {
    // Log: Check input for a specific date (e.g., the 1st)
    if (date && date.endsWith('-01')) {
        console.log(`[getFilteredShiftDisplays] Date: ${date}, Assignments length: ${assignments.length}, Selected employees: ${selectedEmployees.length}`);
    }
    if (!date) return [];
    const dayAssignments = assignments.filter(a => {
        const employee = employees.find(e => e.id === a.employeeId);
        return a.date === date && employee && selectedEmployees.includes(employee.id);
    });
    const result = dayAssignments.map(assignment => {
        const employee = employees.find((e: Employee) => e.id === assignment.employeeId);
        return {
            employeeId: assignment.employeeId,
            employeeName: employee ? employee.name : '未知員工',
            shiftName: assignment.shiftName
        };
    });
    // Log: Check output for a specific date (e.g., the 1st)
    if (date && date.endsWith('-01')) {
        console.log(`[getFilteredShiftDisplays] Date: ${date}, Returning displays:`, result);
    }
    return result;
};

const Schedule: React.FC<ScheduleProps> = ({ employees }) => { // 從 props 解構 employees
    const { drawerOpen } = useDrawer();
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [assignmentToDelete, setAssignmentToDelete] = useState<ShiftAssignment | null>(null);
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [validationErrors, setValidationErrors] = useState<string[]>([]); // State for validation errors
    const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false); // State for success message

    // 當 employees prop 改變時，更新 selectedEmployees
    useEffect(() => {
        setSelectedEmployees(employees.map(emp => emp.id));
    }, [employees]);

    // 載入排班資料
    useEffect(() => {
        // TODO: 從後端 API 載入當月排班資料
        setAssignments([]);
    }, [currentDate.getFullYear(), currentDate.getMonth()]);

    // 處理點擊日期格子
    const handleDateClick = (year: number, month: number, day: number, isCurrentMonth: boolean) => {
        let targetYear = year;
        let targetMonth = month;

        if (!isCurrentMonth) {
            // 如果點擊的是上個月的日期
            if (day > 20) {  // 假設是上個月的日期
                targetMonth = month - 1;
                if (targetMonth < 0) {
                    targetMonth = 11;
                    targetYear = year - 1;
                }
            }
            // 如果點擊的是下個月的日期
            else {  // 假設是下個月的日期
                targetMonth = month + 1;
                if (targetMonth > 11) {
                    targetMonth = 0;
                    targetYear = year + 1;
                }
            }
        }

        // 使用字串格式化而不是 toISOString()
        const dateString = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateString);
        setOpenDialog(true);
    };

    // 月曆資料
    const calendarData = generateCalendarData(currentDate.getFullYear(), currentDate.getMonth());

    // 處理月份變更
    const handleMonthChange = (delta: number) => {
        setCurrentDate(prev => {
            const newMonth = prev.getMonth() + delta;
            if (newMonth < 0) {
                return new Date(prev.getFullYear() - 1, 11, prev.getDate());
            }
            if (newMonth > 11) {
                return new Date(prev.getFullYear() + 1, 0, prev.getDate());
            }
            return new Date(prev.getFullYear(), newMonth, prev.getDate());
        });
    };

    // 月份名稱
    const monthNames = [
        '一月', '二月', '三月', '四月', '五月', '六月',
        '七月', '八月', '九月', '十月', '十一月', '十二月'
    ];

    // 星期名稱
    const weekDayNames = ['日', '一', '二', '三', '四', '五', '六'];

    // 處理排班
    const handleAssign = (employeeId: string, shiftName: string) => {
        if (selectedDate) {
            // 確保不會重複新增相同的排班
            const existingAssignment = assignments.find(
                a => a.date === selectedDate && a.employeeId === employeeId
            );

            if (!existingAssignment) {
                setAssignments([
                    ...assignments,
                    {
                        employeeId,
                        date: selectedDate,
                        shiftName
                    }
                ]);
            }
            setOpenDialog(false);
        }
    };

    // 處理刪除按鈕點擊
    const handleDeleteClick = (assignment: ShiftAssignment) => {
        setAssignmentToDelete(assignment);
        setDeleteDialogOpen(true);
    };

    // 確認刪除
    const handleConfirmDelete = () => {
        if (assignmentToDelete) {
            setAssignments(assignments.filter(a =>
                !(a.employeeId === assignmentToDelete.employeeId &&
                    a.date === assignmentToDelete.date)
            ));
        }
        setDeleteDialogOpen(false);
        setAssignmentToDelete(null);
    };

    // 取消刪除
    const handleCancelDelete = () => {
        setDeleteDialogOpen(false);
        setAssignmentToDelete(null);
    };

    // --- Handler for the new validation button ---
    const handleValidateSchedule = () => {
        console.log("Validating schedule...");
        const errors = validateScheduleRules(assignments, employees, currentDate.getFullYear(), currentDate.getMonth());
        setValidationErrors(errors);
        if (errors.length === 0) {
            setShowSuccessSnackbar(true); // Show success message if no errors
        }
        console.log("Validation errors:", errors);
    };

    // Handler to close success snackbar
    const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setShowSuccessSnackbar(false);
    };

    const handleGenerateTestSchedule = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const testAssignments = generateTestSchedule(year, month, employees);
        // console.log('[handleGenerateTestSchedule] Generated Assignments:', testAssignments);
        setAssignments(testAssignments);
        setValidationErrors([]); // Clear previous validation errors when generating new schedule
    };

    // 處理員工選擇
    const handleEmployeeToggle = (employeeId: string) => {
        setSelectedEmployees(prev => {
            if (prev.includes(employeeId)) {
                return prev.filter(id => id !== employeeId);
            } else {
                return [...prev, employeeId];
            }
        });
    };

    // 處理全選/取消全選
    const handleSelectAllEmployees = () => {
        if (selectedEmployees.length === employees.length) {
            setSelectedEmployees([]);
        } else {
            setSelectedEmployees(employees.map(emp => emp.id));
        }
    };

    // 在 Schedule 組件中添加統計函數
    const calculateShiftStatistics = () => {
        const statistics: { [key: string]: { [key: string]: number } } = {};

        // 初始化統計物件
        employees.forEach(emp => {
            statistics[emp.employeeId] = {
                '白班': 0,
                '配器械班': 0,
                '小夜班': 0,
                '大夜班': 0,
                '12-8班': 0,
                '9-5班': 0,
                '白班待命': 0,
                '小夜待命': 0,
                '大夜待命': 0,
                'Off日待': 0,
                'Off夜待': 0,
                '休假': 0,
                '例假': 0
            };
        });

        // 統計每個員工的班別數量
        assignments.forEach(assignment => {
            if (statistics[assignment.employeeId]) {
                statistics[assignment.employeeId][assignment.shiftName] =
                    (statistics[assignment.employeeId][assignment.shiftName] || 0) + 1;
            }
        });

        return statistics;
    };

    // Log: Check assignments state during render
    console.log(`[Schedule Render] Assignments length: ${assignments.length}`);

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: 'calc(100vh - 64px)',
            p: 2,
            overflowY: 'auto'
        }}>
            {/* Header Section */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                flexShrink: 0
            }}>
                <Typography variant="h4" component="h1">
                    排班表
                </Typography>
                {/* Month Navigation and Action Buttons */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton onClick={() => handleMonthChange(-1)} size="small">
                        <ChevronLeftIcon />
                    </IconButton>
                    <Typography variant="h6">
                        {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
                    </Typography>
                    <IconButton onClick={() => handleMonthChange(1)} size="small">
                        <ChevronRightIcon />
                    </IconButton>
                    {/* Add Validation Button */}
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={handleValidateSchedule}
                        size="small"
                        sx={{ ml: 1 }}
                        startIcon={<CheckCircleOutlineIcon />}
                    >
                        檢查規則
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleGenerateTestSchedule}
                        size="small"
                        sx={{ ml: 1 }}
                    >
                        生成測試班表
                    </Button>
                </Box>
            </Box>

            {/* Validation Error Display */}
            {validationErrors.length > 0 && (
                <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>
                    <Typography variant="h6" gutterBottom>排班規則檢查結果：</Typography>
                    <List dense>
                        {validationErrors.map((error, index) => (
                            <ListItem key={index} sx={{ pl: 0 }}>
                                <ListItemIcon sx={{ minWidth: '30px' }}>
                                    <ErrorOutlineIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary={error} />
                            </ListItem>
                        ))}
                    </List>
                </Alert>
            )}

            {/* Main Content Area (Employee List + Calendar) */}
            <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, minHeight: 0 }}>
                {/* Employee List Sidebar */}
                <Paper sx={{
                    width: drawerOpen ? 200 : 0,
                    minWidth: drawerOpen ? 200 : 0,
                    overflowY: 'auto',
                    transition: (theme: any) => theme.transitions.create('width', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 0
                }}>
                    <Box sx={{ p: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            員工列表
                        </Typography>
                        <ListItemButton
                            onClick={handleSelectAllEmployees}
                            sx={{ pl: 0 }}
                        >
                            <Checkbox
                                edge="start"
                                checked={selectedEmployees.length === employees.length}
                                indeterminate={selectedEmployees.length > 0 && selectedEmployees.length < employees.length}
                            />
                            <ListItemText primary="全選" />
                        </ListItemButton>
                        <Divider />
                        <List sx={{ overflow: 'auto' }}>
                            {employees.map((employee) => (
                                <ListItemButton
                                    key={employee.id}
                                    onClick={() => handleEmployeeToggle(employee.id)}
                                    sx={{ pl: 0 }}
                                >
                                    <Checkbox
                                        edge="start"
                                        checked={selectedEmployees.includes(employee.id)}
                                    />
                                    <ListItemText primary={employee.name} />
                                </ListItemButton>
                            ))}
                        </List>
                    </Box>
                </Paper>

                {/* Calendar Table */}
                <Paper sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
                        <Table sx={{
                            tableLayout: 'fixed',
                            '& td': {
                                width: `${100 / 7}%`,
                                minWidth: 120,
                                border: '1px solid #eee'
                            }
                        }}>
                            <TableHead>
                                <TableRow>
                                    {weekDayNames.map((day) => (
                                        <TableCell
                                            key={day}
                                            align="center"
                                            sx={{
                                                position: 'sticky',
                                                top: 0,
                                                backgroundColor: 'background.paper',
                                                zIndex: 1,
                                                borderBottom: '2px solid #ccc'
                                            }}
                                        >
                                            {day}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {calendarData.map((week, weekIndex) => (
                                    <TableRow key={weekIndex}>
                                        {week.map((day, dayIndex) => {
                                            // Calculate date string for this cell
                                            let targetYear = currentDate.getFullYear();
                                            let targetMonth = currentDate.getMonth();
                                            if (!day.isCurrentMonth) {
                                                if (day.day > 20) { targetMonth--; if (targetMonth < 0) { targetMonth = 11; targetYear--; } }
                                                else { targetMonth++; if (targetMonth > 11) { targetMonth = 0; targetYear++; } }
                                            }
                                            const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
                                            const displays = getFilteredShiftDisplays(dateStr, assignments, employees, selectedEmployees);

                                            return (
                                                <TableCell
                                                    key={dayIndex}
                                                    align="center"
                                                    onClick={() => handleDateClick(
                                                        currentDate.getFullYear(),
                                                        currentDate.getMonth(),
                                                        day.day,
                                                        day.isCurrentMonth
                                                    )}
                                                    sx={{
                                                        height: '120px',
                                                        verticalAlign: 'top',
                                                        cursor: 'pointer',
                                                        p: '4px 8px',
                                                        '&:hover': {
                                                            bgcolor: 'rgba(0, 0, 0, 0.04)',
                                                        },
                                                        ...(day && !day.isCurrentMonth && {
                                                            bgcolor: '#f5f5f5',
                                                            color: '#999'
                                                        })
                                                    }}
                                                >
                                                    <Box sx={{ mb: 1, textAlign: 'right', fontSize: '0.8rem', color: day.isCurrentMonth ? 'inherit' : '#bbb' }}>{day.day}</Box>
                                                    <Box sx={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 0.5,
                                                        alignItems: 'center',
                                                        maxHeight: 'calc(100% - 24px)',
                                                        overflowY: 'auto',
                                                        width: '100%',
                                                        '&::-webkit-scrollbar': { width: '4px' },
                                                        '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '2px' }
                                                    }}>
                                                        {displays.map((shift, index) => (
                                                            <Box
                                                                key={`${shift.employeeId}-${index}`}
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    backgroundColor: getShiftColor(shift.shiftName).main,
                                                                    color: 'white',
                                                                    borderRadius: 1,
                                                                    p: '2px 4px',
                                                                    pl: 1,
                                                                    pr: '28px',
                                                                    mb: 0.5,
                                                                    position: 'relative',
                                                                    width: '100%',
                                                                    fontSize: '0.7rem',
                                                                    minHeight: '24px',
                                                                    overflow: 'hidden',
                                                                    '&:hover': {
                                                                        backgroundColor: getShiftColor(shift.shiftName).light,
                                                                        color: 'rgba(0, 0, 0, 0.87)',
                                                                        '& .deleteButton': { color: 'rgba(0, 0, 0, 0.87)' }
                                                                    }
                                                                }}
                                                            >
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        flex: 1,
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                        lineHeight: 1.2
                                                                    }}
                                                                >
                                                                    {`${shift.employeeName} - ${shift.shiftName}`}
                                                                </Typography>
                                                                <IconButton
                                                                    className="deleteButton"
                                                                    size="small"
                                                                    sx={{
                                                                        color: 'white',
                                                                        padding: '1px',
                                                                        position: 'absolute',
                                                                        right: 2,
                                                                        top: '50%',
                                                                        transform: 'translateY(-50%)',
                                                                        width: '18px', height: '18px', minWidth: '18px',
                                                                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }
                                                                    }}
                                                                    onClick={(e: React.MouseEvent) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteClick({
                                                                            employeeId: shift.employeeId,
                                                                            date: dateStr,
                                                                            shiftName: shift.shiftName
                                                                        });
                                                                    }}
                                                                >
                                                                    <CloseIcon sx={{ fontSize: '0.8rem' }} />
                                                                </IconButton>
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>

            {/* ... (Existing Dialogs: Assignment, Delete Confirm) ... */}
            <Dialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    排班 - {selectedDate}
                </DialogTitle>
                <DialogContent>
                    {selectedDate && (
                        <ShiftAssignmentForm
                            date={selectedDate}
                            employees={employees}
                            existingAssignments={assignments}
                            onAssign={handleAssign}
                            shiftDetailsMap={shiftDetailsMap}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)} color="inherit">
                        取消
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={deleteDialogOpen}
                onClose={handleCancelDelete}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>確認刪除</DialogTitle>
                <DialogContent>
                    {assignmentToDelete && (
                        <Typography>
                            確定要刪除 {assignmentToDelete.date}
                            {employees.find(e => e.id === assignmentToDelete.employeeId)?.name} 的
                            {assignmentToDelete.shiftName} 班別嗎？
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelDelete} color="inherit">
                        取消
                    </Button>
                    <Button onClick={handleConfirmDelete} color="error">
                        刪除
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Success Snackbar */}
            <Snackbar
                open={showSuccessSnackbar}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
                    排班規則檢查完畢，未發現問題！
                </Alert>
            </Snackbar>

            {/* Statistics Table (moved outside main flex box to prevent height issues) */}
            <Paper sx={{ mt: 2, p: 2, overflowX: 'auto', flexShrink: 0 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    本月班別統計
                </Typography>
                <Table size="small" sx={{ minWidth: 1000 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell>員工姓名</TableCell>
                            <TableCell align="center">白班</TableCell>
                            <TableCell align="center">配器械班</TableCell>
                            <TableCell align="center">小夜班</TableCell>
                            <TableCell align="center">大夜班</TableCell>
                            <TableCell align="center">12-8班</TableCell>
                            <TableCell align="center">9-5班</TableCell>
                            <TableCell align="center">白班待命</TableCell>
                            <TableCell align="center">小夜待命</TableCell>
                            <TableCell align="center">大夜待命</TableCell>
                            <TableCell align="center">Off日待</TableCell>
                            <TableCell align="center">Off夜待</TableCell>
                            <TableCell align="center">休假</TableCell>
                            <TableCell align="center">例假</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {employees.map(employee => {
                            const stats = calculateShiftStatistics()[employee.id] || {};
                            return (
                                <TableRow key={employee.id}>
                                    <TableCell>{employee.name}</TableCell>
                                    <TableCell align="center">{stats['白班'] || 0}</TableCell>
                                    <TableCell align="center">{stats['配器械班'] || 0}</TableCell>
                                    <TableCell align="center">{stats['小夜班'] || 0}</TableCell>
                                    <TableCell align="center">{stats['大夜班'] || 0}</TableCell>
                                    <TableCell align="center">{stats['12-8班'] || 0}</TableCell>
                                    <TableCell align="center">{stats['9-5班'] || 0}</TableCell>
                                    <TableCell align="center">{stats['白班待命'] || 0}</TableCell>
                                    <TableCell align="center">{stats['小夜待命'] || 0}</TableCell>
                                    <TableCell align="center">{stats['大夜待命'] || 0}</TableCell>
                                    <TableCell align="center">{stats['Off日待'] || 0}</TableCell>
                                    <TableCell align="center">{stats['Off夜待'] || 0}</TableCell>
                                    <TableCell align="center">{stats['休假'] || 0}</TableCell>
                                    <TableCell align="center">{stats['例假'] || 0}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
};

export default Schedule; 