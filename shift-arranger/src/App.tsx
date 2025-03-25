import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import EmployeeManagement from './pages/EmployeeManagement';
import ShiftManagement from './pages/ShiftManagement';
import Schedule from './pages/Schedule';
import { DrawerProvider } from './contexts/DrawerContext';
import './App.css';

const App: React.FC = () => {
  return (
    <DrawerProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/schedule" replace />} />
            <Route path="employees" element={<EmployeeManagement />} />
            <Route path="shifts" element={<ShiftManagement />} />
            <Route path="schedule" element={<Schedule />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DrawerProvider>
  );
};

export default App;
