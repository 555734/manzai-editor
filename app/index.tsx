import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight, Plus, Trash2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type NetaSummary = {
    id: string;
    title: string;
    updatedAt: number;
};

export default function IndexScreen() {
    const router = useRouter();
    const [netaList, setNetaList] = useState<NetaSummary[]>([]);

    // 画面が表示されるたびにデータを読み込む
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
                const lines = value ? JSON.parse(value) : [];
                // 1行目をタイトルにする。なければ「無題」
                const title = lines.length > 0 ? lines[0].text : '無題のネタ';
                return {
                    id,
                    title,
                    updatedAt: parseInt(id) || 0, // IDがタイムスタンプの場合
                };
            });

            // 新しい順に並び替え
            list.sort((a, b) => b.updatedAt - a.updatedAt);
            setNetaList(list);
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreateNew = () => {
        const newId = Date.now().toString();
        router.push({ pathname: '/editor', params: { id: newId } });
    };

    const handlePressItem = (id: string) => {
        router.push({ pathname: '/editor', params: { id } });
    };

    const handleDeleteItem = (id: string) => {
        Alert.alert('削除', 'このネタを削除しますか？', [
            { text: 'キャンセル', style: 'cancel' },
            {
                text: '削除',
                style: 'destructive',
                onPress: async () => {
                    await AsyncStorage.removeItem(`manzai_script_${id}`);
                    loadNetaList(); // リスト更新
                },
            },
        ]);
    };

    const renderItem = ({ item }: { item: NetaSummary }) => (
        <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => handlePressItem(item.id)}
            activeOpacity={0.7}
        >
            <View style={styles.itemContent}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={styles.itemDate}>
                    {new Date(item.updatedAt).toLocaleDateString()}
                </Text>
            </View>

            <View style={styles.itemActions}>
                <TouchableOpacity
                    onPress={() => handleDeleteItem(item.id)}
                    style={styles.deleteButton}
                    hitSlop={10}
                >
                    <Trash2 size={20} color="#ccc" />
                </TouchableOpacity>
                <ChevronRight size={20} color="#ccc" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>ネタ帳</Text>
            </View>

            <FlatList
                data={netaList}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>ネタがまだありません</Text>
                        <Text style={styles.emptySubText}>右下の＋ボタンから作成しましょう</Text>
                    </View>
                }
            />

            {/* FAB (Floating Action Button) */}
            <TouchableOpacity style={styles.fab} onPress={handleCreateNew}>
                <Plus size={32} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    header: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#000',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100, // FABの分を空ける
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        // 影の設定
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    itemContent: {
        flex: 1,
        marginRight: 8,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
        color: '#333',
    },
    itemDate: {
        fontSize: 12,
        color: '#8E8E93',
    },
    itemActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    deleteButton: {
        padding: 4,
    },
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
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: '#999',
    },
});