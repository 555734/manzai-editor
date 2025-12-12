import { Stack } from 'expo-router';
import { ThemeProvider } from './context/ThemeContext'; // ★追加

export default function RootLayout() {
  return (
    // ★追加: ThemeProviderで囲む
    <ThemeProvider>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            title: 'ネタ帳',
            headerShown: false
          }}
        />
        <Stack.Screen
          name="editor"
          options={{
            headerShown: false,
            presentation: 'card'
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}