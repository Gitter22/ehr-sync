import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      <AppBar position="static" elevation={1} sx={{ flexShrink: 0 }}>
        <Toolbar>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}
          >
            EHR Sync
          </Typography>
          <Button
            color="inherit"
            component={Link}
            to="/"
            sx={{ fontWeight: location.pathname === '/' ? 700 : 400 }}
          >
            Patients
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/control-panel"
            sx={{ fontWeight: location.pathname === '/control-panel' ? 700 : 400 }}
          >
            Control Panel
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/how-this-works"
            sx={{ fontWeight: location.pathname === '/how-this-works' ? 700 : 400 }}
          >
            How this works
          </Button>
        </Toolbar>
      </AppBar>
      <Box
        component="main"
        sx={{
          flex: 1,
          // Bounded height comes from `flex: 1` inside the height:100vh column above, regardless
          // of this box's own overflow value — `auto` here just means pages that don't constrain
          // their own height (Control Panel, How this works) scroll normally at the page level.
          // Only the Patients page needs the "only the inner table scrolls, header stays sticky"
          // behavior, and it achieves that itself (its own height:'100%' + inner overflow:'auto'
          // TableContainer) — it was never something this shared shell should have enforced on
          // every page via `overflow: 'hidden'` here.
          minHeight: 0,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          p: 3,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
