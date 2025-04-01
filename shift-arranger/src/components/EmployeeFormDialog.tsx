import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent
} from '@mui/material';

interface Employee {
    id: string;
    name: string;
    employeeId: string;
    specialty: 'OPH' | 'CVS' | 'OPH+CVS' | '非專OPH' | '非專CVS' | '新人';
}

interface EmployeeFormDialogProps {
    open: boolean;
    employee?: Employee;
    onClose: () => void;
    onSubmit: (employee: Omit<Employee, 'id'>) => void;
}

const specialtyOptions: Employee['specialty'][] = [
    'OPH',
    'CVS',
    'OPH+CVS',
    '非專OPH',
    '非專CVS',
    '新人'
];

const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
    open,
    employee,
    onClose,
    onSubmit,
}) => {
    const [formData, setFormData] = React.useState<Omit<Employee, 'id'>>({
        name: '',
        employeeId: '',
        specialty: '新人',
    });

    React.useEffect(() => {
        if (employee) {
            setFormData({
                name: employee.name,
                employeeId: employee.employeeId,
                specialty: employee.specialty,
            });
        } else {
            setFormData({
                name: '',
                employeeId: '',
                specialty: '新人',
            });
        }
    }, [employee, open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSpecialtyChange = (event: SelectChangeEvent) => {
        const value = event.target.value as Employee['specialty'];
        setFormData((prev) => ({
            ...prev,
            specialty: value,
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
                    <FormControl fullWidth margin="dense" required>
                        <InputLabel id="specialty-select-label">專科</InputLabel>
                        <Select
                            labelId="specialty-select-label"
                            name="specialty"
                            value={formData.specialty}
                            label="專科"
                            onChange={handleSpecialtyChange}
                        >
                            {specialtyOptions.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
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