import React, { useState, useEffect } from 'react';
import {
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
    List,
    ListItem,
    ListItemText,
    ListItemButton,
    Checkbox,
    Alert,
    ListItemIcon,
    Snackbar,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from '@mui/material';
import {
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Add as AddIcon,
    ErrorOutline as ErrorOutlineIcon,
    CheckCircleOutline as CheckCircleOutlineIcon,
    Cancel as CancelIcon
} from '@mui/icons-material';
import ShiftAssignmentForm from '../components/ShiftAssignmentForm';
import { useDrawer } from '../contexts/DrawerContext';
import { getDaysInMonth as getDaysInMonthFromDateFns, parse, differenceInHours, addDays, format, subDays, isBefore, startOfDay } from 'date-fns';

interface CalendarDay {
    day: number;
    isCurrentMonth: boolean;
    isToday?: boolean;
}

interface Employee {
    id: string;
    name: string;
    employeeId: string;
    specialty: 'OPH' | 'CVS' | 'OPH+CVS' | '非專OPH' | '非專CVS' | '新人';
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

// Helper function to check potential swap conflicts
const checkSwapConflict = (source: ShiftAssignment, target: ShiftAssignment, assignments: ShiftAssignment[], employees: Employee[]): string | null => {
    // Check if target employee already has a shift on the source date
    const targetConflict = assignments.find(a =>
        a.employeeId === target.employeeId &&
        a.date === source.date &&
        a.employeeId !== source.employeeId // Exclude the source itself
    );
    if (targetConflict) {
        return `換班失敗：${employees.find(e => e.id === target.employeeId)?.name} 在 ${source.date} 已有班 (${targetConflict.shiftName})。`;
    }

    // Check if source employee already has a shift on the target date
    const sourceConflict = assignments.find(a =>
        a.employeeId === source.employeeId &&
        a.date === target.date &&
        a.employeeId !== target.employeeId // Exclude the target itself
    );
    if (sourceConflict) {
        return `換班失敗：${employees.find(e => e.id === source.employeeId)?.name} 在 ${target.date} 已有班 (${sourceConflict.shiftName})。`;
    }

    return null; // No conflict
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

// --- Refactored generateTestSchedule (Improved Rule Adherence) ---
const generateTestSchedule = (year: number, month: number, employees: Employee[]): ShiftAssignment[] => {
    console.log(`[generateTestSchedule] Generating for ${year}-${month + 1} with ${employees.length} employees.`);

    const assignments: ShiftAssignment[] = [];
    const daysInMonth = getDaysInMonthFromDateFns(new Date(year, month));
    const allShiftNames = Array.from(shiftDetailsMap.keys());
    const workShiftNames = allShiftNames.filter(name => shiftDetailsMap.get(name)?.isWorkShift);
    const offShiftNames = ['休假', '例假'];
    const standbyShiftNames = allShiftNames.filter(name => {
        const details = shiftDetailsMap.get(name);
        return details && !details.isWorkShift && !details.isOffShift;
    });

    // --- Helper functions (checkIntervalRule, check7DayRestRule) remain inside --- 
    const checkIntervalRule = (prevAssignmentDateStr: string | null, currentShiftName: string, currentDateStr: string, employeeId: string): boolean => {
        if (!prevAssignmentDateStr) return true;
        // Find previous assignment from the MAIN assignments array
        const prevAssignment = assignments.find(a => a.employeeId === employeeId && a.date === prevAssignmentDateStr);
        if (!prevAssignment) return true;

        const prevShiftDetails = shiftDetailsMap.get(prevAssignment.shiftName);
        const currentShiftDetails = shiftDetailsMap.get(currentShiftName);
        if (!prevShiftDetails?.isWorkShift || !currentShiftDetails?.isWorkShift) return true;
        const prevEndTimeStr = prevShiftDetails.endTime;
        const currentStartTimeStr = currentShiftDetails.startTime;
        if (!prevEndTimeStr || !currentStartTimeStr) return false;
        let prevEndDateTime = getShiftDateTime(prevAssignment.date, prevEndTimeStr);
        let currentStartDateTime = getShiftDateTime(currentDateStr, currentStartTimeStr);
        if (!prevEndDateTime || !currentStartDateTime) return false;
        if (doesShiftSpanMidnight(prevAssignment.shiftName)) {
            prevEndDateTime = addDays(prevEndDateTime, 1);
        }
        const intervalHours = differenceInHours(currentStartDateTime, prevEndDateTime);
        return intervalHours >= 12;
    };

    const check7DayRestRule = (employeeId: string, currentDateStr: string): { needsRest: boolean, needsMandatory: boolean } => {
        const currentCheckDate = parse(currentDateStr, 'yyyy-MM-dd', new Date());
        const startDate = subDays(currentCheckDate, 6);
        let hasRestDay = false;
        let hasMandatoryOff = false;
        // Access the MAIN assignments array
        const employeeAssignments = assignments.filter(a => a.employeeId === employeeId);
        for (let i = 0; i <= 6; i++) {
            const checkDate = subDays(currentCheckDate, i);
            const checkDateStr = format(checkDate, 'yyyy-MM-dd');
            const assignmentOnDate = employeeAssignments.find(a => a.date === checkDateStr);
            if (assignmentOnDate) {
                const details = shiftDetailsMap.get(assignmentOnDate.shiftName);
                if (details?.isRestDay) hasRestDay = true;
                if (details?.isMandatoryOff) hasMandatoryOff = true;
            }
        }
        return { needsRest: !hasRestDay, needsMandatory: !hasMandatoryOff };
    };
    // --- End Helper Functions ---

    const employeeTrackers: { [empId: string]: { consecutiveWorkDays: number, targetShiftCount: number, currentWorkDays: number, prevAssignmentDate: string | null } } = {};
    employees.forEach(emp => {
        employeeTrackers[emp.id] = { consecutiveWorkDays: 0, targetShiftCount: 0, currentWorkDays: 0, prevAssignmentDate: null };
    });

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        let dailyOffCount = 0; // Tracks non-mandatory off days assigned today
        const maxDailyOff = Math.ceil(employees.length / 3);
        const shuffledEmployees = [...employees].sort(() => Math.random() - 0.5);

        // --- Pass 1: Assign mandatory rests first --- 
        const mandatoryAssignmentsToday: { [empId: string]: string } = {};
        shuffledEmployees.forEach(employee => {
            const empId = employee.id;
            const tracker = employeeTrackers[empId];
            const { needsRest, needsMandatory } = check7DayRestRule(empId, dateStr);

            if (day >= 7 && needsMandatory) {
                mandatoryAssignmentsToday[empId] = '例假';
                console.log(`[Rule Pre-Assign] ${employee.name} assigned mandatory rest '例假' on ${dateStr}`);
            } else if ((day >= 7 && needsRest) || tracker.consecutiveWorkDays >= 6) {
                // If 例假 wasn't already assigned as mandatory, assign 休假
                if (!mandatoryAssignmentsToday[empId]) {
                    mandatoryAssignmentsToday[empId] = '休假';
                    console.log(`[Rule Pre-Assign] ${employee.name} assigned rest '休假' (needsRest=${needsRest}, consecutive=${tracker.consecutiveWorkDays}) on ${dateStr}`);
                }
            }
        });

        // --- Pass 2: Assign remaining shifts --- 
        shuffledEmployees.forEach(employee => {
            const empId = employee.id;
            let tracker = employeeTrackers[empId];
            const prevAssignmentDateStr = tracker.prevAssignmentDate;
            let chosenShift: string | null = mandatoryAssignmentsToday[empId] ?? null; // Get pre-assigned mandatory shift if any
            let isMandatoryChoice = !!chosenShift;

            // If no mandatory shift was assigned, determine the shift
            if (!chosenShift) {
                let targetShift: string | null = null;
                const originalIndex = employees.findIndex(e => e.id === empId);
                if (originalIndex === 0 && employees.length > 0) { targetShift = '大夜班'; }
                else if (originalIndex === 1 && employees.length > 1) { targetShift = '小夜班'; }

                const isTargetShiftValid = targetShift && checkIntervalRule(prevAssignmentDateStr, targetShift, dateStr, empId);

                if (isTargetShiftValid && tracker.targetShiftCount < 16) {
                    chosenShift = targetShift!;
                    // console.log(`[Target] ${employee.name} assigned target ${chosenShift} on ${dateStr}`);
                } else {
                    // Weighted Random Selection
                    const validWorkShifts = workShiftNames.filter(shiftName => checkIntervalRule(prevAssignmentDateStr, shiftName, dateStr, empId));
                    let possibleShifts: string[] = [];
                    const allowOff = dailyOffCount < maxDailyOff; // Check if non-mandatory off is allowed

                    if (tracker.currentWorkDays < 11) {
                        if (validWorkShifts.length > 0) possibleShifts.push(...validWorkShifts, ...validWorkShifts);
                        possibleShifts.push(...standbyShiftNames);
                        if (allowOff) possibleShifts.push('休假'); // Only add 休假 if limit allows (例假 handled above)
                    } else {
                        if (validWorkShifts.length > 0) possibleShifts.push(...validWorkShifts);
                        possibleShifts.push(...standbyShiftNames, ...standbyShiftNames);
                        if (allowOff) possibleShifts.push('休假', '休假', '休假'); // Add 休假 if limit allows
                    }

                    if (possibleShifts.length === 0) {
                        // Fallback pool if primary pool is empty (e.g., limit reached, no valid work)
                        possibleShifts = [
                            ...validWorkShifts,
                            ...standbyShiftNames,
                            // Include 休假 as fallback ONLY if limit allows?
                            ...(allowOff ? ['休假'] : [])
                        ];
                    }
                    // Critical fallback: if still no options, assign 休假 regardless of limit (better than nothing?)
                    if (possibleShifts.length === 0) {
                        console.error(`[Critical] No possible shifts found for ${employee.name} on ${dateStr}. Assigning 休假.`);
                        chosenShift = '休假';
                    } else {
                        chosenShift = possibleShifts[Math.floor(Math.random() * possibleShifts.length)];
                        // console.log(`[Random] ${employee.name} assigned random ${chosenShift} on ${dateStr}`);
                    }
                }
            }

            // --- Post-Assignment Checks and Finalization --- 
            const chosenShiftDetails = shiftDetailsMap.get(chosenShift!);
            const isChosenOff = chosenShiftDetails?.isOffShift ?? false;
            const isChosenMandatoryOff = chosenShiftDetails?.isMandatoryOff ?? false;

            // Check and increment daily off count ONLY for NON-mandatory off days
            if (isChosenOff && !isChosenMandatoryOff) {
                if (dailyOffCount >= maxDailyOff) {
                    // Limit reached for a NON-MANDATORY off day. Try to find an alternative.
                    console.log(`[Off Limit] Daily off limit (${maxDailyOff}) reached for ${dateStr}. ${employee.name} initially chose ${chosenShift}. Finding alternative...`);
                    const nonOffOptions = [
                        ...workShiftNames.filter(s => checkIntervalRule(prevAssignmentDateStr, s, dateStr, empId)),
                        ...standbyShiftNames
                    ];
                    if (nonOffOptions.length > 0) {
                        chosenShift = nonOffOptions[Math.floor(Math.random() * nonOffOptions.length)];
                        console.log(`[Off Limit Override] ${employee.name} assigned ${chosenShift} instead.`);
                        // isChosenOff would now be false, no need to increment count
                    } else {
                        console.warn(`[Off Limit Stick] Could not find alternative shift for ${employee.name} on ${dateStr}. Sticking with ${chosenShift}.`);
                        // Stick with the off day, INCREMENT count even if over limit
                        dailyOffCount++;
                    }
                } else {
                    // Limit not reached, assign the non-mandatory off day and increment count
                    dailyOffCount++;
                }
            }
            // Note: Mandatory '例假' assignments do not affect/check the dailyOffCount limit here.

            // --- Final Assignment and Tracker Update --- 
            assignments.push({ employeeId: empId, date: dateStr, shiftName: chosenShift! });
            tracker.prevAssignmentDate = dateStr;

            const originalIndex = employees.findIndex(e => e.id === empId);
            if ((originalIndex === 0 && chosenShift === '大夜班') || (originalIndex === 1 && chosenShift === '小夜班')) {
                tracker.targetShiftCount++;
            }

            // Update consecutive days based on the FINAL chosen shift
            const finalChosenShiftDetails = shiftDetailsMap.get(chosenShift!);
            if (finalChosenShiftDetails?.isWorkShift) {
                tracker.consecutiveWorkDays++;
                tracker.currentWorkDays++;
            } else {
                tracker.consecutiveWorkDays = 0;
            }
            employeeTrackers[empId] = tracker;
        });
    }

    console.log(`[generateTestSchedule] Finished generation. Total assignments: ${assignments.length}`);
    // Final validation check (optional, for debugging)
    const finalErrors = validateScheduleRules(assignments, employees, year, month);
    if (finalErrors.length > 0) {
        console.warn("[generateTestSchedule] Generated schedule has validation errors:", finalErrors);
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

// 將統計函數移到元件外部
const calculateShiftStatistics = (assignments: ShiftAssignment[], employees: Employee[]) => {
    const statistics: { [key: string]: { [key: string]: number } } = {};

    // 初始化統計物件
    employees.forEach(emp => {
        statistics[emp.id] = { // Use emp.id consistently
            '總上班天數': 0, // ADDED: Initialize total work days
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
        // 確保用 employee.id 來查找
        const employee = employees.find(e => e.id === assignment.employeeId);
        if (employee && statistics[employee.id]) {
            const shiftDetails = shiftDetailsMap.get(assignment.shiftName);
            if (shiftDetails && statistics[employee.id][assignment.shiftName] !== undefined) {
                statistics[employee.id][assignment.shiftName]++;
                // Increment total work days if it's a work shift
                if (shiftDetails.isWorkShift) {
                    statistics[employee.id]['總上班天數']++;
                }
            } else {
                // Optionally log or handle unexpected shift names
                console.warn(`Unknown shift name found during statistics: ${assignment.shiftName}`);
            }
        }
    });

    return statistics;
};

// --- Helper Function to Check Swap Validity ---
const checkSwapValidity = (
    sourceInfo: { employeeId: string, date: string, originalShiftName: string },
    newSourceShift: string,
    targetAssignment: ShiftAssignment,
    allAssignments: ShiftAssignment[],
    employees: Employee[],
    year: number,
    month: number
): boolean => {
    const sourceEmpId = sourceInfo.employeeId;
    const sourceDate = sourceInfo.date;
    const originalSourceShift = sourceInfo.originalShiftName;
    const targetEmpId = targetAssignment.employeeId;
    const targetDate = targetAssignment.date;
    const originalTargetShift = targetAssignment.shiftName;

    // Rule 1: Cannot swap with self (already handled by disabling source employee's other shifts)
    if (sourceEmpId === targetEmpId) return false;

    // Rule 2: Simulate the swap
    const simulatedAssignments = allAssignments.map(a => {
        // Source employee gets the NEW selected shift on source date
        if (a.employeeId === sourceEmpId && a.date === sourceDate) {
            return { ...a, shiftName: newSourceShift };
        }
        // Target employee gets the ORIGINAL source shift on target date
        if (a.employeeId === targetEmpId && a.date === targetDate) {
            return { ...a, shiftName: originalSourceShift };
        }
        return a;
    });

    // Rule 3: Validate rules for the two involved employees
    const sourceEmployee = employees.find(e => e.id === sourceEmpId);
    const targetEmployee = employees.find(e => e.id === targetEmpId);
    if (!sourceEmployee || !targetEmployee) return false;

    const validationResults = validateScheduleRules(simulatedAssignments, [sourceEmployee, targetEmployee], year, month);

    return validationResults.length === 0; // Return true if NO errors
};

// Interface for the source part of the swap state, including original shift name
interface SwapSourceInfo extends ShiftAssignment {
    originalShiftName: string;
}

const Schedule: React.FC<ScheduleProps> = ({ employees: initialEmployeesFromProps }) => {
    const { drawerOpen, setDrawerOpen } = useDrawer();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedAssignment, setSelectedAssignment] = useState<ShiftAssignment | null>(null);
    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
    const [swapState, setSwapState] = useState<{ source: SwapSourceInfo | null, target: ShiftAssignment | null, stage: 'selectingTarget' | 'confirmingSwap' | 'selectingNewShift' | 'idle' }>({ source: null, target: null, stage: 'idle' });
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [employees, setEmployeesInternal] = useState<Employee[]>(initialEmployeesFromProps);
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>(initialEmployeesFromProps.map(e => e.id));
    const [swapHistory, setSwapHistory] = useState<string[]>([]);
    const [newShiftForSource, setNewShiftForSource] = useState<string>('');

    useEffect(() => {
        setEmployeesInternal(initialEmployeesFromProps);
        // Update selected employees only if initial props change significantly (e.g., different set of employees)
        // This simple check might need refinement based on how initialEmployeesFromProps changes.
        if (JSON.stringify(initialEmployeesFromProps.map(e => e.id).sort()) !== JSON.stringify(selectedEmployees.sort())) {
            setSelectedEmployees(initialEmployeesFromProps.map(e => e.id));
        }
        // Add initialEmployeesFromProps to dependency array if it's expected to change and trigger updates.
        // Using JSON.stringify is a common way to handle object/array dependencies but can have performance implications.
        // Consider more specific dependencies if possible.
    }, [initialEmployeesFromProps]); // Dependency array fixed

    useEffect(() => {
        setAssignments([]);
    }, [currentDate.getFullYear(), currentDate.getMonth()]);

    const handleDateClick = (year: number, month: number, day: number, isCurrentMonth: boolean) => {
        let targetYear = year;
        let targetMonth = month;

        if (!isCurrentMonth) {
            if (day > 20) {
                targetMonth = month - 1;
                if (targetMonth < 0) {
                    targetMonth = 11;
                    targetYear = year - 1;
                }
            }
            else {
                targetMonth = month + 1;
                if (targetMonth > 11) {
                    targetMonth = 0;
                    targetYear = year + 1;
                }
            }
        }

        const dateString = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateString);
    };

    const calendarData = generateCalendarData(currentDate.getFullYear(), currentDate.getMonth());

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

    const monthNames = [
        '一月', '二月', '三月', '四月', '五月', '六月',
        '七月', '八月', '九月', '十月', '十一月', '十二月'
    ];

    const weekDayNames = ['日', '一', '二', '三', '四', '五', '六'];

    const handleAssign = (employeeId: string, shiftName: string) => {
        if (selectedDate) {
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
        }
    };

    const handleDeleteClick = (assignment: ShiftAssignment) => {
        setSelectedAssignment(assignment);
        setDeleteConfirmationOpen(true);
    };

    const handleConfirmDelete = () => {
        if (selectedAssignment) {
            setAssignments(assignments.filter(a =>
                !(a.employeeId === selectedAssignment.employeeId &&
                    a.date === selectedAssignment.date)
            ));
        }
        setDeleteConfirmationOpen(false);
        setSelectedAssignment(null);
    };

    const handleCancelDelete = () => {
        setDeleteConfirmationOpen(false);
        setSelectedAssignment(null);
    };

    const handleShiftClick = (assignment: ShiftAssignment) => {
        if (swapState.stage === 'idle') {
            // Start Step 1: Initiate target selection, store original shift name
            setSwapState({
                source: { ...assignment, originalShiftName: assignment.shiftName },
                target: null,
                stage: 'selectingTarget'
            });
            setNewShiftForSource(assignment.shiftName);
        } else if (swapState.stage === 'selectingTarget' && swapState.source) {
            // Handle Step 2: Selecting the target
            const targetAssignment = assignment;
            const sourceEmpId = swapState.source.employeeId;

            // Ignore clicks on the source employee's shifts or the source assignment itself
            if (targetAssignment.employeeId === sourceEmpId) return;

            // Check if the clicked target is valid
            const isValid = checkSwapValidity(
                swapState.source,
                newShiftForSource,
                targetAssignment,
                assignments,
                employees,
                currentDate.getFullYear(),
                currentDate.getMonth()
            );

            if (isValid) {
                console.log("Valid target selected:", targetAssignment);
                setSwapState({ ...swapState, target: targetAssignment, stage: 'confirmingSwap' });
                setSnackbarMessage(`已選擇目標: ${employees.find(e => e.id === targetAssignment.employeeId)?.name} (${targetAssignment.date} ${targetAssignment.shiftName}). 請確認或取消交換。`);
                setSnackbarSeverity('info');
                setSnackbarOpen(true);
            } else {
                console.log("Invalid target selected:", targetAssignment);
                setSnackbarMessage("選擇的目標班別交換後會違反規則");
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
            }
        }
    };

    const handleValidateSchedule = () => {
        console.log("Validating schedule...");
        const errors = validateScheduleRules(assignments, employees, currentDate.getFullYear(), currentDate.getMonth());
        setValidationErrors(errors);
        if (errors.length > 0) {
            setSnackbarMessage("排班規則檢查發現問題，請檢查以下錯誤：");
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
        } else {
            setSnackbarMessage("排班規則檢查完畢，未發現問題！");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        }
        console.log("Validation errors:", errors);
    };

    const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    const handleGenerateTestSchedule = () => {
        const newAssignments = generateTestSchedule(currentDate.getFullYear(), currentDate.getMonth(), employees);
        console.log("Generated Test Assignments:", newAssignments);
        setAssignments(newAssignments);
    };

    const handleEmployeeToggle = (employeeId: string) => {
        setSelectedEmployees(prev => {
            if (prev.includes(employeeId)) {
                return prev.filter(id => id !== employeeId);
            } else {
                return [...prev, employeeId];
            }
        });
    };

    const handleSelectAllEmployees = () => {
        if (selectedEmployees.length === employees.length) {
            setSelectedEmployees([]);
        } else {
            setSelectedEmployees(employees.map(emp => emp.id));
        }
    };

    const formatShortDate = (dateStr: string): string => {
        try {
            return format(parse(dateStr, 'yyyy-MM-dd', new Date()), 'MM/dd');
        } catch {
            return dateStr;
        }
    };

    const allShiftNames = Array.from(shiftDetailsMap.keys());

    // --- Calculate Highlighting/Disabled State (UPDATED with Alignment) ---
    const getShiftBoxStyle = (assignment: ShiftAssignment): React.CSSProperties => {
        const colorPalette = getShiftColor(assignment.shiftName);
        const baseStyle: React.CSSProperties = {
            padding: '2px 4px', // Adjusted base padding slightly
            borderRadius: '4px',
            border: '1px solid transparent',
            fontSize: '0.8rem',
            position: 'relative', // Ensure parent is relative for absolute child (delete button)
            cursor: 'default',
            backgroundColor: colorPalette.main,
            color: '#fff',
            textAlign: 'center', // Conditional alignment
            minWidth: '70px',
            margin: '1px 0',
            opacity: 1,
            transition: 'opacity 0.3s ease, background-color 0.3s ease, border 0.3s ease',
            // Add paddingRight in edit mode to avoid overlap with delete btn
            paddingRight: '4px',
        };

        let dynamicStyle: React.CSSProperties = {};

        if (swapState.stage === 'selectingTarget' && swapState.source && swapState.target) {
            const isSourceAssignment = assignment.employeeId === swapState.source.employeeId && assignment.date === swapState.source.date;
            const isSourceEmployee = assignment.employeeId === swapState.source.employeeId;
            if (isSourceAssignment) {
                dynamicStyle = { border: '2px solid #ffcc00', cursor: 'not-allowed' };
            } else if (isSourceEmployee) {
                dynamicStyle = { opacity: 0.4, cursor: 'not-allowed' };
            } else {
                const isValidTarget = checkSwapValidity(
                    swapState.source,
                    newShiftForSource,
                    assignment,
                    assignments,
                    employees,
                    currentDate.getFullYear(),
                    currentDate.getMonth()
                );
                if (!isValidTarget) {
                    dynamicStyle = { opacity: 0.4, cursor: 'not-allowed' };
                } else {
                    dynamicStyle = { cursor: 'crosshair' };
                }
            }
        }

        // Add hover effect (only if clickable)
        const hoverStyle = (dynamicStyle.cursor !== 'not-allowed' && baseStyle.cursor !== 'default') ? { // Check base cursor too
            '&:hover': {
                backgroundColor: colorPalette.light,
                filter: 'brightness(1.1)'
            }
        } : {};

        return { ...baseStyle, ...dynamicStyle, ...hoverStyle };
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
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

            <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', p: 1 }}>
                <Paper sx={{
                    width: drawerOpen ? 240 : 0,
                    flexShrink: 0,
                    mr: drawerOpen ? 1 : 0,
                    overflowY: 'auto',
                    transition: 'width 0.3s ease',
                    p: drawerOpen ? 1 : 0,
                    opacity: drawerOpen ? 1 : 0,
                    borderRight: '1px solid #eee'
                }}>
                    {drawerOpen && (
                        <Box>
                            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                                員工列表
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Button onClick={handleSelectAllEmployees} size="small">
                                    {selectedEmployees.length === employees.length ? '取消全選' : '全選'}
                                </Button>
                            </Box>
                            <List dense>
                                {employees.map(employee => (
                                    <ListItem key={employee.id} disablePadding>
                                        <ListItemButton onClick={() => handleEmployeeToggle(employee.id)} dense>
                                            <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>
                                                <Checkbox
                                                    edge="start"
                                                    checked={selectedEmployees.includes(employee.id)}
                                                    tabIndex={-1}
                                                    disableRipple
                                                    size="small"
                                                />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={employee.name}
                                                secondary={employee.specialty}
                                                primaryTypographyProps={{ sx: { fontWeight: 500 } }}
                                                secondaryTypographyProps={{ sx: { fontSize: '0.75rem', opacity: 0.8 } }}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}
                </Paper>

                <Paper sx={{ flexGrow: 1, overflow: 'auto' }}>
                    <TableContainer component={Paper} sx={{ mt: 2, position: 'relative', zIndex: 1 }}>
                        <Table stickyHeader aria-label="sticky schedule table">
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
                                                    key={`${weekIndex}-${dayIndex}`}
                                                    align="left"
                                                    valign="top"
                                                    sx={{
                                                        border: '1px solid #eee',
                                                        height: 150,
                                                        overflow: 'hidden',
                                                        bgcolor: day.isCurrentMonth ? 'background.paper' : '#f5f5f5',
                                                        position: 'relative',
                                                        p: 0.5
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{ fontWeight: day.isCurrentMonth ? 'bold' : 'normal', color: day.isCurrentMonth ? 'text.primary' : 'text.secondary' }}
                                                        >
                                                            {day.day}
                                                        </Typography>
                                                        {day.isCurrentMonth && (
                                                            <IconButton
                                                                size="small"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDateClick(currentDate.getFullYear(), currentDate.getMonth(), day.day, day.isCurrentMonth);
                                                                }}
                                                                aria-label={`add shift for day ${day.day}`}
                                                                sx={{ padding: 0.2 }}
                                                            >
                                                                <AddIcon fontSize="inherit" />
                                                            </IconButton>
                                                        )}
                                                    </Box>

                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                        {displays.map((shift, index) => {
                                                            const assignmentData = { employeeId: shift.employeeId, date: dateStr, shiftName: shift.shiftName };
                                                            return (
                                                                <Box
                                                                    key={`${shift.employeeId}-${index}`}
                                                                    onClick={() => handleShiftClick(assignmentData)}
                                                                    className="shift-box"
                                                                    sx={getShiftBoxStyle(assignmentData)}
                                                                >
                                                                    <Typography
                                                                        variant="caption"
                                                                        sx={{
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap',
                                                                            lineHeight: 1.2,
                                                                            display: 'block',
                                                                        }}
                                                                    >
                                                                        {`${shift.employeeName} - ${shift.shiftName}`}
                                                                    </Typography>
                                                                </Box>
                                                            );
                                                        })}
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

            <Dialog
                open={selectedDate !== null}
                onClose={() => setSelectedDate(null)}
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
                    <Button onClick={() => setSelectedDate(null)} color="inherit">
                        取消
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={deleteConfirmationOpen}
                onClose={handleCancelDelete}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>確認刪除</DialogTitle>
                <DialogContent>
                    {selectedAssignment && (
                        <Typography>
                            確定要刪除 {selectedAssignment.date}
                            {employees.find(e => e.id === selectedAssignment.employeeId)?.name} 的
                            {selectedAssignment.shiftName} 班別嗎？
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

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Schedule; 