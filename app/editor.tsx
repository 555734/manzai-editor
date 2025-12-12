import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Clock, MoveHorizontal, Share as ShareIcon, Trash2 } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    BackHandler,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme // ★追加: テーマ取得用
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- 定数・型定義 ---
// 役割ごとの色はダークモードでも視認性が良いため維持しますが、
// 必要であれば isDark フラグで分岐させて調整も可能です。
const ROLES = {
    BOKE: { id: 'boke', label: 'ボケ', color: '#E3F2FD', textColor: '#1565C0', align: 'flex-start' },
    TSUKKOMI: { id: 'tsukkomi', label: 'ツッコミ', color: '#FFEBEE', textColor: '#C62828', align: 'flex-end' },
    ACTION: { id: 'action', label: 'ト書き', color: '#F5F5F5', textColor: '#616161', align: 'center' },
};

// ダークモード時のト書きの色調整（背景が暗いと #F5F5F5 は眩しいため）
const DARK_ACTION_COLOR = '#333333';
const DARK_ACTION_TEXT_COLOR = '#AAAAAA';

const calculateDuration = (text, type) => {
    if (type === 'action') return 3;
    const charPerSec = 5;
    return Math.ceil(text.length / charPerSec);
};

const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function EditorScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const STORAGE_KEY = `manzai_script_${id}`;

    // ★追加: ダークモード判定
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // ★テーマカラー定義
    const theme = {
        background: isDark ? '#151718' : '#fff', // 背景色（ダーク時はグレー）
        text: isDark ? '#ECEDEE' : '#333',       // 文字色
        headerBg: isDark ? '#151718' : '#fff',   // ヘッダー背景
        headerBorder: isDark ? '#333' : '#eee',  // ヘッダー境界線
        inputBg: isDark ? '#2C2C2E' : '#f5f5f5', // 入力欄背景
        placeholder: isDark ? '#666' : '#ccc',   // プレースホルダー色
        listAreaBg: isDark ? '#000' : '#f9f9f9', // リストエリア背景
    };

    const [title, setTitle] = useState('');
    const [lines, setLines] = useState([]);
    const [inputText, setInputText] = useState('');
    const [currentRole, setCurrentRole] = useState('boke');

    const flatListRef = useRef(null);

    const safeLines = Array.isArray(lines) ? lines : [];
    const totalDuration = safeLines.reduce((acc, line) => acc + (line.duration || 0), 0);

    const forceGoHome = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/');
        }
        return true;
    };

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', forceGoHome);
        return () => backHandler.remove();
    }, []);

    useEffect(() => {
        const loadData = async () => {
            try {
                if (!id) return;
                const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
                if (jsonValue != null) {
                    const parsed = JSON.parse(jsonValue);
                    if (Array.isArray(parsed)) {
                        setLines(parsed);
                        setTitle(parsed.length > 0 ? parsed[0].text : '無題のネタ');
                    } else if (parsed && typeof parsed === 'object') {
                        setTitle(parsed.title || '');
                        setLines(Array.isArray(parsed.lines) ? parsed.lines : []);
                    }
                } else {
                    setTitle('無題のネタ');
                }
            } catch (e) {
                console.error("読み込みエラー", e);
            }
        };
        loadData();
    }, [id]);

    useEffect(() => {
        const saveData = async () => {
            try {
                if (!id) return;
                const dataToSave = {
                    title: title,
                    lines: safeLines
                };
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
            } catch (e) {
                console.error("保存エラー", e);
            }
        };
        saveData();
    }, [lines, title, id]);

    const handleAddLine = () => {
        if (!inputText.trim()) return;

        const newLine = {
            id: Date.now().toString(),
            type: currentRole,
            text: inputText,
            duration: calculateDuration(inputText, currentRole),
        };

        setLines(prev => {
            const current = Array.isArray(prev) ? prev : [];
            return [...current, newLine];
        });
        setInputText('');

        if (currentRole === 'boke') setCurrentRole('tsukkomi');
        if (currentRole === 'tsukkomi') setCurrentRole('boke');

        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const handleDeleteLine = (id) => {
        setLines(prev => {
            const current = Array.isArray(prev) ? prev : [];
            return current.filter(line => line.id !== id);
        });
    };

    const handleClearAll = () => {
        Alert.alert(
            "全消去",
            "このネタの中身を全て消しますか？",
            [
                { text: "キャンセル", style: "cancel" },
                { text: "消去", style: "destructive", onPress: () => setLines([]) }
            ]
        );
    };

    const handleShare = async () => {
        if (safeLines.length === 0) {
            Alert.alert("エラー", "共有する内容がありません。");
            return;
        }

        const formattedText = safeLines.map(line => {
            const roleLabel = ROLES[line.type.toUpperCase()]?.label || '';
            const text = line.type === 'action' ? `（${line.text}）` : line.text;
            return `${roleLabel}：${text}`;
        }).join('\n\n');

        const shareMessage = `【${title}】\n\n${formattedText}\n\n#ManzaiEditor`;

        try {
            await Share.share({
                message: shareMessage,
                title: title,
            });
        } catch (error) {
            Alert.alert(error.message);
        }
    };

    const renderItem = ({ item }) => {
        const roleConfig = ROLES[item.type.toUpperCase()];
        const isAction = item.type === 'action';
        if (!roleConfig) return null;

        // ダークモード時のト書きの色調整
        const bubbleColor = isDark && isAction ? DARK_ACTION_COLOR : roleConfig.color;
        const textColor = isDark && isAction ? DARK_ACTION_TEXT_COLOR : roleConfig.textColor;

        return (
            <View style={[styles.lineWrapper, { justifyContent: roleConfig.align }]}>
                {!isAction && <Text style={styles.roleLabel}>{roleConfig.label}</Text>}
                <View style={[styles.bubble, { backgroundColor: bubbleColor }]}>
                    <Text style={[styles.bubbleText, { color: textColor, fontStyle: isAction ? 'italic' : 'normal' }]}>
                        {isAction ? `（${item.text}）` : item.text}
                    </Text>
                </View>
                <View style={styles.metaContainer}>
                    {/* ★変更: 時間表示を削除しました */}
                    <TouchableOpacity onPress={() => handleDeleteLine(item.id)} hitSlop={10}>
                        <Trash2 size={14} color={isDark ? "#666" : "#ccc"} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.headerBorder }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={forceGoHome} style={styles.backButton}>
                        <ChevronLeft size={28} color="#007AFF" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <TextInput
                            style={[styles.titleInput, { color: theme.text }]}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="タイトルを入力"
                            placeholderTextColor={theme.placeholder}
                        />
                        <View style={styles.timerBadge}>
                            <Clock size={12} color="#fff" />
                            <Text style={styles.timerText}>{formatTime(totalDuration)} / 04:00</Text>
                        </View>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 4 }}>
                    <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                        <ShareIcon size={20} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={handleClearAll}>
                        <Trash2 size={20} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={safeLines}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                style={[styles.listArea, { backgroundColor: theme.listAreaBg }]}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
                style={[styles.inputContainer, { backgroundColor: theme.background, borderTopColor: theme.headerBorder }]}
            >
                <View style={styles.roleTabs}>
                    <TouchableOpacity
                        style={[styles.roleTab, currentRole === 'boke' && styles.roleTabActiveBoke]}
                        onPress={() => setCurrentRole('boke')}
                    >
                        <Text style={[styles.roleTabText, currentRole === 'boke' && styles.roleTabTextActive]}>ボケ</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.roleTab, currentRole === 'tsukkomi' && styles.roleTabActiveTsukkomi]}
                        onPress={() => setCurrentRole('tsukkomi')}
                    >
                        <Text style={[styles.roleTabText, currentRole === 'tsukkomi' && styles.roleTabTextActive]}>ツッコミ</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.roleTab,
                            // ダークモード時のト書きタブの色調整
                            currentRole === 'action' && { backgroundColor: isDark ? '#333' : '#eee', borderColor: isDark ? '#555' : '#ccc', borderWidth: 1 }
                        ]}
                        onPress={() => setCurrentRole('action')}
                    >
                        <Text style={[
                            styles.roleTabText,
                            currentRole === 'action' && { color: isDark ? '#fff' : '#333' }
                        ]}>ト書き</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.inputBar}>
                    <TextInput
                        style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text }]}
                        placeholder={`${ROLES[currentRole.toUpperCase()].label}を入力...`}
                        placeholderTextColor={theme.placeholder}
                        value={inputText}
                        onChangeText={setInputText}
                        returnKeyType="send"
                        onSubmitEditing={handleAddLine}
                        blurOnSubmit={false}
                    />
                    <TouchableOpacity onPress={handleAddLine} style={styles.sendButton}>
                        <MoveHorizontal size={24} color="#007AFF" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 12, borderBottomWidth: 1,
        paddingTop: Platform.OS === 'android' ? 40 : 12,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
    backButton: { marginRight: 8, padding: 4 },
    titleInput: {
        fontSize: 16,
        fontWeight: 'bold',
        paddingVertical: 4,
        paddingHorizontal: 0,
        maxWidth: '100%',
    },
    timerBadge: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#333',
        paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8, alignSelf: 'flex-start', marginTop: 2,
    },
    timerText: { color: '#fff', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
    iconButton: { padding: 8 },
    listArea: { flex: 1 },
    listContent: { padding: 16, paddingBottom: 20 },
    lineWrapper: { marginBottom: 16, maxWidth: '100%' },
    roleLabel: { fontSize: 10, color: '#999', marginBottom: 2, marginHorizontal: 4 },
    bubble: { padding: 12, borderRadius: 16, maxWidth: '85%' },
    bubbleText: { fontSize: 16, lineHeight: 24 },
    metaContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginHorizontal: 4, justifyContent: 'flex-end', gap: 8 },
    // durationText は削除したのでスタイルも不要ですが、念のため残しておいても害はありません
    durationText: { fontSize: 10, color: '#aaa' },
    inputContainer: { borderTopWidth: 1 },
    roleTabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, gap: 8 },
    roleTab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f0f0f0' },
    roleTabActiveBoke: { backgroundColor: '#E3F2FD' },
    roleTabActiveTsukkomi: { backgroundColor: '#FFEBEE' },
    // roleTabActiveAction は条件付きスタイルに移行したため削除してもよいですが、デフォルト値として残存
    roleTabActiveAction: { backgroundColor: '#eeeeee', borderWidth: 1, borderColor: '#ccc' },
    roleTabText: { fontSize: 12, fontWeight: 'bold', color: '#666' },
    roleTabTextActive: { color: '#333' },
    inputBar: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
    textInput: { flex: 1, height: 44, borderRadius: 22, paddingHorizontal: 16, fontSize: 16 },
    sendButton: { padding: 8 },
});