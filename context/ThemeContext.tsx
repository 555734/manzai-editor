import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

// テーマカラーの定義
export const APP_COLORS = {
    blue: '#007AFF',   // デフォルト
    red: '#FF3B30',
    orange: '#FF9500',
    green: '#34C759',
    purple: '#AF52DE',
    pink: '#FF2D55',
    monochrome: '#8E8E93',
};

export type ThemeColorKey = keyof typeof APP_COLORS;
type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextType = {
    themePreference: ThemePreference;
    setThemePreference: (pref: ThemePreference) => void;
    themeColorKey: ThemeColorKey;
    setThemeColorKey: (key: ThemeColorKey) => void;
    effectiveColorScheme: 'light' | 'dark';
    primaryColor: string;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemColorScheme = useColorScheme();
    const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
    const [themeColorKey, setThemeColorKeyState] = useState<ThemeColorKey>('blue');

    // 初期化時に保存された設定を読み込む
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const storedPref = await AsyncStorage.getItem('theme_preference');
                const storedColor = await AsyncStorage.getItem('theme_color');

                if (storedPref) setThemePreferenceState(storedPref as ThemePreference);
                if (storedColor) setThemeColorKeyState(storedColor as ThemeColorKey);
            } catch (e) {
                console.error("Failed to load theme settings", e);
            }
        };
        loadSettings();
    }, []);

    // 設定保存用ラッパー関数
    const setThemePreference = async (pref: ThemePreference) => {
        setThemePreferenceState(pref);
        await AsyncStorage.setItem('theme_preference', pref);
    };

    const setThemeColorKey = async (key: ThemeColorKey) => {
        setThemeColorKeyState(key);
        await AsyncStorage.setItem('theme_color', key);
    };

    // 実際に適用されるモード（systemの場合は端末設定に従う）
    const effectiveColorScheme =
        themePreference === 'system'
            ? (systemColorScheme ?? 'light')
            : themePreference;

    const primaryColor = APP_COLORS[themeColorKey];

    return (
        <ThemeContext.Provider value={{
            themePreference,
            setThemePreference,
            themeColorKey,
            setThemeColorKey,
            effectiveColorScheme,
            primaryColor
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useAppTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useAppTheme must be used within a ThemeProvider');
    }
    return context;
}