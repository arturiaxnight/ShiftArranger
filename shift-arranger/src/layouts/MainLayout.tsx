import React from 'react';
import {
    AppBar,
    Box,
    CssBaseline,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Typography,
    Tooltip
} from '@mui/material';
import {
    People as PeopleIcon,
    Schedule as ScheduleIcon,
    Work as WorkIcon,
    Menu as MenuIcon
} from '@mui/icons-material';
import { Link, Outlet } from 'react-router-dom';
import { useDrawer } from '../contexts/DrawerContext';

const drawerWidth = 240;
const drawerCollapsedWidth = 56;

const MainLayout: React.FC = () => {
    const { drawerOpen, setDrawerOpen } = useDrawer();
    
    const menuItems = [
        { text: '員工管理', icon: <PeopleIcon />, path: '/employees' },
        { text: '班別管理', icon: <WorkIcon />, path: '/shifts' },
        { text: '排班表', icon: <ScheduleIcon />, path: '/schedule' },
    ];

    const handleDrawerToggle = () => {
        setDrawerOpen(!drawerOpen);
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <CssBaseline />
            <AppBar 
                position="fixed" 
                sx={{ 
                    zIndex: (theme: any) => theme.zIndex.drawer + 1,
                    ml: drawerOpen ? `${drawerWidth}px` : `${drawerCollapsedWidth}px`,
                    width: `calc(100% - ${drawerOpen ? drawerWidth : drawerCollapsedWidth}px)`,
                    transition: (theme: any) =>
                        theme.transitions.create(['width', 'margin-left'], {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.leavingScreen,
                        }),
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="toggle drawer"
                        onClick={handleDrawerToggle}
                        edge="start"
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div">
                        排班系統
                    </Typography>
                </Toolbar>
            </AppBar>
            <Drawer
                variant="permanent"
                sx={{
                    width: drawerOpen ? drawerWidth : drawerCollapsedWidth,
                    flexShrink: 0,
                    position: 'fixed',
                    height: '100vh',
                    '& .MuiDrawer-paper': {
                        position: 'static',
                        width: drawerOpen ? drawerWidth : drawerCollapsedWidth,
                        transition: (theme: any) =>
                            theme.transitions.create('width', {
                                easing: theme.transitions.easing.sharp,
                                duration: theme.transitions.duration.enteringScreen,
                            }),
                        overflowX: 'hidden',
                        whiteSpace: 'nowrap',
                        height: '100%',
                    },
                }}
            >
                <Toolbar />
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    height: 'calc(100% - 64px)'
                }}>
                    <List>
                        {menuItems.map((item) => (
                            <ListItem key={item.text} disablePadding>
                                <Tooltip title={!drawerOpen ? item.text : ""} placement="right">
                                    <ListItemButton
                                        component={Link}
                                        to={item.path}
                                        sx={{
                                            minHeight: 48,
                                            justifyContent: drawerOpen ? 'initial' : 'center',
                                            px: 2.5,
                                        }}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                minWidth: 0,
                                                mr: drawerOpen ? 3 : 'auto',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            {item.icon}
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary={item.text} 
                                            sx={{ 
                                                opacity: drawerOpen ? 1 : 0,
                                                transition: (theme: any) =>
                                                    theme.transitions.create('opacity', {
                                                        duration: theme.transitions.duration.enteringScreen,
                                                    }),
                                            }} 
                                        />
                                    </ListItemButton>
                                </Tooltip>
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </Drawer>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 2,
                    ml: drawerOpen ? `${drawerWidth}px` : `${drawerCollapsedWidth}px`,
                    width: `calc(100% - ${drawerOpen ? drawerWidth : drawerCollapsedWidth}px)`,
                    transition: (theme: any) =>
                        theme.transitions.create(['width', 'margin-left'], {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                }}
            >
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
};

export default MainLayout; 