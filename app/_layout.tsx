import { ThemeProvider } from '@/context/ThemeContext'; // ★パス変更
import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-get-random-values'; // ★追加: これがないとuuidでクラッシュします

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});