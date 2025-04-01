import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import EmployeeManagement from './pages/EmployeeManagement';
import ShiftManagement from './pages/ShiftManagement';
import Schedule from './pages/Schedule';
import { DrawerProvider } from './contexts/DrawerContext';
import './App.css';

// 定義 Employee interface (如果尚未在全局定義)
interface Employee {
  id: string;
  name: string;
  employeeId: string;
}

const App: React.FC = () => {
  // 在 App 元件中管理員工列表狀態
  const [employees, setEmployees] = useState<Employee[]>([
    // 初始測試資料，未來可以從 API 獲取
    { id: '1', name: '張小明', employeeId: 'EMP001' },
    { id: '2', name: '李小華', employeeId: 'EMP002' },
    { id: '3', name: '王小美', employeeId: 'EMP003' },
    { id: '4', name: '陳小強', employeeId: 'EMP004' },
    { id: '5', name: '林小芳', employeeId: 'EMP005' },
    { id: '6', name: '吳大偉', employeeId: 'EMP006' }, // 新增更多員工
    { id: '7', name: '趙小麗', employeeId: 'EMP007' },
  ]);

  return (
    <DrawerProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/schedule" replace />} />
            {/* 將 employees 狀態傳遞給 EmployeeManagement (如果需要) */}
            <Route path="employees" element={<EmployeeManagement employees={employees} setEmployees={setEmployees} />} />
            <Route path="shifts" element={<ShiftManagement />} />
            {/* 將 employees 狀態傳遞給 Schedule */}
            <Route path="schedule" element={<Schedule employees={employees} />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DrawerProvider>
  );
};

export default App;
