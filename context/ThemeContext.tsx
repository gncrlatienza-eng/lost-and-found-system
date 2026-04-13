import React, { createContext, useContext, useState } from 'react';

type Theme = 'light' | 'dark';

export const lightColors = {
  bg: '#f2f2f7',
  card: '#ffffff',
  text: '#1c1c1e',
  subtext: '#8e8e93',
  border: '#e5e5ea',
  input: '#f2f2f7',
  placeholder: '#c7c7cc',
  tabBar: '#ffffff',
  tabInactive: '#9ca3af',
  tabActive: '#4F46E5',
  accent: '#1c1c1e',
  danger: '#ff3b30',
  success: '#34c759',
  warning: '#ff9500',
  info: '#007aff',
  pillInactive: '#e5e5ea',
  pillInactiveText: '#8e8e93',
  shadow: '#000',
};

export const darkColors: typeof lightColors = {
  bg: '#0d0d0f',
  card: '#1c1c1e',
  text: '#f2f2f7',
  subtext: '#636366',
  border: '#2c2c2e',
  input: '#2c2c2e',
  placeholder: '#48484a',
  tabBar: '#1c1c1e',
  tabInactive: '#636366',
  tabActive: '#818cf8',
  accent: '#f2f2f7',
  danger: '#ff453a',
  success: '#30d158',
  warning: '#ffd60a',
  info: '#0a84ff',
  pillInactive: '#2c2c2e',
  pillInactiveText: '#636366',
  shadow: '#000',
};

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  colors: typeof lightColors;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  colors: lightColors,
  isDark: false,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('light');
  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));
  const colors = theme === 'light' ? lightColors : darkColors;
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);