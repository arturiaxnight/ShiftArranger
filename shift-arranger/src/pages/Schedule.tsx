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
    Drawer,
    List,
    ListItem,
    ListItemText,
    ListItemButton,
    Checkbox,
    Divider,
} from '@mui/material';
import {
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Add as AddIcon,
    Close as CloseIcon,
    Menu as MenuIcon,
} from '@mui/icons-material';
import ShiftAssignmentForm from '../components/ShiftAssignmentForm';
import { useDrawer } from '../contexts/DrawerContext';

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

// 工具函數：生成測試用的員工資料
const generateTestEmployees = (): Employee[] => {
    return [
        { id: '1', name: '張小明', employeeId: 'EMP001' },
        { id: '2', name: '李小華', employeeId: 'EMP002' },
        { id: '3', name: '王小美', employeeId: 'EMP003' },
        { id: '4', name: '陳小強', employeeId: 'EMP004' },
        { id: '5', name: '林小芳', employeeId: 'EMP005' },
    ];
};

// 工具函數：生成測試用的班表
const generateTestSchedule = (year: number, month: number, employees: Employee[]): ShiftAssignment[] => {
    const daysInMonth = getDaysInMonth(year, month);
    const assignments: ShiftAssignment[] = [];
    const regularShifts = ['白班', '配器械班', '小夜班', '大夜班', '12-8班', '9-5班'];
    const standbyShifts = ['白班待命', '小夜待命', '大夜待命', 'Off日待', 'Off夜待'];
    const offShifts = ['休假', '例假'];

    // 為每個員工追蹤最近的休假和例假日期
    const lastOffDays: { [key: string]: { lastRestDay: number; lastOffDay: number } } = {};
    employees.forEach(emp => {
        lastOffDays[emp.employeeId] = {
            lastRestDay: -7, // 初始設為-7，確保第一週一定會安排
            lastOffDay: -7
        };
    });

    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // 檢查每個員工是否需要安排休假或例假
        employees.forEach((employee, index) => {
            const lastOff = lastOffDays[employee.employeeId];
            
            // 如果距離上次休假超過7天，優先安排休假
            if (day - lastOff.lastRestDay > 7) {
                assignments.push({
                    employeeId: employee.employeeId,
                    date,
                    shiftName: '休假'
                });
                lastOff.lastRestDay = day;
                return;
            }
            
            // 如果距離上次例假超過7天，優先安排例假
            if (day - lastOff.lastOffDay > 7) {
                assignments.push({
                    employeeId: employee.employeeId,
                    date,
                    shiftName: '例假'
                });
                lastOff.lastOffDay = day;
                return;
            }

            // 如果不需要安排假日，則安排一般班次
            const weekDay = getWeekDay(year, month, day);
            if (weekDay < 5) { // 週一到週五
                // 一般班次
                assignments.push({
                    employeeId: employee.employeeId,
                    date,
                    shiftName: regularShifts[index % regularShifts.length]
                });
                
                // 每三天安排一個待命班
                if (day % 3 === index % 3) {
                    assignments.push({
                        employeeId: employee.employeeId,
                        date,
                        shiftName: standbyShifts[index % standbyShifts.length]
                    });
                }
            } else { // 週末
                // 安排一般班次
                assignments.push({
                    employeeId: employee.employeeId,
                    date,
                    shiftName: regularShifts[(index + day) % regularShifts.length]
                });
                
                // 週末增加待命班機率
                if (Math.random() > 0.5) {
                    assignments.push({
                        employeeId: employee.employeeId,
                        date,
                        shiftName: standbyShifts[(index + day) % standbyShifts.length]
                    });
                }
            }
        });
    }

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

const Schedule: React.FC = () => {
    const { drawerOpen } = useDrawer();
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [assignmentToDelete, setAssignmentToDelete] = useState<ShiftAssignment | null>(null);
    const [employees] = useState<Employee[]>(generateTestEmployees());
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>(employees.map(emp => emp.id));

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

    const handleGenerateTestSchedule = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const testAssignments = generateTestSchedule(year, month, generateTestEmployees());
        setAssignments(testAssignments);
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

    // 修改 getShiftDisplays 函數，加入員工過濾
    const getFilteredShiftDisplays = (
        date: string | null,
        assignments: ShiftAssignment[],
        employees: Employee[],
        selectedEmployees: string[]
    ): ShiftDisplay[] => {
        if (!date) return [];
        const dayAssignments = assignments.filter(a => {
            const employee = employees.find(e => e.employeeId === a.employeeId);
            return a.date === date && employee && selectedEmployees.includes(employee.id);
        });
        return dayAssignments.map(assignment => {
            const employee = employees.find((e: Employee) => e.employeeId === assignment.employeeId);
            return {
                employeeId: assignment.employeeId,
                employeeName: employee ? employee.name : '未知員工',
                shiftName: assignment.shiftName
            };
        });
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

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 2 
            }}>
                <Typography variant="h4" component="h1">
                    排班表
                </Typography>
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

            <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 180px)' }}>
                <Paper sx={{ 
                    width: drawerOpen ? 200 : 0,
                    minWidth: drawerOpen ? 200 : 0,
                    overflow: 'hidden',
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

                <Paper sx={{ 
                    flexGrow: 1,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <TableContainer sx={{ 
                        height: '100%',
                        overflow: 'auto'
                    }}>
                        <Table sx={{
                            tableLayout: 'fixed',
                            '& td': {
                                width: `${100/7}%`,
                                minWidth: 120,
                                maxWidth: 200
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
                                                zIndex: 1
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
                                        {week.map((day, dayIndex) => (
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
                                                    height: '100px',
                                                    verticalAlign: 'top',
                                                    cursor: 'pointer',
                                                    p: 1,
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
                                                    alignItems: 'center',
                                                    maxHeight: 'calc(100% - 24px)',
                                                    overflowY: 'auto',
                                                    width: '100%',
                                                    '&::-webkit-scrollbar': {
                                                        width: '4px'
                                                    },
                                                    '&::-webkit-scrollbar-thumb': {
                                                        backgroundColor: 'rgba(0,0,0,0.2)',
                                                        borderRadius: '2px'
                                                    }
                                                }}>
                                                    {(() => {
                                                        let targetYear = currentDate.getFullYear();
                                                        let targetMonth = currentDate.getMonth();

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

                                                        const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
                                                        
                                                        return getFilteredShiftDisplays(dateStr, assignments, employees, selectedEmployees).map((shift, index) => (
                                                            <Box
                                                                key={`${shift.employeeId}-${index}`}
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    backgroundColor: getShiftColor(shift.shiftName).main,
                                                                    color: 'white',
                                                                    borderRadius: 1,
                                                                    p: 1,
                                                                    pl: 2,
                                                                    pr: 4,
                                                                    mb: 0.5,
                                                                    position: 'relative',
                                                                    width: '100%',
                                                                    fontSize: '0.75rem',
                                                                    minHeight: '28px',
                                                                    '&:hover': {
                                                                        backgroundColor: getShiftColor(shift.shiftName).light,
                                                                        color: 'rgba(0, 0, 0, 0.87)',
                                                                        '& .deleteButton': {
                                                                            color: 'rgba(0, 0, 0, 0.87)',
                                                                            '&:hover': {
                                                                                backgroundColor: 'rgba(0, 0, 0, 0.1)'
                                                                            }
                                                                        }
                                                                    }
                                                                }}
                                                            >
                                                                <Typography 
                                                                    variant="body2" 
                                                                    sx={{ 
                                                                        flex: 1,
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                        pr: 2
                                                                    }}
                                                                >
                                                                    {`${shift.employeeName} - ${shift.shiftName}`}
                                                                </Typography>
                                                                <IconButton
                                                                    className="deleteButton"
                                                                    size="small"
                                                                    sx={{ 
                                                                        color: 'white',
                                                                        padding: '2px',
                                                                        position: 'absolute',
                                                                        right: 4,
                                                                        top: '50%',
                                                                        transform: 'translateY(-50%)',
                                                                        width: '20px',
                                                                        height: '20px',
                                                                        minWidth: '20px',
                                                                        '&:hover': {
                                                                            backgroundColor: 'rgba(255,255,255,0.2)'
                                                                        }
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
                                                                    <CloseIcon sx={{ fontSize: '0.875rem' }} />
                                                                </IconButton>
                                                            </Box>
                                                        ));
                                                    })()}
                                                </Box>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>

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
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)} color="inherit">
                        取消
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 刪除確認對話框 */}
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

            {/* 統計表格 */}
            <Paper sx={{ mt: 2, p: 2, overflowX: 'auto' }}>
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
                            const stats = calculateShiftStatistics()[employee.employeeId];
                            return (
                                <TableRow key={employee.id}>
                                    <TableCell>{employee.name}</TableCell>
                                    <TableCell align="center">{stats['白班']}</TableCell>
                                    <TableCell align="center">{stats['配器械班']}</TableCell>
                                    <TableCell align="center">{stats['小夜班']}</TableCell>
                                    <TableCell align="center">{stats['大夜班']}</TableCell>
                                    <TableCell align="center">{stats['12-8班']}</TableCell>
                                    <TableCell align="center">{stats['9-5班']}</TableCell>
                                    <TableCell align="center">{stats['白班待命']}</TableCell>
                                    <TableCell align="center">{stats['小夜待命']}</TableCell>
                                    <TableCell align="center">{stats['大夜待命']}</TableCell>
                                    <TableCell align="center">{stats['Off日待']}</TableCell>
                                    <TableCell align="center">{stats['Off夜待']}</TableCell>
                                    <TableCell align="center">{stats['休假']}</TableCell>
                                    <TableCell align="center">{stats['例假']}</TableCell>
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