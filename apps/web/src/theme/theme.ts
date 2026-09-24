import { createTheme } from '@mui/material/styles';

// Color scales, adapted from specs/style/style.ts. Kept as local constants rather than exposed on
// the theme object (via a `tokens` namespace) since nothing in the app reads them off the theme —
// they're only needed here, to build the palette and the Chip color-variant overrides below.
const brand = {
  50: '#eff4ff',
  100: '#dbe6fe',
  200: '#bfd3fe',
  300: '#93b4fd',
  400: '#6090fa',
  500: '#3b76f6',
  600: '#2563eb',
  700: '#1d58d8',
  800: '#1e4baf',
  900: '#1e408a',
};

const grey = {
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#e6e6e6',
  300: '#d6d6d6',
  400: '#a5a5a5',
  500: '#767676',
  600: '#575757',
  700: '#434343',
  800: '#272727',
  900: '#1a1a1a',
  950: '#0a0a0a',
};

const red = { 200: '#ffc6c6', 400: '#ff6767', 600: '#eb2525', 800: '#a31111', 900: '#861616' };
const green = { 200: '#aafc9a', 400: '#3feb25', 600: '#18a808', 800: '#15650f', 900: '#155512' };
const orange = { 200: '#f9d4af', 300: '#f4b57d', 500: '#eb6d25', 700: '#b73f17', 900: '#752c19' };
const blue = { 200: '#bcdefb', 300: '#81c5f8', 500: '#2598eb', 700: '#08589c', 900: '#0f3f6b' };

function tintedChipColor(scale: Record<number, string>) {
  return {
    color: scale[900],
    background: `${scale[200]}30`,
    '&:hover': { background: `${scale[200]}50` },
  };
}

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: brand[600], light: brand[400], dark: brand[800], contrastText: '#fff' },
    secondary: { main: grey[800], light: grey[600], dark: grey[950], contrastText: '#fff' },
    background: { default: grey[50], paper: '#ffffff' },
    text: { primary: grey[800], secondary: grey[500], disabled: grey[300] },
    divider: grey[200],
    success: { main: green[600], light: green[400], dark: green[800] },
    warning: { main: orange[500], light: orange[300], dark: orange[700] },
    error: { main: red[600], light: red[400], dark: red[800] },
    info: { main: blue[500], light: blue[300], dark: blue[700] },
  },
  typography: {
    fontFamily: ['Manrope', 'Inter', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(','),
    // The default 400/regular reads as too thin for this typeface at UI sizes — shift the whole
    // weight scale up a notch instead of overriding every variant individually. Matches the
    // 500/600/700/800 Manrope weight files actually loaded in main.tsx.
    fontWeightLight: 500,
    fontWeightRegular: 500,
    fontWeightMedium: 600,
    fontWeightBold: 700,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, letterSpacing: '0.02em' },
        colorPrimary: tintedChipColor(brand),
        colorSecondary: tintedChipColor(grey),
        colorSuccess: tintedChipColor(green),
        colorWarning: tintedChipColor(orange),
        colorError: tintedChipColor(red),
        colorInfo: tintedChipColor(blue),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${grey[200]}` },
        head: {
          fontWeight: 700,
          color: grey[800],
          backgroundColor: grey[100],
          borderBottom: `2px solid ${grey[300]}`,
        },
        // stickyHeader cells default to a different background than plain head cells — keep them
        // in sync so the header still reads as one solid band while a table body scrolls beneath it.
        stickyHeader: { backgroundColor: grey[100] },
      },
    },
  },
});
