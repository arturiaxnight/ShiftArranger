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
    specialty: 'OPH' | 'CVS' | 'OPH+CVS' | '非專OPH' | '非專CVS' | '新人';
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
    const [shiftIntervalError, setShiftIntervalError] = useState<string | null>(null);

    const isEmployeeAssigned = (employeeId: string) => {
        return existingAssignments.some(a => a.employeeId === employeeId && a.date === date);
    };

    const getShiftIntervalValidation = (shiftId: string): { isValid: boolean; message: string | null } => {
        if (!selectedEmployee) return { isValid: true, message: null };
        const shift = shifts.find(s => s.id === shiftId);
        if (!shift) return { isValid: true, message: null };
        return checkTimeInterval(date, selectedEmployee, shift, existingAssignments, shiftDetailsMap);
    };

    const handleEmployeeChange = (event: SelectChangeEvent) => {
        const newEmployeeId = event.target.value as string;
        setSelectedEmployee(newEmployeeId);
        setSelectedShift('');
        setShiftIntervalError(null);
        setError(null);
    };

    const handleShiftChange = (event: SelectChangeEvent) => {
        const newShiftId = event.target.value as string;
        setSelectedShift(newShiftId);
        setShiftIntervalError(null);
        setError(null);

        if (selectedEmployee && newShiftId) {
            const shift = shifts.find(s => s.id === newShiftId);
            if (shift) {
                const intervalCheck = checkTimeInterval(date, selectedEmployee, shift, existingAssignments, shiftDetailsMap);
                if (!intervalCheck.isValid) {
                    setShiftIntervalError(intervalCheck.message);
                } else {
                    setShiftIntervalError(null);
                }
            }
        }
    };

    const handleConfirm = () => {
        if (!selectedEmployee || !selectedShift) {
            setError('請選擇員工和班別');
            return;
        }
        if (shiftIntervalError) {
            setError('無法指派，違反班別間隔規則');
            return;
        }

        const shift = shifts.find(s => s.id === selectedShift);
        if (!shift) return;

        onAssign(selectedEmployee, shift.name);
        setError(null);
        setShiftIntervalError(null);
    };

    const availableEmployees = employees.filter(emp => !isEmployeeAssigned(emp.id));

    return (
        <Box sx={{ p: 2, minWidth: 350 }}>
            <Typography variant="h6" gutterBottom>
                選擇員工和班別
            </Typography>

            {shiftIntervalError && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {shiftIntervalError}
                </Alert>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <FormControl fullWidth margin="normal">
                <InputLabel id="employee-select-label">員工</InputLabel>
                <Select
                    labelId="employee-select-label"
                    value={selectedEmployee}
                    label="員工"
                    onChange={handleEmployeeChange}
                    disabled={availableEmployees.length === 0}
                >
                    {availableEmployees.length > 0 ? (
                        availableEmployees.map(emp => (
                            <MenuItem key={emp.id} value={emp.id}>
                                {emp.name}
                            </MenuItem>
                        ))
                    ) : (
                        <MenuItem disabled>本日無可用員工</MenuItem>
                    )}
                </Select>
            </FormControl>

            <FormControl fullWidth margin="normal" error={!!shiftIntervalError}>
                <InputLabel id="shift-select-label">班別</InputLabel>
                <Select
                    labelId="shift-select-label"
                    value={selectedShift}
                    label="班別"
                    onChange={handleShiftChange}
                    disabled={!selectedEmployee}
                >
                    {shifts.map(shift => {
                        const intervalValidation = getShiftIntervalValidation(shift.id);
                        const isDisabledByInterval = !intervalValidation.isValid;

                        return (
                            <MenuItem
                                key={shift.id}
                                value={shift.id}
                                disabled={isDisabledByInterval}
                            >
                                {shift.name}
                                {isDisabledByInterval && <Typography variant="caption" color="error" sx={{ ml: 1 }}>({intervalValidation.message})</Typography>}
                            </MenuItem>
                        );
                    })}
                </Select>
            </FormControl>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button
                    variant="contained"
                    onClick={handleConfirm}
                    disabled={!selectedEmployee || !selectedShift || !!shiftIntervalError}
                >
                    確認排班
                </Button>
            </Box>
        </Box>
    );
};

export default ShiftAssignmentForm; 