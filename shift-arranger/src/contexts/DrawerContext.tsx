import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DrawerContextType {
    drawerOpen: boolean;
    setDrawerOpen: (open: boolean) => void;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export const DrawerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [drawerOpen, setDrawerOpen] = useState(true);

    return (
        <DrawerContext.Provider value={{ drawerOpen, setDrawerOpen }}>
            {children}
        </DrawerContext.Provider>
    );
};

export const useDrawer = () => {
    const context = useContext(DrawerContext);
    if (context === undefined) {
        throw new Error('useDrawer must be used within a DrawerProvider');
    }
    return context;
}; 