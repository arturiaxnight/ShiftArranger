import React from 'react';
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
} from '@mui/material';

// 定義班別資料介面
interface Shift {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    type: 'regular' | 'standby' | 'off'; // regular: 一般班別, standby: 待命班別, off: 休假
    description?: string;
}

const ShiftManagement: React.FC = () => {
    // 預設的班別資料
    const shifts: Shift[] = [
        {
            id: '1',
            name: '白班',
            startTime: '07:30',
            endTime: '15:30',
            type: 'regular'
        },
        {
            id: '2',
            name: '配器械班',
            startTime: '07:30',
            endTime: '17:30',
            type: 'regular',
            description: '配器械專責班別'
        },
        {
            id: '3',
            name: '小夜班',
            startTime: '15:00',
            endTime: '23:00',
            type: 'regular'
        },
        {
            id: '4',
            name: '大夜班',
            startTime: '23:00',
            endTime: '08:00',
            type: 'regular'
        },
        {
            id: '5',
            name: '12-8班',
            startTime: '12:00',
            endTime: '20:00',
            type: 'regular'
        },
        {
            id: '6',
            name: '9-5班',
            startTime: '09:00',
            endTime: '17:00',
            type: 'regular'
        },
        {
            id: '7',
            name: '白班待命',
            startTime: '07:00',
            endTime: '15:00',
            type: 'standby',
            description: '待命時間不計入工作時數'
        },
        {
            id: '8',
            name: '小夜待命',
            startTime: '15:00',
            endTime: '23:00',
            type: 'standby',
            description: '待命時間不計入工作時數'
        },
        {
            id: '9',
            name: '大夜待命',
            startTime: '23:00',
            endTime: '07:00',
            type: 'standby',
            description: '待命時間不計入工作時數'
        },
        {
            id: '10',
            name: 'Off日待',
            startTime: '07:00',
            endTime: '19:00',
            type: 'standby',
            description: '待命時間不計入工作時數'
        },
        {
            id: '11',
            name: 'Off夜待',
            startTime: '19:00',
            endTime: '07:00',
            type: 'standby',
            description: '待命時間不計入工作時數'
        },
        {
            id: '12',
            name: '休假',
            startTime: '-',
            endTime: '-',
            type: 'off'
        },
        {
            id: '13',
            name: '例假',
            startTime: '-',
            endTime: '-',
            type: 'off'
        }
    ];

    return (
        <Container>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" component="h1">
                    班別管理
                </Typography>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>班別名稱</TableCell>
                            <TableCell>開始時間</TableCell>
                            <TableCell>結束時間</TableCell>
                            <TableCell>類型</TableCell>
                            <TableCell>備註</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {shifts.map((shift) => (
                            <TableRow key={shift.id}>
                                <TableCell>{shift.name}</TableCell>
                                <TableCell>{shift.startTime}</TableCell>
                                <TableCell>{shift.endTime}</TableCell>
                                <TableCell>
                                    {shift.type === 'regular' && '一般班別'}
                                    {shift.type === 'standby' && '待命班別'}
                                    {shift.type === 'off' && '休假'}
                                </TableCell>
                                <TableCell>{shift.description || '-'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
};

export default ShiftManagement; 