import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import debounce from 'lodash.debounce';
import { ChevronLeft, Clock, GripVertical, MoveHorizontal, Share as ShareIcon, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    BackHandler,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { v4 as uuidv4 } from 'uuid';

import { DARK_THEME_ACTION_COLORS, ROLES } from '@/constants/Roles';
import { useAppTheme } from '@/context/ThemeContext';

type RoleType = 'boke' | 'tsukkomi' | 'action';

type Line = {
    id: string;
    type: RoleType;
    text: string;
    duration: number;
};

type SaveData = {
    title: string;
    lines: Line[];
    updatedAt: number;
};

const calculateDuration = (text: string, type: string) => {
    if (type === 'action') return 3;
    const charPerSec = 5;
    return Math.ceil(text.length / charPerSec);
};

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function EditorScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const STORAGE_KEY = `manzai_script_${id}`;

    const { effectiveColorScheme } = useAppTheme();
    const isDark = effectiveColorScheme === 'dark';

    const theme = {
        background: isDark ? '#151718' : '#fff',
        text: isDark ? '#ECEDEE' : '#333',
        headerBg: isDark ? '#151718' : '#fff',
        headerBorder: isDark ? '#333' : '#eee',
        inputBg: isDark ? '#2C2C2E' : '#f5f5f5',
        placeholder: isDark ? '#666' : '#ccc',
        listAreaBg: isDark ? '#000' : '#f9f9f9',
    };

    const [title, setTitle] = useState('');
    const [lines, setLines] = useState<Line[]>([]);
    const [inputText, setInputText] = useState('');
    const [currentRole, setCurrentRole] = useState<RoleType>('boke');

    const [isDurationModalVisible, setDurationModalVisible] = useState(false);
    const [editingLineId, setEditingLineId] = useState<string | null>(null);
    const [tempDuration, setTempDuration] = useState('');

    const flatListRef = useRef<any>(null);
    const viewRef = useRef<View>(null);

    const totalDuration = lines.reduce((acc, line) => acc + (line.duration || 0), 0);

    // ヘッダーの高さを計算 (パディング + コンテンツの概算高さ)
    // paddingVertical: 12 + アイコンサイズなど。Topはinsets分確保
    const headerPaddingTop = Math.max(insets.top, 12) + 10;
    const headerContentHeight = 44; // アイコンや入力欄の高さ
    const headerTotalHeight = headerPaddingTop + headerContentHeight + 24; // 余白余裕

    const debouncedSave = useMemo(
        () => debounce(async (currentId: string, currentTitle: string, currentLines: Line[]) => {
            try {
                if (!currentId) return;
                const dataToSave: SaveData = {
                    title: currentTitle,
                    lines: currentLines,
                    updatedAt: Date.now(),
                };
                await AsyncStorage.setItem(`manzai_script_${currentId}`, JSON.stringify(dataToSave));
                console.log('Saved');
            } catch (e) {
                console.error(e);
            }
        }, 1000),
        []
    );

    useEffect(() => {
        if (id) {
            debouncedSave(id as string, title, lines);
        }
    }, [lines, title, id, debouncedSave]);

    useEffect(() => {
        const loadData = async () => {
            try {
                if (!id) return;
                const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
                if (jsonValue != null) {
                    const parsed = JSON.parse(jsonValue);
                    if (parsed && typeof parsed === 'object') {
                        setTitle(parsed.title || '無題のネタ');
                        setLines(Array.isArray(parsed.lines) ? parsed.lines : []);
                    } else if (Array.isArray(parsed)) {
                        setLines(parsed);
                        setTitle(parsed.length > 0 ? parsed[0].text : '無題のネタ');
                    }
                } else {
                    setTitle('無題のネタ');
                }
            } catch (e) {
                console.error(e);
            }
        };
        loadData();
    }, [id]);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (router.canGoBack()) router.back();
            else router.replace('/');
            return true;
        });
        return () => backHandler.remove();
    }, []);

    const handleAddLine = () => {
        if (!inputText.trim()) return;

        const newLine: Line = {
            id: uuidv4(),
            type: currentRole,
            text: inputText,
            duration: calculateDuration(inputText, currentRole),
        };

        setLines(prev => [...prev, newLine]);
        setInputText('');

        if (currentRole === 'boke') setCurrentRole('tsukkomi');
        if (currentRole === 'tsukkomi') setCurrentRole('boke');

        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const handleDeleteLine = (lineId: string) => {
        setLines(prev => prev.filter(line => line.id !== lineId));
    };

    const handleClearAll = () => {
        Alert.alert("全消去", "全て消しますか？", [
            { text: "キャンセル", style: "cancel" },
            { text: "消去", style: "destructive", onPress: () => setLines([]) }
        ]);
    };

    const handleShareText = async () => {
        if (lines.length === 0) return;
        const formattedText = lines.map(line => {
            const roleLabel = ROLES[line.type.toUpperCase() as keyof typeof ROLES]?.label || '';
            const text = line.type === 'action' ? `（${line.text}）` : line.text;
            return `${roleLabel}：${text}`;
        }).join('\n\n');

        try {
            await Share.share({ message: `【${title}】\n\n${formattedText}` });
        } catch (error) { console.error(error); }
    };

    const handleShareImage = async () => {
        try {
            if (!viewRef.current) return;
            const uri = await captureRef(viewRef, {
                format: 'jpg',
                quality: 0.8,
                result: 'tmpfile'
            });
            await Share.share({ url: uri, title: title });
        } catch (e) {
            Alert.alert("エラー", "画像の生成に失敗しました");
            console.error(e);
        }
    };

    const showShareOptions = () => {
        Alert.alert(
            "共有",
            "形式を選択してください",
            [
                { text: "テキストで送る", onPress: handleShareText },
                { text: "画像で送る", onPress: handleShareImage },
                { text: "キャンセル", style: "cancel" }
            ]
        );
    };

    const openDurationModal = (line: Line) => {
        setEditingLineId(line.id);
        setTempDuration(line.duration.toString());
        setDurationModalVisible(true);
    };

    const saveDuration = () => {
        const newDuration = parseInt(tempDuration, 10);
        if (!isNaN(newDuration) && editingLineId) {
            setLines(prev => prev.map(line =>
                line.id === editingLineId ? { ...line, duration: newDuration } : line
            ));
        }
        setDurationModalVisible(false);
        setEditingLineId(null);
    };

    const renderItem = useCallback(({ item }: { item: Line }) => {
        const roleKey = item.type.toUpperCase() as keyof typeof ROLES;
        const roleConfig = ROLES[roleKey];
        const isAction = item.type === 'action';

        const bubbleColor = isDark && isAction ? DARK_THEME_ACTION_COLORS.bubble : roleConfig.color;
        const textColor = isDark && isAction ? DARK_THEME_ACTION_COLORS.text : roleConfig.textColor;

        return (
            <TouchableOpacity
                activeOpacity={0.8}
                style={[
                    styles.lineWrapper,
                    { alignItems: roleConfig.align }
                ]}
            >
                {!isAction && <Text style={styles.roleLabel}>{roleConfig.label}</Text>}

                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                    {roleConfig.align === 'flex-start' && (
                        <View style={{ padding: 4, opacity: 0.3 }}>
                            <GripVertical size={20} color="#ccc" />
                        </View>
                    )}

                    <View style={[styles.bubble, { backgroundColor: bubbleColor }]}>
                        <Text style={[styles.bubbleText, { color: textColor, fontStyle: isAction ? 'italic' : 'normal' }]}>
                            {isAction ? `（${item.text}）` : item.text}
                        </Text>
                    </View>

                    {roleConfig.align === 'flex-end' && (
                        <View style={{ padding: 4, opacity: 0.3 }}>
                            <GripVertical size={20} color="#ccc" />
                        </View>
                    )}
                </View>

                <View style={[styles.metaContainer, { justifyContent: roleConfig.align === 'flex-end' ? 'flex-end' : 'flex-start' }]}>
                    {isAction ? (
                        <TouchableOpacity onPress={() => openDurationModal(item)} style={styles.durationButton}>
                            <Clock size={10} color="#666" />
                            <Text style={styles.durationText}>{item.duration}秒 (変更)</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.durationText}>{item.duration}秒</Text>
                    )}
                    <TouchableOpacity onPress={() => handleDeleteLine(item.id)} hitSlop={10} style={{ marginLeft: 8 }}>
                        <Trash2 size={14} color={isDark ? "#666" : "#ccc"} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    }, [isDark]);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* ヘッダーはKeyboardAvoidingViewの外に配置 */}
            <View style={[styles.header, {
                backgroundColor: theme.headerBg,
                borderBottomColor: theme.headerBorder,
                paddingTop: headerPaddingTop,
                height: headerTotalHeight, // 高さを固定
            }]}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButton}>
                    <ChevronLeft size={28} color="#007AFF" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <TextInput
                        style={[styles.titleInput, { color: theme.text }]}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="タイトル未設定"
                        placeholderTextColor={theme.placeholder}
                    />
                    <View style={styles.timerBadge}>
                        <Clock size={12} color="#fff" />
                        <Text style={styles.timerText}>{formatTime(totalDuration)} / 04:00</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                    <TouchableOpacity style={styles.iconButton} onPress={showShareOptions}>
                        <ShareIcon size={20} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={handleClearAll}>
                        <Trash2 size={20} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* AndroidとiOS両方に対応するためのKeyboardAvoidingView設定
               Headerを外に出したので、offsetはHeaderの高さ分を指定する
            */}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? headerTotalHeight : 0}
            >
                <View
                    ref={viewRef}
                    collapsable={false}
                    style={{ flex: 1, backgroundColor: theme.listAreaBg }}
                >
                    <FlatList
                        ref={flatListRef}
                        data={lines}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={[styles.listContent, { paddingBottom: 20 }]} // paddingBottomを少し減らす
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        style={{ flex: 1 }}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', marginTop: 40 }}>
                                <Text style={{ color: theme.placeholder }}>ネタがまだありません</Text>
                            </View>
                        }
                    />
                </View>

                {/* 入力エリア */}
                <View style={[styles.inputContainer, {
                    backgroundColor: theme.background,
                    borderTopColor: theme.headerBorder,
                    paddingBottom: Math.max(insets.bottom, 10)
                }]}>
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
                                currentRole === 'action' && { backgroundColor: isDark ? '#333' : '#eee', borderColor: isDark ? '#555' : '#ccc', borderWidth: 1 }
                            ]}
                            onPress={() => setCurrentRole('action')}
                        >
                            <Text style={[styles.roleTabText, currentRole === 'action' && { color: isDark ? '#fff' : '#333' }]}>ト書き</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputBar}>
                        <TextInput
                            style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text }]}
                            placeholder={`${ROLES[currentRole.toUpperCase() as keyof typeof ROLES].label}を入力...`}
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
                </View>
            </KeyboardAvoidingView>

            <Modal
                transparent={true}
                visible={isDurationModalVisible}
                onRequestClose={() => setDurationModalVisible(false)}
                animationType="fade"
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => { Keyboard.dismiss(); setDurationModalVisible(false); }}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>秒数を変更</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 20 }}>
                            <TextInput
                                style={[styles.durationInput, { color: theme.text, borderColor: theme.headerBorder }]}
                                value={tempDuration}
                                onChangeText={setTempDuration}
                                keyboardType="number-pad"
                                autoFocus
                                selectTextOnFocus
                            />
                            <Text style={{ fontSize: 18, color: theme.text, marginLeft: 8 }}>秒</Text>
                        </View>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setDurationModalVisible(false)}>
                                <Text style={{ color: '#666' }}>キャンセル</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalBtnSave} onPress={saveDuration}>
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>保存</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 12, borderBottomWidth: 1,
        // paddingTopは動的に設定
    },
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
    listContent: { padding: 16 }, // paddingBottomは動的に設定
    lineWrapper: { marginBottom: 16, maxWidth: '100%' },
    roleLabel: { fontSize: 10, color: '#999', marginBottom: 2, marginHorizontal: 4 },
    bubble: { padding: 12, borderRadius: 16, maxWidth: '85%' },
    bubbleText: { fontSize: 16, lineHeight: 24 },
    metaContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginHorizontal: 4, gap: 8 },
    durationText: { fontSize: 10, color: '#aaa' },
    durationButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', padding: 4, borderRadius: 4, gap: 4 },
    inputContainer: {
        borderTopWidth: 1,
        // paddingBottomは動的に設定
    },
    roleTabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, gap: 8 },
    roleTab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f0f0f0' },
    roleTabActiveBoke: { backgroundColor: '#E3F2FD' },
    roleTabActiveTsukkomi: { backgroundColor: '#FFEBEE' },
    roleTabText: { fontSize: 12, fontWeight: 'bold', color: '#666' },
    roleTabTextActive: { color: '#333' },
    inputBar: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
    textInput: { flex: 1, height: 44, borderRadius: 22, paddingHorizontal: 16, fontSize: 16 },
    sendButton: { padding: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: 280, padding: 20, borderRadius: 16, alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    durationInput: { fontSize: 24, textAlign: 'center', borderBottomWidth: 2, width: 80, padding: 4 },
    modalButtons: { flexDirection: 'row', gap: 16, width: '100%' },
    modalBtnCancel: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 8 },
    modalBtnSave: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#007AFF', borderRadius: 8 },
});