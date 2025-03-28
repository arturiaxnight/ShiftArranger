import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
} from '@mui/material';

interface Employee {
    id: string;
    name: string;
    employeeId: string;
    position: string;
}

interface EmployeeFormDialogProps {
    open: boolean;
    employee?: Employee;
    onClose: () => void;
    onSubmit: (employee: Omit<Employee, 'id'>) => void;
}

const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
    open,
    employee,
    onClose,
    onSubmit,
}) => {
    const [formData, setFormData] = React.useState<Omit<Employee, 'id'>>({
        name: employee?.name || '',
        employeeId: employee?.employeeId || '',
        position: '護理師', // 預設職位
    });

    React.useEffect(() => {
        if (employee) {
            setFormData({
                name: employee.name,
                employeeId: employee.employeeId,
                position: '護理師',
            });
        } else {
            setFormData({
                name: '',
                employeeId: '',
                position: '護理師',
            });
        }
    }, [employee]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>{employee ? '編輯員工' : '新增員工'}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        name="employeeId"
                        label="員工編號"
                        type="text"
                        fullWidth
                        value={formData.employeeId}
                        onChange={handleChange}
                        required
                    />
                    <TextField
                        margin="dense"
                        name="name"
                        label="姓名"
                        type="text"
                        fullWidth
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>取消</Button>
                    <Button type="submit" variant="contained" color="primary">
                        {employee ? '更新' : '新增'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default EmployeeFormDialog; 