import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Add as AddIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import ShiftAssignmentForm from '../components/ShiftAssignmentForm';

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

// 工具函數：取得指定月份的天數
const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
};

// 工具函數：取得指定日期是星期幾（0-6）
const getWeekDay = (year: number, month: number, day: number) => {
    return new Date(year, month, day).getDay();
};

// 工具函數：產生月曆資料
const generateCalendarData = (year: number, month: number) => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayWeekDay = getWeekDay(year, month, 1);
    const weeks: CalendarDay[][] = [];

    // 計算上個月的天數
    const prevMonth = month - 1 < 0 ? 11 : month - 1;
    const prevMonthYear = month - 1 < 0 ? year - 1 : year;
    const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonth);

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

const Schedule: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(() => {
        const now = new Date();
        return {
            year: now.getFullYear(),
            month: now.getMonth(),
        };
    });

    // 模擬員工資料
    const [employees, setEmployees] = useState<Employee[]>([]);
    // 模擬排班資料
    const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
    // 選中的日期
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    // 對話框開關
    const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
    // 新增刪除確認對話框的狀態
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [assignmentToDelete, setAssignmentToDelete] = useState<ShiftAssignment | null>(null);

    // 載入員工資料
    useEffect(() => {
        // TODO: 從後端 API 載入員工資料
        setEmployees([
            { id: '1', name: '張三', employeeId: 'EMP001' },
            { id: '2', name: '李四', employeeId: 'EMP002' },
        ]);
    }, []);

    // 載入排班資料
    useEffect(() => {
        // TODO: 從後端 API 載入當月排班資料
        setAssignments([]);
    }, [currentDate.year, currentDate.month]);

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
        setIsAssignmentDialogOpen(true);
    };

    // 月曆資料
    const calendarData = generateCalendarData(currentDate.year, currentDate.month);

    // 處理月份變更
    const handleMonthChange = (delta: number) => {
        setCurrentDate(prev => {
            const newMonth = prev.month + delta;
            if (newMonth < 0) {
                return { year: prev.year - 1, month: 11 };
            }
            if (newMonth > 11) {
                return { year: prev.year + 1, month: 0 };
            }
            return { ...prev, month: newMonth };
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
            setIsAssignmentDialogOpen(false);
        }
    };

    // 處理刪除按鈕點擊
    const handleDeleteClick = (assignment: ShiftAssignment) => {
        setAssignmentToDelete(assignment);
        setDeleteConfirmOpen(true);
    };

    // 確認刪除
    const handleConfirmDelete = () => {
        if (assignmentToDelete) {
            setAssignments(assignments.filter(a =>
                !(a.employeeId === assignmentToDelete.employeeId &&
                    a.date === assignmentToDelete.date)
            ));
        }
        setDeleteConfirmOpen(false);
        setAssignmentToDelete(null);
    };

    // 取消刪除
    const handleCancelDelete = () => {
        setDeleteConfirmOpen(false);
        setAssignmentToDelete(null);
    };

    return (
        <Container>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h4" component="h1">
                    排班表
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => handleMonthChange(-1)}>
                        <ChevronLeftIcon />
                    </IconButton>
                    <Typography variant="h6">
                        {currentDate.year}年 {monthNames[currentDate.month]}
                    </Typography>
                    <IconButton onClick={() => handleMonthChange(1)}>
                        <ChevronRightIcon />
                    </IconButton>
                </Box>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            {weekDayNames.map((day) => (
                                <TableCell key={day} align="center">{day}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {calendarData.map((week, weekIndex) => (
                            <TableRow key={weekIndex}>
                                {week.map((day, dayIndex) => (
                                    <TableCell
                                        key={dayIndex}
                                        align="center"
                                        onClick={() => handleDateClick(
                                            currentDate.year,
                                            currentDate.month,
                                            day.day,
                                            day.isCurrentMonth
                                        )}
                                        sx={{
                                            height: '100px',
                                            width: '14.28%',
                                            verticalAlign: 'top',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                bgcolor: 'rgba(0, 0, 0, 0.04)',
                                            },
                                            ...(day && !day.isCurrentMonth && {
                                                bgcolor: '#f5f5f5',
                                                color: '#999'
                                            })
                                        }}
                                    >
                                        <Box sx={{ mb: 1 }}>{day.day}</Box>
                                        <Box sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 0.5,
                                            alignItems: 'center'
                                        }}>
                                            {assignments
                                                .filter(a => {
                                                    let targetYear = currentDate.year;
                                                    let targetMonth = currentDate.month;

                                                    if (!day.isCurrentMonth) {
                                                        if (day.day > 20) {
                                                            targetMonth--;
                                                            if (targetMonth < 0) {
                                                                targetMonth = 11;
                                                                targetYear--;
                                                            }
                                                        } else {
                                                            targetMonth++;
                                                            if (targetMonth > 11) {
                                                                targetMonth = 0;
                                                                targetYear++;
                                                            }
                                                        }
                                                    }

                                                    const targetDate = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
                                                    return a.date === targetDate;
                                                })
                                                .map((assignment, index) => {
                                                    const employee = employees.find(e => e.id === assignment.employeeId);
                                                    return (
                                                        <Box
                                                            key={index}
                                                            sx={{
                                                                fontSize: '0.8rem',
                                                                bgcolor: 'primary.light',
                                                                color: 'white',
                                                                p: 0.5,
                                                                borderRadius: 1,
                                                                width: '100%',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                '&:hover': {
                                                                    bgcolor: 'primary.main',
                                                                }
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // 防止觸發日期格子的點擊事件
                                                            }}
                                                        >
                                                            <span>{employee?.name} - {assignment.shiftName}</span>
                                                            <IconButton
                                                                size="small"
                                                                sx={{
                                                                    color: 'white',
                                                                    p: 0.2,
                                                                    '&:hover': {
                                                                        bgcolor: 'error.main',
                                                                    }
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteClick(assignment);
                                                                }}
                                                            >
                                                                <CloseIcon fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    );
                                                })}
                                        </Box>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog
                open={isAssignmentDialogOpen}
                onClose={() => setIsAssignmentDialogOpen(false)}
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
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsAssignmentDialogOpen(false)} color="inherit">
                        取消
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 刪除確認對話框 */}
            <Dialog
                open={deleteConfirmOpen}
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
        </Container>
    );
};

export default Schedule; 