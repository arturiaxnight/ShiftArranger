import React, { useState } from 'react';
import {
    Container,
    Typography,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Box
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import EmployeeFormDialog from '../components/EmployeeFormDialog';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';

// 定義員工資料介面 (保持與 App.tsx 一致，移除 position)
interface Employee {
    id: string;
    name: string;
    employeeId: string;
    // position: string; // 移除職位
}

// 定義 props interface
interface EmployeeManagementProps {
    employees: Employee[];
    setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
}

// 修改元件定義以接收 props
const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ employees, setEmployees }) => {
    // // 移除元件內部的 employees 狀態管理
    // const [employees, setEmployees] = useState<Employee[]>([
    //     {
    //         id: '1',
    //         name: '張三',
    //         employeeId: 'EMP001',
    //         position: '護理師'
    //     },
    //     {
    //         id: '2',
    //         name: '李四',
    //         employeeId: 'EMP002',
    //         position: '護理師'
    //     }
    // ]);

    // 對話框狀態 (保留)
    const [formDialogOpen, setFormDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>();

    // 處理新增員工
    const handleAddEmployee = () => {
        setSelectedEmployee(undefined);
        setFormDialogOpen(true);
    };

    // 處理編輯員工
    const handleEditEmployee = (employee: Employee) => {
        setSelectedEmployee(employee);
        setFormDialogOpen(true);
    };

    // 處理刪除員工
    const handleDeleteEmployee = (employee: Employee) => {
        setSelectedEmployee(employee);
        setDeleteDialogOpen(true);
    };

    // 處理表單提交 (使用從 props 傳入的 setEmployees)
    const handleFormSubmit = (employeeData: Omit<Employee, 'id'>) => {
        if (selectedEmployee) {
            // 編輯現有員工
            setEmployees(prevEmployees => // 使用函數式更新
                prevEmployees.map(emp =>
                    emp.id === selectedEmployee.id
                        ? { ...employeeData, id: selectedEmployee.id }
                        : emp
                )
            );
        } else {
            // 新增員工
            const newEmployee = {
                ...employeeData,
                id: Date.now().toString(), // 簡單的 ID 生成方式
            };
            setEmployees(prevEmployees => [...prevEmployees, newEmployee]); // 使用函數式更新
        }
        setFormDialogOpen(false);
    };

    // 處理確認刪除 (使用從 props 傳入的 setEmployees)
    const handleConfirmDelete = () => {
        if (selectedEmployee) {
            setEmployees(prevEmployees => // 使用函數式更新
                prevEmployees.filter(emp => emp.id !== selectedEmployee.id)
            );
            setDeleteDialogOpen(false);
        }
    };

    return (
        <Container>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                    員工管理
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleAddEmployee}
                >
                    新增員工
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>員工編號</TableCell>
                            <TableCell>姓名</TableCell>
                            <TableCell align="right">操作</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {employees.map((employee) => (
                            <TableRow key={employee.id}>
                                <TableCell>{employee.employeeId}</TableCell>
                                <TableCell>{employee.name}</TableCell>
                                <TableCell align="right">
                                    <IconButton
                                        color="primary"
                                        onClick={() => handleEditEmployee(employee)}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        color="error"
                                        onClick={() => handleDeleteEmployee(employee)}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <EmployeeFormDialog
                open={formDialogOpen}
                employee={selectedEmployee}
                onClose={() => setFormDialogOpen(false)}
                onSubmit={handleFormSubmit}
            />

            <DeleteConfirmDialog
                open={deleteDialogOpen}
                title="刪除員工"
                content={`確定要刪除 ${selectedEmployee?.name} (${selectedEmployee?.employeeId}) 嗎？`}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
            />
        </Container>
    );
};

export default EmployeeManagement; 