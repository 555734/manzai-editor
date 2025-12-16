import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, Search, Settings } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/context/ThemeContext';

type Line = {
    id: string;
    text: string;
};

type ScriptData = {
    id: string; // IDはファイル名やkeyから取得
    title: string;
    lines: Line[];
    updatedAt: number;
};

export default function HomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { effectiveColorScheme } = useAppTheme();
    const isDark = effectiveColorScheme === 'dark';

    // テーマ設定
    const theme = {
        background: isDark ? '#1F2329' : '#F5F5F5',
        headerBg: isDark ? '#2B2E35' : '#FFFFFF',
        headerText: isDark ? '#F5F5F5' : '#000000',
        cardBg: isDark ? '#2B2E35' : '#FFFFFF',
        text: isDark ? '#F5F5F5' : '#333333',
        subText: isDark ? '#AAAAAA' : '#888888',
        placeholder: isDark ? '#666666' : '#CCCCCC',
        border: isDark ? '#3A3F45' : '#E0E0E0',
        fab: '#007AFF',
    };

    const [scripts, setScripts] = useState<ScriptData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false); // 検索モードの切り替え

    // 画面が表示されるたびにデータを読み込む
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

            const loadedScripts: ScriptData[] = result.map(([key, value]) => {
                if (!value) return null;
                const parsed = JSON.parse(value);
                // IDをキーから抽出 (manzai_script_UUID)
                const id = key.replace('manzai_script_', '');
                return { ...parsed, id };
            }).filter((item): item is ScriptData => item !== null);

            // 更新日時順（新しい順）にソート
            loadedScripts.sort((a, b) => b.updatedAt - a.updatedAt);
            setScripts(loadedScripts);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        // 新規IDを生成してエディタへ（エディタ側で保存時にIDが確定される想定の場合はIDなしで遷移など、実装による）
        // ここではエディタ側でIDが無い場合に新規作成するロジックに合わせて空IDまたは新規UUIDを渡す
        // editor.tsxのロジックに合わせて、ここではパラメータなし（新規）で遷移させます
        // もしIDが必要なら: router.push(`/editor?id=${uuidv4()}`);
        // editor.tsxの実装を見ると、idが無い場合は保存されない/またはeditor内で生成？
        // editor.tsxの修正版では id が必須のような動き（AsyncStorageのキーにid使用）なので、
        // ここでIDを作って渡すのが安全です。
        const newId = require('uuid').v4(); // uuidをimportするか、簡易生成
        router.push(`/editor?id=${newId}`);
    };

    const filteredScripts = scripts.filter(script =>
        script.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }: { item: ScriptData }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
            onPress={() => router.push(`/editor?id=${item.id}`)}
            activeOpacity={0.7}
        >
            <View>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                    {item.title || '無題のネタ'}
                </Text>
                <Text style={[styles.cardDate, { color: theme.subText }]}>
                    {new Date(item.updatedAt).toLocaleDateString()} {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
            <View style={styles.cardArrow}>
                <Text style={{ color: theme.subText, fontSize: 18 }}>›</Text>
            </View>
        </TouchableOpacity>
    );

    // ヘッダーの高さを計算
    const headerPaddingTop = Math.max(insets.top, 0);
    const headerHeight = headerPaddingTop + 56;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View style={[styles.header, {
                height: headerHeight,
                paddingTop: headerPaddingTop,
                backgroundColor: theme.headerBg,
                borderBottomColor: theme.border
            }]}>
                {isSearchActive ? (
                    // 検索モード時のヘッダー
                    <View style={styles.searchBarContainer}>
                        <View style={[styles.searchInputWrapper, { backgroundColor: theme.background }]}>
                            <Search size={20} color={theme.subText} />
                            <TextInput
                                style={[styles.searchInput, { color: theme.text }]}
                                placeholder="ネタを検索..."
                                placeholderTextColor={theme.placeholder}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                        </View>
                        <TouchableOpacity onPress={() => {
                            setIsSearchActive(false);
                            setSearchQuery('');
                        }} style={styles.cancelButton}>
                            <Text style={{ color: theme.fab }}>キャンセル</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    // 通常時のヘッダー
                    <View style={styles.headerContent}>
                        <Text style={[styles.headerTitle, { color: theme.headerText }]}>ネタ帳</Text>

                        <View style={styles.headerRightIcons}>
                            {/* 検索アイコン: 大きくして(28)、設定の横に配置 */}
                            <TouchableOpacity
                                onPress={() => setIsSearchActive(true)}
                                style={styles.iconButton}
                            >
                                <Search size={28} color={theme.headerText} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => router.push('/modal')} // 設定画面へのパス（既存ファイル構成に基づく）
                                style={styles.iconButton}
                            >
                                <Settings size={28} color={theme.headerText} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            {/* List */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.fab} />
                </View>
            ) : (
                <FlatList
                    data={filteredScripts}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={{ color: theme.subText, marginTop: 40 }}>
                                {searchQuery ? '見つかりませんでした' : 'ネタがまだありません\n右下の＋ボタンで作成'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* FAB (新規作成ボタン) */}
            {!isSearchActive && (
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: theme.fab, bottom: Math.max(insets.bottom, 20) + 10 }]}
                    onPress={handleCreateNew}
                    activeOpacity={0.8}
                >
                    <Plus size={32} color="#fff" />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        justifyContent: 'center',
        borderBottomWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    headerTitle: {
        fontSize: 22, // タイトルを見やすく大きく
        fontWeight: 'bold',
    },
    headerRightIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8, // アイコン間のスペース
    },
    iconButton: {
        padding: 8,
    },
    // Search Bar Styles
    searchBarContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 12,
    },
    searchInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 36,
        borderRadius: 18,
        paddingHorizontal: 12,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        height: '100%',
        padding: 0, // Androidのデフォルトパディングを除去
    },
    cancelButton: {
        padding: 4,
    },
    // List Styles
    listContent: {
        padding: 16,
        paddingBottom: 100, // FABの分空ける
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 4,
    },
    cardDate: {
        fontSize: 12,
    },
    cardArrow: {
        marginLeft: 8,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fab: {
        position: 'absolute',
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
});