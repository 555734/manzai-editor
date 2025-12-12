import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { Check, ChevronRight, Plus, Search, Settings, SlidersHorizontal, Trash2, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from './context/ThemeContext'; // ★追加

type NetaSummary = {
    id: string;
    title: string;
    updatedAt: number;
};

// 並び替えの種類の定義
type SortOption = 'dateDesc' | 'dateAsc' | 'titleAsc';

export default function IndexScreen() {
    const router = useRouter();
    const { theme, setTheme, effectiveColorScheme } = useAppTheme(); // ★テーマ取得
    const isDark = effectiveColorScheme === 'dark';

    const [netaList, setNetaList] = useState<NetaSummary[]>([]);

    // ★追加機能用のステート
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('dateDesc');
    const [isSettingsVisible, setSettingsVisible] = useState(false);
    const [isSortMenuVisible, setSortMenuVisible] = useState(false);

    // テーマカラー定義
    const colors = {
        bg: isDark ? '#151718' : '#F2F2F7',
        card: isDark ? '#2C2C2E' : '#fff',
        text: isDark ? '#ECEDEE' : '#333',
        subText: isDark ? '#9BA1A6' : '#8E8E93',
        border: isDark ? '#444' : '#E5E5EA',
        inputBg: isDark ? '#1C1C1E' : '#E5E5EA',
        tint: '#007AFF',
    };

    useFocusEffect(
        useCallback(() => {
            loadNetaList();
        }, [])
    );

    const loadNetaList = async () => {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const scriptKeys = keys.filter(k => k.startsWith('manzai_script_'));
            const items = await AsyncStorage.multiGet(scriptKeys);

            const list: NetaSummary[] = items.map(([key, value]) => {
                const id = key.replace('manzai_script_', '');
                const parsed = value ? JSON.parse(value) : null;
                let title = '無題のネタ';
                if (parsed && typeof parsed === 'object') {
                    if (parsed.title) title = parsed.title;
                    else if (Array.isArray(parsed.lines) && parsed.lines.length > 0) title = parsed.lines[0].text;
                } else if (Array.isArray(parsed) && parsed.length > 0) {
                    title = parsed[0].text;
                }
                return { id, title, updatedAt: parseInt(id) || 0 };
            });
            setNetaList(list);
        } catch (e) {
            console.error(e);
        }
    };

    // ★検索と並び替えのロジック
    const filteredAndSortedList = useMemo(() => {
        let result = [...netaList];

        // 1. 検索
        if (searchQuery) {
            result = result.filter(item =>
                item.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // 2. 並び替え
        result.sort((a, b) => {
            if (sortOption === 'dateDesc') return b.updatedAt - a.updatedAt;
            if (sortOption === 'dateAsc') return a.updatedAt - b.updatedAt;
            if (sortOption === 'titleAsc') return a.title.localeCompare(b.title);
            return 0;
        });

        return result;
    }, [netaList, searchQuery, sortOption]);

    const handleCreateNew = () => {
        const newId = Date.now().toString();
        router.push({ pathname: '/editor', params: { id: newId } });
    };

    const handleDeleteItem = (id: string) => {
        Alert.alert('削除', 'このネタを削除しますか？', [
            { text: 'キャンセル', style: 'cancel' },
            {
                text: '削除',
                style: 'destructive',
                onPress: async () => {
                    await AsyncStorage.removeItem(`manzai_script_${id}`);
                    loadNetaList();
                },
            },
        ]);
    };

    // --- 設定モーダル ---
    const renderSettingsModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isSettingsVisible}
            onRequestClose={() => setSettingsVisible(false)}
        >
            <TouchableWithoutFeedback onPress={() => setSettingsVisible(false)}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>設定</Text>
                                <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                                    <X size={24} color={colors.subText} />
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.sectionTitle, { color: colors.subText }]}>外観モード</Text>

                            {(['light', 'dark', 'system'] as const).map((mode) => (
                                <TouchableOpacity
                                    key={mode}
                                    style={[styles.settingRow, { borderBottomColor: colors.border }]}
                                    onPress={() => setTheme(mode)}
                                >
                                    <Text style={[styles.settingText, { color: colors.text }]}>
                                        {mode === 'light' ? 'ライトモード' : mode === 'dark' ? 'ダークモード' : '端末の設定に合わせる'}
                                    </Text>
                                    {theme === mode && <Check size={20} color={colors.tint} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    const renderItem = ({ item }: { item: NetaSummary }) => (
        <TouchableOpacity
            style={[styles.itemContainer, { backgroundColor: colors.card }]}
            onPress={() => router.push({ pathname: '/editor', params: { id: item.id } })}
            activeOpacity={0.7}
        >
            <View style={styles.itemContent}>
                <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.itemDate, { color: colors.subText }]}>
                    {new Date(item.updatedAt).toLocaleDateString()}
                </Text>
            </View>
            <View style={styles.itemActions}>
                <TouchableOpacity onPress={() => handleDeleteItem(item.id)} style={styles.deleteButton}>
                    <Trash2 size={20} color={colors.subText} />
                </TouchableOpacity>
                <ChevronRight size={20} color={colors.subText} />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* ヘッダー */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>ネタ帳</Text>
                <TouchableOpacity onPress={() => setSettingsVisible(true)} style={styles.iconButton}>
                    <Settings size={24} color={colors.tint} />
                </TouchableOpacity>
            </View>

            {/* 検索バー & 並び替え */}
            <View style={[styles.filterContainer, { backgroundColor: colors.bg }]}>
                <View style={[styles.searchBar, { backgroundColor: colors.inputBg }]}>
                    <Search size={18} color={colors.subText} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="ネタを検索..."
                        placeholderTextColor={colors.subText}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <X size={16} color={colors.subText} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    style={[styles.sortButton, { backgroundColor: colors.card }]}
                    onPress={() => setSortOption(prev =>
                        prev === 'dateDesc' ? 'dateAsc' : prev === 'dateAsc' ? 'titleAsc' : 'dateDesc'
                    )}
                >
                    <SlidersHorizontal size={20} color={colors.tint} />
                    <Text style={[styles.sortButtonText, { color: colors.tint }]}>
                        {sortOption === 'dateDesc' ? '新しい順' : sortOption === 'dateAsc' ? '古い順' : '名前順'}
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredAndSortedList}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: colors.text }]}>ネタが見つかりません</Text>
                        <Text style={[styles.emptySubText, { color: colors.subText }]}>
                            {searchQuery ? "検索条件を変更してください" : "右下の＋ボタンから作成しましょう"}
                        </Text>
                    </View>
                }
            />

            <TouchableOpacity style={styles.fab} onPress={handleCreateNew}>
                <Plus size={32} color="#fff" />
            </TouchableOpacity>

            {renderSettingsModal()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold' },
    iconButton: { padding: 4 },
    filterContainer: {
        padding: 12,
        gap: 12,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 40,
        flex: 1,
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 16, height: '100%' },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 10,
        gap: 6,
        marginTop: 4,
    },
    sortButtonText: { fontSize: 14, fontWeight: '600' },
    listContent: { padding: 16, paddingBottom: 100 },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    itemContent: { flex: 1, marginRight: 8 },
    itemTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    itemDate: { fontSize: 12 },
    itemActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    deleteButton: { padding: 4 },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyText: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
    emptySubText: { fontSize: 14 },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    sectionTitle: { fontSize: 13, marginBottom: 8, fontWeight: '600' },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    settingText: { fontSize: 16 },
});