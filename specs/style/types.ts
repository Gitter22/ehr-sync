import '@mui/material/styles';
import '@mui/system/createTheme/shape';

type ColorShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
type ColorScale = Record<ColorShade, string>;

interface ThemeColorTokens {
  brand: ColorScale;
  grey: ColorScale;
  red: ColorScale;
  green: ColorScale;
  orange: ColorScale;
  blue: ColorScale;
  white: string;
  black: string;
}

interface ThemeSpacingTokens {
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

declare module '@mui/material/styles' {
  interface Theme {
    tokens: {
      colors: ThemeColorTokens;
      spacing: ThemeSpacingTokens;
    };
  }

  interface ThemeOptions {
    tokens?: {
      colors?: ThemeColorTokens;
      spacing?: ThemeSpacingTokens;
    };
  }
}

declare module '@mui/system/createTheme/shape' {
  interface Shape {
    borderRadiusSm: number;
    borderRadiusMd: number;
    borderRadiusLg: number;
    borderRadiusXl: number;
  }
}

export {};
