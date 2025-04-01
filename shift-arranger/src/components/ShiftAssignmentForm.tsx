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
import { addDays, subDays, parse, format, eachDayOfInterval, differenceInHours } from 'date-fns';
import { isBefore } from 'date-fns';

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

interface ShiftDetails {
    name: string;
    startTime: string;
    endTime: string;
    isWorkShift: boolean;
    isOffShift: boolean;
    isRestDay: boolean;
    isMandatoryOff: boolean;
}

interface ShiftAssignmentFormProps {
    date: string;
    employees: Employee[];
    existingAssignments: Assignment[];
    onAssign: (employeeId: string, shiftName: string) => void;
    shiftDetailsMap: Map<string, ShiftDetails>;
}

const shifts: Shift[] = [
    // 一般班別
    { id: 'white', name: '白班', startTime: '07:30', endTime: '15:30', type: 'regular' },
    { id: 'evening', name: '小夜班', startTime: '15:00', endTime: '23:00', type: 'regular' },
    { id: 'night', name: '大夜班', startTime: '23:00', endTime: '08:00', type: 'regular' },
    { id: '12-8', name: '12-8班', startTime: '12:00', endTime: '20:00', type: 'regular' },
    { id: '9-5', name: '9-5班', startTime: '09:00', endTime: '17:00', type: 'regular' },
    { id: 'instrument', name: '配器械班', startTime: '07:30', endTime: '17:30', type: 'regular' },

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

// Helper function to get date object from assignment
const getShiftDateTime = (assignmentDate: string, timeStr: string): Date | null => {
    if (!timeStr || timeStr === '-') return null; // Handle invalid time string
    try {
        // Ensure assignmentDate is just the date part
        const datePart = assignmentDate.split(' ')[0];
        return parse(`${datePart} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());
    } catch (e) {
        console.error("Error parsing date/time:", assignmentDate, timeStr, e);
        return null;
    }
};

// Helper to check if a shift spans midnight
const doesShiftSpanMidnight = (shiftName: string, shiftDetailsMap: Map<string, ShiftDetails>): boolean => {
    const details = shiftDetailsMap.get(shiftName);
    if (!details || !details.startTime || !details.endTime || details.startTime === '-' || details.endTime === '-') return false;
    // More robust check considering parsing
    try {
        const start = parse(details.startTime, 'HH:mm', new Date());
        const end = parse(details.endTime, 'HH:mm', new Date());
        return isBefore(end, start); // Use date-fns isBefore for reliable comparison
    } catch {
        return false;
    }
};

// 檢查時間間隔的函數
const checkTimeInterval = (
    date: string,
    employeeId: string,
    shiftToCheck: Shift,
    existingAssignments: Assignment[],
    shiftDetailsMap: Map<string, ShiftDetails>
): { isValid: boolean; message: string | null } => {
    const currentDate = parse(date, 'yyyy-MM-dd', new Date());
    const prevDay = format(subDays(currentDate, 1), 'yyyy-MM-dd');
    const nextDay = format(addDays(currentDate, 1), 'yyyy-MM-dd');

    const prevDayAssignment = existingAssignments.find(
        a => a.employeeId === employeeId && a.date === prevDay
    );
    const nextDayAssignment = existingAssignments.find(
        a => a.employeeId === employeeId && a.date === nextDay
    );

    const shiftToCheckDetails = shiftDetailsMap.get(shiftToCheck.name);
    if (!shiftToCheckDetails?.isWorkShift) return { isValid: true, message: null };

    if (prevDayAssignment) {
        const prevShiftDetails = shiftDetailsMap.get(prevDayAssignment.shiftName);
        if (prevShiftDetails?.isWorkShift) {
            const prevEndTimeStr = prevShiftDetails.endTime;
            const currentStartTimeStr = shiftToCheckDetails.startTime;
            if (prevEndTimeStr && currentStartTimeStr && prevEndTimeStr !== '-' && currentStartTimeStr !== '-') {
                let prevEndDateTime = getShiftDateTime(prevDayAssignment.date, prevEndTimeStr);
                let currentStartDateTime = getShiftDateTime(date, currentStartTimeStr);
                if (prevEndDateTime && currentStartDateTime) {
                    if (doesShiftSpanMidnight(prevDayAssignment.shiftName, shiftDetailsMap)) {
                        prevEndDateTime = addDays(prevEndDateTime, 1);
                    }
                    const intervalHours = differenceInHours(currentStartDateTime, prevEndDateTime);
                    if (intervalHours < 12) {
                        return { isValid: false, message: `與前一天 ${prevDayAssignment.shiftName} 間隔不足12小時` };
                    }
                }
            }
        }
    }

    if (nextDayAssignment) {
        const nextShiftDetails = shiftDetailsMap.get(nextDayAssignment.shiftName);
        if (nextShiftDetails?.isWorkShift) {
            const currentEndTimeStr = shiftToCheckDetails.endTime;
            const nextStartTimeStr = nextShiftDetails.startTime;
            if (currentEndTimeStr && nextStartTimeStr && currentEndTimeStr !== '-' && nextStartTimeStr !== '-') {
                let currentEndDateTime = getShiftDateTime(date, currentEndTimeStr);
                let nextStartDateTime = getShiftDateTime(nextDayAssignment.date, nextStartTimeStr);
                if (currentEndDateTime && nextStartDateTime) {
                    if (doesShiftSpanMidnight(shiftToCheck.name, shiftDetailsMap)) {
                        currentEndDateTime = addDays(currentEndDateTime, 1);
                    }
                    const intervalHours = differenceInHours(nextStartDateTime, currentEndDateTime);
                    if (intervalHours < 12) {
                        return { isValid: false, message: `與後一天 ${nextDayAssignment.shiftName} 間隔不足12小時` };
                    }
                }
            }
        }
    }

    return { isValid: true, message: null };
};

// 檢查休假規則的函數
const checkRestDayRules = (
    date: string,
    employeeId: string,
    existingAssignments: Assignment[],
    selectedShiftId: string,
    shiftDetailsMap: Map<string, ShiftDetails>
): { isValid: boolean; message: string | null } => {
    const selectedDate = parse(date, 'yyyy-MM-dd', new Date());
    const startDate = subDays(selectedDate, 6);

    let hasRestDay = false;
    let hasMandatoryOff = false;

    const assignmentsInWindow = existingAssignments.filter(a => {
        if (a.employeeId !== employeeId) return false;
        try {
            const assignmentDate = parse(a.date, 'yyyy-MM-dd', new Date());
            return !isBefore(assignmentDate, startDate) && !isBefore(addDays(selectedDate, 1), assignmentDate);
        } catch { return false; }
    });

    const shiftToAdd = shifts.find(s => s.id === selectedShiftId);
    const shiftToAddDetails = shiftToAdd ? shiftDetailsMap.get(shiftToAdd.name) : null;

    if (shiftToAddDetails && shiftToAddDetails.isOffShift) {
        return { isValid: true, message: null };
    }

    if (shiftToAddDetails && !shiftToAddDetails.isOffShift) {
        const windowEndingYesterday = subDays(selectedDate, 1);
        const startWindowYesterday = subDays(windowEndingYesterday, 6);
        existingAssignments.filter(a => {
            if (a.employeeId !== employeeId) return false;
            try {
                const assignmentDate = parse(a.date, 'yyyy-MM-dd', new Date());
                return !isBefore(assignmentDate, startWindowYesterday) && !isBefore(addDays(windowEndingYesterday, 1), assignmentDate);
            } catch { return false; }
        }).forEach(a => {
            const details = shiftDetailsMap.get(a.shiftName);
            if (details?.isRestDay) hasRestDay = true;
            if (details?.isMandatoryOff) hasMandatoryOff = true;
        });
    }

    if (!hasRestDay) {
        return {
            isValid: false,
            message: '每7天內必須安排至少1天休假，請先安排休假'
        };
    }

    if (!hasMandatoryOff) {
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
    shiftDetailsMap,
}) => {
    const [selectedEmployee, setSelectedEmployee] = useState<string>('');
    const [selectedShift, setSelectedShift] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const isEmployeeAssigned = (employeeId: string) => {
        return existingAssignments.some(a => a.employeeId === employeeId && a.date === date);
    };

    const isShiftDisabled = (shift: Shift): boolean => {
        if (!selectedEmployee) return false;
        const { isValid } = checkTimeInterval(date, selectedEmployee, shift, existingAssignments, shiftDetailsMap);
        return !isValid;
    };

    const handleEmployeeChange = (event: SelectChangeEvent) => {
        setSelectedEmployee(event.target.value);
        setSelectedShift('');
        setError(null);
    };

    const handleShiftChange = (event: SelectChangeEvent) => {
        const shiftId = event.target.value;
        const selectedShiftData = shifts.find(s => s.id === shiftId);

        if (selectedShiftData && selectedEmployee) {
            const timeIntervalCheck = checkTimeInterval(
                date,
                selectedEmployee,
                selectedShiftData,
                existingAssignments,
                shiftDetailsMap
            );

            if (!timeIntervalCheck.isValid) {
                setError(timeIntervalCheck.message);
                setSelectedShift('');
                return;
            }

            const restDayCheck = checkRestDayRules(
                date,
                selectedEmployee,
                existingAssignments,
                shiftId,
                shiftDetailsMap
            );
            if (!restDayCheck.isValid) {
                setError(restDayCheck.message);
                setSelectedShift('');
                return;
            }

            setError(null);
            setSelectedShift(shiftId);
        }
    };

    const handleConfirm = () => {
        if (selectedEmployee && selectedShift) {
            const shiftName = shifts.find(s => s.id === selectedShift)?.name;
            if (shiftName) {
                onAssign(selectedEmployee, shiftName);
            }
        }
    };

    return (
        <Box component="form" noValidate autoComplete="off" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
                選擇員工和班別
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <FormControl fullWidth>
                <InputLabel id="employee-select-label">員工</InputLabel>
                <Select
                    labelId="employee-select-label"
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
                            {employee.name} {isEmployeeAssigned(employee.id) ? '(本日已有排班)' : ''}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl fullWidth disabled={!selectedEmployee}>
                <InputLabel id="shift-select-label">班別</InputLabel>
                <Select
                    labelId="shift-select-label"
                    value={selectedShift}
                    label="班別"
                    onChange={handleShiftChange}
                    error={!!error}
                >
                    {shifts.map((shift) => (
                        <MenuItem
                            key={shift.id}
                            value={shift.id}
                            disabled={isShiftDisabled(shift)}
                        >
                            {shift.name}
                        </MenuItem>
                    ))}
                </Select>
                {error && <Alert severity="warning" sx={{ mt: 1 }}>{error}</Alert>}
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