import { createTheme, responsiveFontSizes, styled, type Shadows } from '@mui/material/styles';
import Container from '@mui/material/Container';

const pxToRem = (value: number): string => `${value / 16}rem`;

const spacingUnit = 8;
const spacingTokens = {
  xxs: 0.5,
  xs: 1,
  sm: 1.5,
  md: 2,
  lg: 3,
  xl: 4,
} as const;

const shadowTokens = {
  none: 'none',
  xs: '0 1px 2px rgba(0,0,0,0.06)',
  sm: '0 4px 12px rgba(0,0,0,0.06)',
  md: '0 8px 20px rgba(0,0,0,0.06)',
  lg: '0 12px 28px rgba(0,0,0,0.08)',
  xl: '0 20px 40px rgba(0,0,0,0.1)',
  inner: 'inset 0 1px 2px rgba(0,0,0,0.08)',
} as const;

const shadows: Shadows = [
  shadowTokens.none,
  shadowTokens.xs,
  shadowTokens.sm,
  shadowTokens.md,
  shadowTokens.lg,
  shadowTokens.xl,
  shadowTokens.xl,
  shadowTokens.xl,
  '0 24px 48px rgba(0,0,0,0.12)',
  '0 28px 56px rgba(0,0,0,0.14)',
  '0 32px 64px rgba(0,0,0,0.16)',
  '0 36px 72px rgba(0,0,0,0.18)',
  '0 40px 80px rgba(0,0,0,0.2)',
  '0 44px 88px rgba(0,0,0,0.22)',
  '0 48px 96px rgba(0,0,0,0.24)',
  '0 52px 104px rgba(0,0,0,0.26)',
  '0 56px 112px rgba(0,0,0,0.28)',
  '0 60px 120px rgba(0,0,0,0.3)',
  '0 64px 128px rgba(0,0,0,0.32)',
  '0 68px 136px rgba(0,0,0,0.34)',
  '0 72px 144px rgba(0,0,0,0.36)',
  '0 76px 152px rgba(0,0,0,0.38)',
  '0 80px 160px rgba(0,0,0,0.4)',
  '0 84px 168px rgba(0,0,0,0.42)',
  '0 88px 176px rgba(0,0,0,0.44)',
];

export const Wrapper = styled(Container)(({ theme }) => ({
  padding: theme.spacing(5, 0),
  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(3, 0),
    ',MuiCard-root': {
      padding: theme.spacing(0),
    },
  },
}));

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
  950: '#172a54',
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

const white = '#ffffff';

const black = '#000000';

const red = {
  50: '#fff1f1',
  100: '#ffe0e0',
  200: '#ffc6c6',
  300: '#ff9e9e',
  400: '#ff6767',
  500: '#fc3737',
  600: '#eb2525',
  700: '#c51010',
  800: '#a31111',
  900: '#861616',
  950: '#490606',
};

const green = {
  50: '#ebffe6',
  100: '#d3fec9',
  200: '#aafc9a',
  300: '#74f75f',
  400: '#3feb25',
  500: '#26d210',
  600: '#18a808',
  700: '#15800b',
  800: '#15650f',
  900: '#155512',
  950: '#052f04',
};

const orange = {
  50: '#fef6ee',
  100: '#fcebd8',
  200: '#f9d4af',
  300: '#f4b57d',
  400: '#ef8b48',
  500: '#eb6d25',
  600: '#dc531a',
  700: '#b73f17',
  800: '#92321a',
  900: '#752c19',
  950: '#3f140b',
};

const blue = {
  50: '#f0f7ff',
  100: '#e1effd',
  200: '#bcdefb',
  300: '#81c5f8',
  400: '#3ea7f2',
  500: '#2598eb',
  600: '#086ec1',
  700: '#08589c',
  800: '#0b4b81',
  900: '#0f3f6b',
  950: '#0a2847',
};

const baseTheme = createTheme({
  palette: {
    primary: {
      main: brand[600],
      light: brand[400],
      dark: brand[800],
      contrastText: '#fff',
    },

    secondary: {
      main: grey[800],
      light: grey[600],
      dark: grey[950],
      contrastText: '#fff',
    },

    background: {
      default: grey[50],
      paper: white,
    },

    text: {
      primary: grey[800],
      secondary: grey[500],
      disabled: grey[300],
    },

    grey,

    divider: grey[300],

    //   active: '';
    // hover: '';
    // hoverOpacity: '';
    // selected: '';
    // selectedOpacity: '';
    // disabled: '';
    // disabledOpacity: '';
    // disabledBackground: '';
    // focus: '';
    // focusOpacity: '';
    // activatedOpacity: '';

    success: { main: green[400], light: green[200], dark: green[600], contrastText: black },
    warning: { main: orange[500], light: orange[300], dark: orange[700], contrastText: black },
    error: { main: red[600], light: red[400], dark: red[800], contrastText: black },
    info: { main: blue[500], light: blue[300], dark: blue[700], contrastText: black },
  },

  shape: {
    borderRadius: 8,
    borderRadiusSm: 4,
    borderRadiusMd: 8,
    borderRadiusLg: 16,
    borderRadiusXl: 24,
  },

  typography: {
    fontFamily: 'Gilroy, Inter, sans-serif',
    htmlFontSize: 16,

    h1: {
      fontSize: pxToRem(36),
      fontWeight: 600,
    },
    h2: { fontSize: pxToRem(30), fontWeight: 600 },
    h3: { fontSize: pxToRem(28), fontWeight: 600 },
    h4: { fontSize: pxToRem(24), fontWeight: 600 },
    h5: { fontSize: pxToRem(20), fontWeight: 600 },
    h6: { fontSize: pxToRem(18), fontWeight: 600 },
    body1: { fontSize: pxToRem(16), fontWeight: 400, lineHeight: 1.4 },
    body2: { fontSize: pxToRem(16), fontWeight: 400, lineHeight: 1.5, letterSpacing: '0.04em' },
    subtitle1: { fontSize: pxToRem(14), fontWeight: 500 },
    subtitle2: {
      fontSize: pxToRem(14),

      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    },
    caption: {
      fontSize: pxToRem(12),
    },
    overline: {
      fontSize: pxToRem(12),
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
  },

  spacing: spacingUnit,

  shadows,

  tokens: {
    colors: {
      brand,
      grey,
      red,
      green,
      orange,
      blue,
      white,
      black,
    },
    spacing: {
      ...spacingTokens,
    },
  },

  components: {
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadiusLg,
          boxShadow: theme.shadows[3],
          padding: theme.spacing(theme.tokens.spacing.lg),
        }),
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },

    MuiAvatar: {
      styleOverrides: {
        root: ({ theme }) => ({
          fontWeight: 600,
          '&.profilePlaceHolder': {
            backgroundColor: theme.tokens.colors.grey[200],
          },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadiusMd,
          fontWeight: 500,
          letterSpacing: '0.04em',
          '&.MuiChip-colorPrimary': {
            color: theme.tokens.colors.brand[900],
            background: `${theme.tokens.colors.brand[200]}30`,
            '&:hover': {
              background: `${theme.tokens.colors.brand[200]}50`,
            },
          },
          '&.MuiChip-colorSecondary': {
            color: theme.tokens.colors.grey[900],
            background: `${theme.tokens.colors.grey[200]}30`,
            '&:hover': {
              background: `${theme.tokens.colors.grey[200]}50`,
            },
          },
          '&.MuiChip-colorInfo': {
            color: theme.tokens.colors.blue[900],
            background: `${theme.tokens.colors.blue[200]}30`,
            '&:hover': {
              background: `${theme.tokens.colors.blue[200]}50`,
            },
          },
          '&.MuiChip-colorSuccess': {
            color: theme.tokens.colors.green[900],
            background: `${theme.tokens.colors.green[200]}30`,
            '&:hover': {
              background: `${theme.tokens.colors.green[200]}50`,
            },
          },
          '&.MuiChip-colorWarning': {
            color: theme.tokens.colors.orange[900],
            background: `${theme.tokens.colors.orange[200]}30`,
            '&:hover': {
              background: `${theme.tokens.colors.orange[200]}50`,
            },
          },
          '&.MuiChip-colorError': {
            color: theme.tokens.colors.red[900],
            background: `${theme.tokens.colors.red[200]}30`,
            '&:hover': {
              background: `${theme.tokens.colors.red[200]}50`,
            },
          },
        }),
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiFilledInput-root': {
            fontWeight: 500,
            backgroundColor: theme.tokens.colors.brand[50],
            '&:hover': {
              backgroundColor: `${theme.tokens.colors.brand[50]}95`,
            },
          },
          '& .MuiFilledInput-root.Mui-focused': {
            backgroundColor: `${theme.tokens.colors.brand[50]}95`,
          },
          '& .MuiOutlinedInput-root': {
            backgroundColor: theme.tokens.colors.grey[50],
          },

          '& .MuiOutlinedInput-root.Mui-focused': {
            backgroundColor: theme.tokens.colors.white,
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.tokens.colors.grey[700],
          },

          '& .MuiOutlinedInput-input': {
            '&::placeholder': {
              fontWeight: 500,
            },

            '&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus, &:-webkit-autofill:active':
              {
                boxShadow: `0 0 0 1000px ${theme.tokens.colors.white} inset`,
                WebkitTextFillColor: theme.tokens.colors.grey[800],
                caretColor: theme.tokens.colors.grey[800],
                transition: 'background-color 9999s ease-out 0s',
              },
            fontWeight: 500,
          },
          '& .MuiFilledInput-input': {
            fontWeight: 500,
          },
          '& .MuiInputLabel-root': {
            fontWeight: 500,
          },
          '& .MuiFormHelperText-root': {
            fontWeight: 500,
          },
        }),
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          '& .MuiTypography-root': {
            fontWeight: 500,
          },
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        root: ({ theme }) => ({
          '.MuiDialogTitle-root': {
            maxWidth: `calc(100% - ${theme.spacing(
              theme.tokens.spacing.xl + theme.tokens.spacing.md,
            )})`,
          },
          '.MuiDialogActions-root': {
            padding: theme.spacing(theme.tokens.spacing.md, theme.tokens.spacing.lg),
          },
        }),
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          '.MuiAlert-message': {
            fontWeight: 500,
          },
        },
      },
    },
  },
});

export const theme = responsiveFontSizes(baseTheme, {
  breakpoints: ['xs', 'sm', 'md', 'lg', 'xl'],
  factor: 2.2,
  disableAlign: false,
  variants: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'subtitle1',
    'subtitle2',
    'body1',
    'body2',
    'caption',
    'overline',
  ],
});
