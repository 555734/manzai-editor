import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, Search, Settings, Trash2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';

import { useAppTheme } from '@/context/ThemeContext';

type Line = { id: string; text: string; };
type ScriptData = { id: string; title: string; lines: Line[]; updatedAt: number; };

export default function HomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // primaryColorを取得
    const { effectiveColorScheme, primaryColor } = useAppTheme();
    const isDark = effectiveColorScheme === 'dark';

    const theme = {
        background: isDark ? '#1F2329' : '#F5F5F5',
        headerBg: isDark ? '#2B2E35' : '#FFFFFF',
        headerText: isDark ? '#F5F5F5' : '#000000',
        cardBg: isDark ? '#2B2E35' : '#FFFFFF',
        text: isDark ? '#F5F5F5' : '#333333',
        subText: isDark ? '#AAAAAA' : '#888888',
        placeholder: isDark ? '#666666' : '#CCCCCC',
        border: isDark ? '#3A3F45' : '#E0E0E0',
        fab: primaryColor, // ★ここを変更
    };

    const [scripts, setScripts] = useState<ScriptData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadScripts();
        }, [])
    );

    const loadScripts = async () => {
        setLoading(true);
        try {
            const keys = await AsyncStorage.getAllKeys();
            const scriptKeys = keys.filter(k => k.startsWith('manzai_script_'));
            const result = await AsyncStorage.multiGet(scriptKeys);

            const loadedScripts: ScriptData[] = [];
            const emptyKeysToDelete: string[] = [];

            result.forEach(([key, value]) => {
                if (!value) return;
                try {
                    const parsed = JSON.parse(value);
                    const id = key.replace('manzai_script_', '');
                    const hasContent = parsed.lines && parsed.lines.length > 0;
                    const hasTitle = parsed.title && parsed.title.trim() !== '';

                    if (!hasContent && !hasTitle) emptyKeysToDelete.push(key);
                    else loadedScripts.push({ ...parsed, id });
                } catch (e) { console.error(e); }
            });

            if (emptyKeysToDelete.length > 0) await AsyncStorage.multiRemove(emptyKeysToDelete);
            loadedScripts.sort((a, b) => b.updatedAt - a.updatedAt);
            setScripts(loadedScripts);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleCreateNew = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newId = uuidv4();
        router.push(`/editor?id=${newId}`);
    };

    const handleDelete = (id: string, title: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert("削除", `「${title || '無題'}」を削除しますか？`, [
            { text: "キャンセル", style: "cancel" },
            {
                text: "削除", style: "destructive", onPress: async () => {
                    await AsyncStorage.removeItem(`manzai_script_${id}`);
                    setScripts(prev => prev.filter(item => item.id !== id));
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            }
        ]);
    };

    const filteredScripts = scripts.filter(script => (script.title || '').toLowerCase().includes(searchQuery.toLowerCase()));

    const renderItem = ({ item }: { item: ScriptData }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
            onPress={() => router.push(`/editor?id=${item.id}`)}
            activeOpacity={0.7}
        >
            <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.title || '無題のネタ'}</Text>
                <Text style={[styles.cardPreview, { color: theme.subText }]} numberOfLines={1}>
                    {item.lines.length > 0 ? item.lines[0].text : '（まだ内容がありません）'}
                </Text>
                <Text style={[styles.cardDate, { color: theme.subText }]}>
                    {new Date(item.updatedAt).toLocaleDateString()}
                </Text>
            </View>
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDelete(item.id, item.title); }} style={styles.deleteButton}>
                <Trash2 size={20} color={theme.subText} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const headerPaddingTop = Math.max(insets.top, 0);
    const headerHeight = headerPaddingTop + 56;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <View style={[styles.header, { height: headerHeight, paddingTop: headerPaddingTop, backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
                {isSearchActive ? (
                    <View style={styles.searchBarContainer}>
                        <View style={[styles.searchInputWrapper, { backgroundColor: theme.background }]}>
                            <Search size={20} color={theme.subText} />
                            <TextInput
                                style={[styles.searchInput, { color: theme.text }]}
                                placeholder="検索..."
                                placeholderTextColor={theme.placeholder}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                        </View>
                        <TouchableOpacity onPress={() => { setIsSearchActive(false); setSearchQuery(''); }} style={styles.cancelButton}>
                            <Text style={{ color: theme.fab }}>キャンセル</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.headerContent}>
                        <Text style={[styles.headerTitle, { color: theme.headerText }]}>ネタ帳</Text>
                        <View style={styles.headerRightIcons}>
                            <TouchableOpacity onPress={() => setIsSearchActive(true)} style={styles.iconButton}>
                                <Search size={26} color={theme.headerText} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/modal')} style={styles.iconButton}>
                                <Settings size={26} color={theme.headerText} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
            {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.fab} /></View> :
                <FlatList
                    data={filteredScripts}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<View style={styles.center}><Text style={{ color: theme.subText }}>{searchQuery ? '見つかりませんでした' : 'ネタがまだありません'}</Text></View>}
                />
            }
            {!isSearchActive && (
                <TouchableOpacity style={[styles.fab, { backgroundColor: theme.fab, bottom: Math.max(insets.bottom, 20) + 10 }]} onPress={handleCreateNew}>
                    <Plus size={32} color="#fff" />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { justifyContent: 'center', borderBottomWidth: 1 },
    headerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    headerTitle: { fontSize: 22, fontWeight: 'bold' },
    headerRightIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconButton: { padding: 8 },
    searchBarContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
    searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 36, borderRadius: 18, paddingHorizontal: 12, gap: 8 },
    searchInput: { flex: 1, fontSize: 16, height: '100%', padding: 0 },
    cancelButton: { padding: 4 },
    listContent: { padding: 16, paddingBottom: 100 },
    card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1 },
    cardContent: { flex: 1, marginRight: 8 },
    cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
    cardPreview: { fontSize: 13, marginBottom: 6, opacity: 0.8 },
    cardDate: { fontSize: 11 },
    deleteButton: { padding: 8 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    fab: { position: 'absolute', right: 24, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
});