import React, { useState } from 'react';
import {
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent,
    Typography,
    Alert,
    Button,
} from '@mui/material';
import { addDays, subDays, parse, format, eachDayOfInterval } from 'date-fns';

interface Employee {
    id: string;
    name: string;
    employeeId: string;
}

interface Shift {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    type: 'regular' | 'standby' | 'off' | 'holiday';
}

interface Assignment {
    employeeId: string;
    date: string;
    shiftName: string;
}

interface ShiftAssignmentFormProps {
    date: string;
    employees: Employee[];
    existingAssignments: {
        employeeId: string;
        date: string;
        shiftName: string;
    }[];
    onAssign: (employeeId: string, shiftName: string) => void;
}

const shifts = [
    // 一般班別
    { id: 'white', name: '白班', startTime: '07:30', endTime: '15:30', type: 'regular' },
    { id: 'evening', name: '小夜班', startTime: '15:30', endTime: '23:00', type: 'regular' },
    { id: 'night', name: '大夜班', startTime: '23:00', endTime: '08:00', type: 'regular' },
    { id: '12-8', name: '12-8班', startTime: '12:00', endTime: '20:00', type: 'regular' },
    { id: '9-5', name: '9-5班', startTime: '09:00', endTime: '17:00', type: 'regular' },

    // 待命班別
    { id: 'white-standby', name: '白班待命', startTime: '07:00', endTime: '15:00', type: 'standby' },
    { id: 'evening-standby', name: '小夜待命', startTime: '15:00', endTime: '23:00', type: 'standby' },
    { id: 'night-standby', name: '大夜待命', startTime: '23:00', endTime: '07:00', type: 'standby' },
    { id: 'off-day-standby', name: 'Off日待', startTime: '07:00', endTime: '19:00', type: 'standby' },
    { id: 'off-night-standby', name: 'Off夜待', startTime: '19:00', endTime: '07:00', type: 'standby' },

    // 休假和例假
    { id: 'off', name: '休假', startTime: '-', endTime: '-', type: 'off' },
    { id: 'holiday', name: '例假', startTime: '-', endTime: '-', type: 'holiday' }
];

// 檢查時間間隔的函數
const checkTimeInterval = (
    date: string,
    employeeId: string,
    shiftToCheck: typeof shifts[0],
    existingAssignments: {
        employeeId: string;
        date: string;
        shiftName: string;
    }[]
): { isValid: boolean; message: string | null } => {
    // 解析當前選擇的班別時間
    const currentDate = parse(date, 'yyyy-MM-dd', new Date());
    const prevDay = format(subDays(currentDate, 1), 'yyyy-MM-dd');
    const nextDay = format(addDays(currentDate, 1), 'yyyy-MM-dd');

    // 獲取前一天和後一天的排班
    const prevDayShift = existingAssignments.find(
        a => a.employeeId === employeeId && a.date === prevDay
    );
    const nextDayShift = existingAssignments.find(
        a => a.employeeId === employeeId && a.date === nextDay
    );

    // 檢查與前一天班別的時間間隔
    if (prevDayShift) {
        const prevShift = shifts.find(s => s.name === prevDayShift.shiftName);
        if (prevShift) {
            const prevEndTime = parse(prevShift.endTime, 'HH:mm', new Date());
            const currentStartTime = parse(shiftToCheck.startTime, 'HH:mm', new Date());

            // 如果前一天是大夜班，結束時間要加一天
            const prevEndHour = prevShift.id === 'night' ?
                prevEndTime.getHours() + 24 :
                prevEndTime.getHours();

            const hourDiff = (currentStartTime.getHours() + 24) - prevEndHour;

            if (hourDiff < 12) {
                return {
                    isValid: false,
                    message: `與前一天的${prevShift.name}間隔不足12小時`
                };
            }
        }
    }

    // 檢查與後一天班別的時間間隔
    if (nextDayShift) {
        const nextShift = shifts.find(s => s.name === nextDayShift.shiftName);
        if (nextShift) {
            const currentEndTime = parse(shiftToCheck.endTime, 'HH:mm', new Date());
            const nextStartTime = parse(nextShift.startTime, 'HH:mm', new Date());

            // 如果當前選擇是大夜班，結束時間要加一天
            const currentEndHour = shiftToCheck.id === 'night' ?
                currentEndTime.getHours() + 24 :
                currentEndTime.getHours();

            const hourDiff = (nextStartTime.getHours() + 24) - currentEndHour;

            if (hourDiff < 12) {
                return {
                    isValid: false,
                    message: `與後一天的${nextShift.name}間隔不足12小時`
                };
            }
        }
    }

    return { isValid: true, message: null };
};

// 檢查休假規則的函數
const checkRestDayRules = (
    date: string,
    employeeId: string,
    existingAssignments: {
        employeeId: string;
        date: string;
        shiftName: string;
    }[],
    selectedShiftType: string
): { isValid: boolean; message: string | null } => {
    // 解析選擇的日期
    const selectedDate = parse(date, 'yyyy-MM-dd', new Date());

    // 計算前後 7 天的日期範圍
    const startDate = subDays(selectedDate, 3);
    const endDate = addDays(selectedDate, 3);

    // 獲取日期範圍內的所有日期
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate })
        .map(d => format(d, 'yyyy-MM-dd'));

    // 獲取日期範圍內該員工的所有排班
    const weeklyAssignments = [
        ...existingAssignments.filter(a =>
            a.employeeId === employeeId &&
            dateRange.includes(a.date)
        ),
        // 加入當前要新增的班別
        {
            employeeId,
            date,
            shiftName: shifts.find(s => s.id === selectedShiftType)?.name || ''
        }
    ];

    // 計算休假和例假的數量
    const offDays = weeklyAssignments.filter(a =>
        shifts.find(s => s.name === a.shiftName && s.type === 'off')
    ).length;

    const holidays = weeklyAssignments.filter(a =>
        shifts.find(s => s.name === a.shiftName && s.type === 'holiday')
    ).length;

    // 如果選擇的是休假或例假，不需要進行檢查
    const selectedShift = shifts.find(s => s.id === selectedShiftType);
    if (selectedShift && (selectedShift.type === 'off' || selectedShift.type === 'holiday')) {
        return { isValid: true, message: null };
    }

    // 檢查是否符合規則
    if (offDays === 0) {
        return {
            isValid: false,
            message: '每7天內必須安排至少1天休假，請先安排休假'
        };
    }

    if (holidays === 0) {
        return {
            isValid: false,
            message: '每7天內必須安排至少1天例假，請先安排例假'
        };
    }

    return { isValid: true, message: null };
};

const ShiftAssignmentForm: React.FC<ShiftAssignmentFormProps> = ({
    date,
    employees,
    existingAssignments,
    onAssign,
}) => {
    const [selectedEmployee, setSelectedEmployee] = useState<string>('');
    const [selectedShift, setSelectedShift] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // 檢查員工在指定日期是否已經被排班
    const isEmployeeAssigned = (employeeId: string) => {
        return existingAssignments.some(a => a.employeeId === employeeId && a.date === date);
    };

    // 檢查班別是否可以被選擇
    const isShiftDisabled = (shift: typeof shifts[0]): boolean => {
        if (!selectedEmployee) return false;
        const { isValid } = checkTimeInterval(date, selectedEmployee, shift, existingAssignments);
        return !isValid;
    };

    // 處理員工選擇
    const handleEmployeeChange = (event: SelectChangeEvent) => {
        setSelectedEmployee(event.target.value);
        setSelectedShift(''); // 重置班別選擇
        setError(null);
    };

    // 處理班別選擇
    const handleShiftChange = (event: SelectChangeEvent) => {
        const shiftId = event.target.value;
        const selectedShiftData = shifts.find(s => s.id === shiftId);

        if (selectedShiftData && selectedEmployee) {
            // 檢查時間間隔
            const timeIntervalCheck = checkTimeInterval(
                date,
                selectedEmployee,
                selectedShiftData,
                existingAssignments
            );

            if (!timeIntervalCheck.isValid) {
                setError(timeIntervalCheck.message);
                return;
            }

            // 檢查休假規則
            const restDayCheck = checkRestDayRules(
                date,
                selectedEmployee,
                existingAssignments,
                shiftId
            );

            if (!restDayCheck.isValid) {
                setError(restDayCheck.message);
                return;
            }
        }

        setSelectedShift(shiftId);
        setError(null);
    };

    // 處理確認排班
    const handleConfirm = () => {
        if (selectedEmployee && selectedShift && !error) {
            const shift = shifts.find(s => s.id === selectedShift);
            if (shift) {
                onAssign(selectedEmployee, shift.name);
                setSelectedEmployee('');
                setSelectedShift('');
            }
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
                選擇員工和班別
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <FormControl fullWidth>
                <InputLabel>員工</InputLabel>
                <Select
                    value={selectedEmployee}
                    label="員工"
                    onChange={handleEmployeeChange}
                >
                    {employees.map((employee) => (
                        <MenuItem
                            key={employee.id}
                            value={employee.id}
                            disabled={isEmployeeAssigned(employee.id)}
                        >
                            {employee.name} ({employee.employeeId})
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl fullWidth>
                <InputLabel>班別</InputLabel>
                <Select
                    value={selectedShift}
                    label="班別"
                    onChange={handleShiftChange}
                    disabled={!selectedEmployee}
                >
                    {shifts.map((shift) => (
                        <MenuItem
                            key={shift.id}
                            value={shift.id}
                            disabled={isShiftDisabled(shift)}
                        >
                            {shift.name} ({shift.startTime}-{shift.endTime})
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <Button
                variant="contained"
                onClick={handleConfirm}
                disabled={!selectedEmployee || !selectedShift || !!error}
                sx={{ mt: 2 }}
            >
                確認排班
            </Button>
        </Box>
    );
};

export default ShiftAssignmentForm; 