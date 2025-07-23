import { ConfigProvider, theme } from 'antd';
import { useEffect } from 'react';
import AppLayout from './components/layout/AppLayout';
import { useSettingsStore } from './stores/settingsStore';
import './App.css';

// Font size mapping
const fontSizeMap = {
  small: {
    fontSize: 12,
    fontSizeLG: 14,
    fontSizeXL: 16,
    fontSizeHeading1: 28,
    fontSizeHeading2: 22,
    fontSizeHeading3: 18,
    fontSizeHeading4: 16,
    fontSizeHeading5: 14,
  },
  medium: {
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeXL: 18,
    fontSizeHeading1: 32,
    fontSizeHeading2: 26,
    fontSizeHeading3: 20,
    fontSizeHeading4: 18,
    fontSizeHeading5: 16,
  },
  large: {
    fontSize: 16,
    fontSizeLG: 18,
    fontSizeXL: 20,
    fontSizeHeading1: 36,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 18,
  },
};

function App() {
    const { settings, loadSettings } = useSettingsStore();

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const isDarkMode = settings.theme === 'dark';
    const fontSizeTokens = fontSizeMap[settings.fontSize] || fontSizeMap.medium;

    return (
        <ConfigProvider
            theme={{
                algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
                token: {
                    colorPrimary: '#1890ff',
                    borderRadius: 6,
                    ...fontSizeTokens,
                },
            }}
        >
            <AppLayout />
        </ConfigProvider>
    );
}

export default App
