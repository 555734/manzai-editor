import AsyncStorage from '@react-native-async-storage/async-storage'; // 追加: 保存用
import { Clock, MoveHorizontal, Save, Trash2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// --- 定数・型定義 ---
const ROLES = {
    BOKE: { id: 'boke', label: 'ボケ', color: '#E3F2FD', textColor: '#1565C0', align: 'flex-start' },
    TSUKKOMI: { id: 'tsukkomi', label: 'ツッコミ', color: '#FFEBEE', textColor: '#C62828', align: 'flex-end' },
    ACTION: { id: 'action', label: 'ト書き', color: '#F5F5F5', textColor: '#616161', align: 'center' },
};

const STORAGE_KEY = 'manzai_draft_data'; // 保存用のキー

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

export default function App() {
    const [lines, setLines] = useState([]);
    const [inputText, setInputText] = useState('');
    const [currentRole, setCurrentRole] = useState('boke');

    const flatListRef = useRef(null);
    const totalDuration = lines.reduce((acc, line) => acc + line.duration, 0);

    // --- 保存・読み込みロジック (追加箇所) ---

    // 1. アプリ起動時にデータを読み込む
    useEffect(() => {
        const loadData = async () => {
            try {
                const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
                if (jsonValue != null) {
                    setLines(JSON.parse(jsonValue));
                }
            } catch (e) {
                console.error("読み込みエラー", e);
            }
        };
        loadData();
    }, []);

    // 2. データが変更されるたびに自動保存する
    useEffect(() => {
        const saveData = async () => {
            try {
                const jsonValue = JSON.stringify(lines);
                await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
            } catch (e) {
                console.error("保存エラー", e);
            }
        };
        // 初回レンダリング時の空保存を防ぐため、linesに中身があるか、
        // あるいは意図的に空にした場合のみ保存する制御を入れても良いが、
        // MVPなのでシンプルに毎回保存する
        saveData();
    }, [lines]);


    const handleAddLine = () => {
        if (!inputText.trim()) return;

        const newLine = {
            id: Date.now().toString(),
            type: currentRole,
            text: inputText,
            duration: calculateDuration(inputText, currentRole),
        };

        setLines([...lines, newLine]);
        setInputText('');

        if (currentRole === 'boke') setCurrentRole('tsukkomi');
        if (currentRole === 'tsukkomi') setCurrentRole('boke');

        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const handleDeleteLine = (id) => {
        setLines(lines.filter(line => line.id !== id));
    };

    // 全消去機能（長押し用）
    const handleClearAll = () => {
        Alert.alert(
            "全消去",
            "ネタを全て消しますか？",
            [
                { text: "キャンセル", style: "cancel" },
                {
                    text: "消去",
                    style: "destructive",
                    onPress: () => setLines([])
                }
            ]
        );
    };

    const renderItem = ({ item }) => {
        const roleConfig = ROLES[item.type.toUpperCase()];
        const isAction = item.type === 'action';

        return (
            <View style={[styles.lineWrapper, { justifyContent: roleConfig.align }]}>
                {!isAction && (
                    <Text style={styles.roleLabel}>{roleConfig.label}</Text>
                )}
                <View style={[styles.bubble, { backgroundColor: roleConfig.color }]}>
                    <Text style={[styles.bubbleText, { color: roleConfig.textColor, fontStyle: isAction ? 'italic' : 'normal' }]}>
                        {isAction ? `（${item.text}）` : item.text}
                    </Text>
                </View>
                <View style={styles.metaContainer}>
                    <Text style={styles.durationText}>{item.duration}秒</Text>
                    <TouchableOpacity onPress={() => handleDeleteLine(item.id)} hitSlop={10}>
                        <Trash2 size={14} color="#ccc" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* --- ヘッダー --- */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>新作漫才ネタ</Text>
                    <View style={styles.timerBadge}>
                        <Clock size={14} color="#fff" />
                        <Text style={styles.timerText}>{formatTime(totalDuration)} / 04:00</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={styles.iconButton} onPress={handleClearAll}>
                        <Trash2 size={20} color="#FF3B30" />
                    </TouchableOpacity>
                    {/* 保存は自動ですが、安心感のためにアイコンだけ置いておくのもアリ */}
                    <View style={styles.iconButton}>
                        <Save size={20} color="#34C759" />
                    </View>
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={lines}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                style={styles.listArea}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
                style={styles.inputContainer}
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
                        style={[styles.roleTab, currentRole === 'action' && styles.roleTabActiveAction]}
                        onPress={() => setCurrentRole('action')}
                    >
                        <Text style={[styles.roleTabText, currentRole === 'action' && styles.roleTabTextActive]}>ト書き</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.inputBar}>
                    <TextInput
                        style={styles.textInput}
                        placeholder={`${ROLES[currentRole.toUpperCase()].label}を入力...`}
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
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'android' ? 40 : 16, // Androidのステータスバー対策
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#333',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    timerText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    iconButton: {
        padding: 8,
    },
    listArea: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    listContent: {
        padding: 16,
        paddingBottom: 20,
    },
    lineWrapper: {
        marginBottom: 16,
        maxWidth: '100%',
    },
    roleLabel: {
        fontSize: 10,
        color: '#999',
        marginBottom: 2,
        marginHorizontal: 4,
    },
    bubble: {
        padding: 12,
        borderRadius: 16,
        maxWidth: '85%',
    },
    bubbleText: {
        fontSize: 16,
        lineHeight: 24,
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        marginHorizontal: 4,
        justifyContent: 'flex-end',
        gap: 8,
    },
    durationText: {
        fontSize: 10,
        color: '#aaa',
    },
    inputContainer: {
        borderTopWidth: 1,
        borderTopColor: '#eee',
        backgroundColor: '#fff',
    },
    roleTabs: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 8,
        gap: 8,
    },
    roleTab: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    roleTabActiveBoke: { backgroundColor: '#E3F2FD' },
    roleTabActiveTsukkomi: { backgroundColor: '#FFEBEE' },
    roleTabActiveAction: { backgroundColor: '#eeeeee', borderWidth: 1, borderColor: '#ccc' },
    roleTabText: { fontSize: 12, fontWeight: 'bold', color: '#666' },
    roleTabTextActive: { color: '#333' },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 8,
    },
    textInput: {
        flex: 1,
        height: 44,
        backgroundColor: '#f5f5f5',
        borderRadius: 22,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    sendButton: {
        padding: 8,
    },
});