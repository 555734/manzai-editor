import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      {/* ネタ帳（一覧画面）の設定 */}
      <Stack.Screen
        name="index"
        options={{
          title: 'ネタ帳',
          headerShown: false // index.tsx側でヘッダーを作っているので、ここは隠す
        }}
      />

      {/* エディター画面の設定 */}
      <Stack.Screen
        name="editor"
        options={{
          headerShown: false, // editor.tsx側でカスタムヘッダーを作ったので、標準ヘッダーは隠す
          presentation: 'card' // 下から出てくるのではなく、横スライドで画面遷移する
        }}
      />
    </Stack>
  );
}