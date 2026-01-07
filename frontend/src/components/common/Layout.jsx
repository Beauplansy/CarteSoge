import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItem,
  ListItemIcon, ListItemText, Box, CssBaseline, IconButton,
  Menu, MenuItem, Avatar, Divider
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Assignment as ApplicationIcon,
  Person as UserIcon,
  Assessment as ReportIcon,
  Summarize as AssessmentIcon,
  AccountCircle as ProfileIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon
} from '@mui/icons-material'

// Import du logo depuis src/assets/logo.png
import logo from '../../assets/logo.png'

const drawerWidth = 240

const Layout = () => {
  const { user, logout, can } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState(null)

  // Fonction pour obtenir le nom complet
  const getFullName = () => {
    if (!user) return 'Utilisateur'
    const firstName = user.first_name || ''
    const lastName = user.last_name || ''
    const fullName = `${firstName} ${lastName}`.trim()
    return fullName || user.username || user.email || 'Utilisateur'
  }

  // Fonction pour obtenir les initiales
  const getInitials = () => {
    const fullName = getFullName()
    if (!fullName) return 'U'
    
    const names = fullName.split(' ')
    if (names.length === 1) return names[0].charAt(0).toUpperCase()
    
    const firstInitial = names[0].charAt(0).toUpperCase()
    const lastInitial = names[names.length - 1].charAt(0).toUpperCase()
    return `${firstInitial}${lastInitial}`
  }

  // Fonction pour obtenir le rôle formaté
  const getRoleDisplay = () => {
    if (!user?.role) return 'UTILISATEUR'
    
    const roleMap = {
      'manager': 'GESTIONNAIRE',
      'officer': 'OFFICIER',
      'analyst': 'ANALYSTE',
      'admin': 'ADMINISTRATEUR'
    }
    
    return roleMap[user.role] || user.role.toUpperCase()
  }

  const menuItems = [
    { text: 'Tableau de Bord', icon: <DashboardIcon />, path: '/dashboard', permission: 'view_dashboard' },
    { text: 'Dossiers', icon: <ApplicationIcon />, path: '/applications', permission: 'view_applications' },
  ]

  // Ajouter les éléments de menu admin seulement si l'utilisateur a les permissions
  if (can('manage_users')) {
    menuItems.push(
      { text: 'Gestion Utilisateurs', icon: <UserIcon />, path: '/admin/users', permission: 'manage_users' },
      { text: 'Rapports', icon: <ReportIcon />, path: '/admin/reports', permission: 'view_reports' },
      { text: 'Audit', icon: <AssessmentIcon />, path: '/admin/audit', permission: 'manage_users' }
    )
  } else {
    if (can('view_reports')) {
      menuItems.push(
        { text: 'Rapports', icon: <ReportIcon />, path: '/admin/reports', permission: 'view_reports' }
      )
    }
  }

  // Filtrer les éléments de menu selon les permissions
  const filteredMenuItems = menuItems.filter(item => 
    !item.permission || can(item.permission)
  )

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    handleMenuClose()
    logout()
    navigate('/login')
  }

  const handleProfile = () => {
    handleMenuClose()
    navigate('/profile')
  }

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Logo seulement dans la barre latérale */}
          <Box
            component="img"
            src={logo}
            alt="SOGEAPP CREDIT Logo"
            sx={{
              width: 40,
              height: 40,
              objectFit: 'contain',
              borderRadius: 1
            }}
          />
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            SOGEAPP CREDIT
          </Typography>
        </Box>
      </Toolbar>
      
      <Divider />
      
      <Box sx={{ p: 2, bgcolor: 'primary.light', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Avatar 
            sx={{ 
              width: 40, 
              height: 40,
              bgcolor: 'white',
              color: 'primary.main',
              fontWeight: 'bold'
            }}
          >
            {getInitials()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
              {getFullName()}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.9 }}>
              {getRoleDisplay()}
            </Typography>
          </Box>
        </Box>
      </Box>
      
      <Divider />
      
      <List sx={{ flex: 1, overflow: 'hidden', py: 1 }}>
        {filteredMenuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            selected={location.pathname.startsWith(item.path)}
            onClick={() => {
              navigate(item.path)
              if (mobileOpen) {
                handleDrawerToggle()
              }
            }}
            sx={{
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
                '& .MuiListItemIcon-root': {
                  color: 'white',
                }
              },
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              mb: 0.5,
              borderRadius: 1,
              mx: 1
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text}
              primaryTypographyProps={{
                fontSize: '0.9rem',
                fontWeight: location.pathname.startsWith(item.path) ? 'bold' : 'normal'
              }}
            />
          </ListItem>
        ))}
      </List>
      
      <Divider />
      
      <List sx={{ py: 1 }}>
        <ListItem
          button
          onClick={handleProfile}
          sx={{
            '&:hover': {
              backgroundColor: 'action.hover',
            },
            mb: 0.5,
            borderRadius: 1,
            mx: 1
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <ProfileIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Mon Profil"
            primaryTypographyProps={{ fontSize: '0.9rem' }}
          />
        </ListItem>
        <ListItem
          button
          onClick={handleLogout}
          sx={{
            '&:hover': {
              backgroundColor: 'error.light',
              color: 'error.main'
            },
            borderRadius: 1,
            mx: 1
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Déconnexion"
            primaryTypographyProps={{ fontSize: '0.9rem' }}
          />
        </ListItem>
      </List>
    </Box>
  )

  return (
    <Box sx={{ 
      display: 'flex', 
      minHeight: '100vh',
      overflow: 'hidden'  // Empêche le défilement global
    }}>
      <CssBaseline />
      
      {/* AppBar principale - SANS LOGO */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: 'white',
          color: 'primary.main',
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
          borderBottom: '1px solid #e0e0e0',
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar>
          {/* Menu burger pour mobile */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2, 
              display: { sm: 'none' },
              color: 'primary.main'
            }}
          >
            <MenuIcon />
          </IconButton>
          
          {/* Titre de la page actuelle seulement - PAS DE LOGO */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Typography 
              variant="h6" 
              noWrap 
              component="div" 
              sx={{ 
                fontWeight: 'bold',
                fontSize: '1.1rem',
                color: 'primary.main'
              }}
            >
              {filteredMenuItems.find(item => location.pathname.startsWith(item.path))?.text || 'Tableau de Bord'}
            </Typography>
          </Box>

          {/* Section droite avec profil seulement */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Informations utilisateur */}
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.8
                }
              }}
              onClick={handleProfileMenuOpen}
            >
              {/* Avatar */}
              <Avatar 
                sx={{ 
                  width: 40, 
                  height: 40,
                  bgcolor: 'primary.main',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  border: '2px solid',
                  borderColor: 'primary.light'
                }}
                alt={getFullName()}
              >
                {getInitials()}
              </Avatar>
              
              {/* Nom et rôle - visible seulement sur desktop */}
              <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    lineHeight: 1.2,
                    color: 'primary.main'
                  }}
                >
                  {getFullName()}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                    lineHeight: 1.2
                  }}
                >
                  {getRoleDisplay()}
                </Typography>
              </Box>
            </Box>

            {/* Menu déroulant simplifié */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              PaperProps={{
                sx: {
                  mt: 1.5,
                  minWidth: 220,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                  borderRadius: 2,
                  overflow: 'hidden'
                }
              }}
            >
              {/* En-tête du menu avec infos utilisateur */}
              <MenuItem disabled sx={{ py: 1.5, backgroundColor: 'primary.light' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5, width: '100%' }}>
                  <Avatar 
                    sx={{ 
                      width: 44, 
                      height: 44,
                      bgcolor: 'white',
                      color: 'primary.main',
                      fontSize: '1rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {getInitials()}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'white' }}>
                      {getFullName()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'white', opacity: 0.9 }}>
                      {getRoleDisplay()}
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
              
              <MenuItem onClick={handleProfile} sx={{ py: 1.5 }}>
                <ListItemIcon>
                  <ProfileIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText>
                  <Typography variant="body2" fontWeight="medium">Mon Profil</Typography>
                </ListItemText>
              </MenuItem>
              
              <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main' }}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>
                  <Typography variant="body2" fontWeight="medium">Déconnexion</Typography>
                </ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation latérale */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Drawer pour mobile */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ 
            keepMounted: true,
            BackdropProps: {
              sx: {
                backgroundColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: 'none',
              boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
              overflow: 'hidden'  // Empêche le défilement dans le drawer mobile
            },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Drawer pour desktop */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: '1px solid #e0e0e0',
              backgroundColor: 'background.paper',
              overflow: 'hidden'  // Empêche le défilement dans le drawer desktop
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Contenu principal */}
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: { xs: 2, sm: 3 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          backgroundColor: '#f8f9fa',
          minHeight: '100vh',
          overflow: 'auto'  // Permet seulement le défilement interne du contenu principal
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}

export default Layout