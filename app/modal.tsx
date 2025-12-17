import { APP_COLORS, ThemeColorKey, useAppTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, Moon, Smartphone, Sun } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ModalScreen() {
  const router = useRouter();
  const {
    themePreference, setThemePreference,
    themeColorKey, setThemeColorKey,
    effectiveColorScheme, primaryColor
  } = useAppTheme();

  const isDark = effectiveColorScheme === 'dark';

  const theme = {
    background: isDark ? '#1F2329' : '#F2F2F7', // iOS設定画面風の背景
    cardBg: isDark ? '#2B2E35' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    subText: isDark ? '#AAAAAA' : '#888888',
    border: isDark ? '#3A3F45' : '#E5E5EA',
  };

  const renderColorOption = (colorKey: string, colorValue: string) => (
    <TouchableOpacity
      key={colorKey}
      style={[
        styles.colorOption,
        { backgroundColor: colorValue },
        themeColorKey === colorKey && styles.colorOptionSelected
      ]}
      onPress={() => setThemeColorKey(colorKey as ThemeColorKey)}
      activeOpacity={0.8}
    >
      {themeColorKey === colorKey && <Check size={20} color="#FFF" strokeWidth={3} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Text style={{ color: primaryColor, fontSize: 17 }}>完了</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>設定</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Appearance Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>外観モード</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
          {[
            { key: 'system', label: '自動 (端末設定)', icon: Smartphone },
            { key: 'light', label: 'ライト', icon: Sun },
            { key: 'dark', label: 'ダーク', icon: Moon },
          ].map((item, index, array) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.row,
                index !== array.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }
              ]}
              onPress={() => setThemePreference(item.key as any)}
            >
              <View style={styles.rowLeft}>
                <item.icon size={20} color={theme.text} style={{ marginRight: 12 }} />
                <Text style={[styles.rowLabel, { color: theme.text }]}>{item.label}</Text>
              </View>
              {themePreference === item.key && <Check size={20} color={primaryColor} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Color Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>テーマカラー</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.cardBg, padding: 16 }]}>
          <View style={styles.colorGrid}>
            {Object.entries(APP_COLORS).map(([key, value]) => renderColorOption(key, value))}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>アプリについて</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>バージョン</Text>
            <Text style={{ color: theme.subText }}>1.0.0</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  closeButton: { padding: 8, minWidth: 40 },

  content: { padding: 16 },

  sectionHeader: { marginBottom: 8, marginTop: 16, paddingLeft: 4 },
  sectionTitle: { fontSize: 13, color: '#888', textTransform: 'uppercase' },

  card: { borderRadius: 10, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { fontSize: 16 },

  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'flex-start',
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.2)',
  },
});