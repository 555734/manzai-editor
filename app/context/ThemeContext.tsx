import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type ThemeType = 'light' | 'dark' | 'system';

type ThemeContextType = {
    theme: ThemeType;
    setTheme: (theme: ThemeType) => void;
    effectiveColorScheme: 'light' | 'dark'; // 実際に適用される色（systemの場合は端末設定に依存）
};

const ThemeContext = createContext<ThemeContextType>({
    theme: 'system',
    setTheme: () => { },
    effectiveColorScheme: 'light',
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const systemColorScheme = useSystemColorScheme();
    const [theme, setThemeState] = useState<ThemeType>('system');

    // アプリ起動時に保存された設定を読み込む
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem('app_theme');
                if (savedTheme) {
                    setThemeState(savedTheme as ThemeType);
                }
            } catch (e) {
                console.error('テーマ読み込みエラー', e);
            }
        };
        loadTheme();
    }, []);

    const setTheme = async (newTheme: ThemeType) => {
        setThemeState(newTheme);
        await AsyncStorage.setItem('app_theme', newTheme);
    };

    // 'system' の場合は端末の設定を使う。それ以外は設定値を優先。
    const effectiveColorScheme =
        theme === 'system' ? (systemColorScheme ?? 'light') : theme;

    return (
        <ThemeContext.Provider value={{ theme, setTheme, effectiveColorScheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// どこからでもテーマを使えるようにするフック
export const useAppTheme = () => useContext(ThemeContext);