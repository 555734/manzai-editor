import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import debounce from 'lodash.debounce';
import { ArrowUp, ChevronLeft, Menu, Send, User } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    BackHandler,
    FlatList,
    KeyboardAvoidingView,
    ListRenderItem,
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

import { ROLES } from '@/constants/Roles';
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

export default function EditorScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const STORAGE_KEY = `manzai_script_${id}`;

    const { effectiveColorScheme } = useAppTheme();
    const isDark = effectiveColorScheme === 'dark';

    const theme = {
        background: isDark ? '#1F2329' : '#9BBBD4',
        headerBg: isDark ? '#2B2E35' : '#F5F5F5',
        headerText: isDark ? '#F5F5F5' : '#000000',
        inputBg: isDark ? '#2B2E35' : '#FFFFFF',
        inputTextBg: isDark ? '#3A3F45' : '#F5F5F5',
        text: isDark ? '#FFFFFF' : '#000000',
        placeholder: isDark ? '#666' : '#999',

        bubbleRight: isDark ? '#4EC963' : '#8DE055',
        bubbleLeft: isDark ? '#2F3336' : '#FFFFFF',
        bubbleAction: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',

        textRight: '#000000',
        textLeft: isDark ? '#FFFFFF' : '#000000',
        textAction: isDark ? '#DDD' : '#555',
    };

    const [title, setTitle] = useState('');
    const [lines, setLines] = useState<Line[]>([]);
    const [inputText, setInputText] = useState('');
    const [currentRole, setCurrentRole] = useState<RoleType>('boke');

    const flatListRef = useRef<FlatList>(null);
    const viewRef = useRef<View>(null);

    const headerPaddingTop = Math.max(insets.top, 0);
    const headerHeight = headerPaddingTop + 50;

    // 自動保存 (Debounce)
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
            } catch (e) { console.error(e); }
        }, 1000), []
    );

    useEffect(() => {
        if (id) debouncedSave(id as string, title, lines);
    }, [lines, title, id, debouncedSave]);

    useEffect(() => {
        const loadData = async () => {
            try {
                if (!id) return;
                const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
                if (jsonValue != null) {
                    const parsed = JSON.parse(jsonValue);
                    if (parsed && typeof parsed === 'object') {
                        setTitle(parsed.title || '');
                        setLines(Array.isArray(parsed.lines) ? parsed.lines : []);
                    }
                }
            } catch (e) { console.error(e); }
        };
        loadData();
    }, [id]);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (router.canGoBack()) router.back(); else router.replace('/');
            return true;
        });
        return () => backHandler.remove();
    }, []);

    const handleAddLine = () => {
        if (!inputText.trim()) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const newLine: Line = {
            id: uuidv4(),
            type: currentRole,
            text: inputText,
            duration: 0,
        };

        setLines(prev => [...prev, newLine]);
        setInputText('');

        if (currentRole === 'boke') setCurrentRole('tsukkomi');
        if (currentRole === 'tsukkomi') setCurrentRole('boke');

        // 反転リストなので offset: 0 が一番下（最新）になります
        setTimeout(() => flatListRef.current?.scrollToOffset({ animated: true, offset: 0 }), 100);
    };

    const handleDeleteLine = (lineId: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert("削除", "このセリフを削除しますか？", [
            { text: "キャンセル", style: "cancel" },
            {
                text: "削除",
                style: "destructive",
                onPress: () => setLines(prev => prev.filter(l => l.id !== lineId))
            }
        ]);
    };

    const handleClearAll = () => {
        Alert.alert("履歴削除", "トーク履歴をすべて削除しますか？", [
            { text: "キャンセル", style: "cancel" },
            { text: "削除", style: "destructive", onPress: () => setLines([]) }
        ]);
    };

    const handleShareText = async () => {
        if (lines.length === 0) return;
        const formattedText = lines.map(line => {
            const roleLabel = ROLES[line.type.toUpperCase() as keyof typeof ROLES]?.label || '';
            const text = line.type === 'action' ? `（${line.text}）` : line.text;
            return `${roleLabel}：${text}`;
        }).join('\n');
        try { await Share.share({ message: `${title}\n\n${formattedText}` }); } catch (error) { console.error(error); }
    };

    const handleShareImage = async () => {
        try {
            if (!viewRef.current) return;
            // view-shotで画像を生成
            const uri = await captureRef(viewRef, {
                format: 'jpg',
                quality: 0.8,
                result: 'tmpfile'
            });

            // expo-sharingで共有画面を呼び出す
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    dialogTitle: title || 'ネタ共有',
                    mimeType: 'image/jpeg',
                    UTI: 'public.jpeg'
                });
            } else {
                Alert.alert("エラー", "このデバイスでは共有機能が使用できません");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("エラー", "画像の保存に失敗しました");
        }
    };

    const showMenu = () => {
        Haptics.selectionAsync();
        Alert.alert("メニュー", "", [
            { text: "テキスト共有", onPress: handleShareText },
            { text: "画像共有", onPress: handleShareImage },
            { text: "一覧に戻る", onPress: () => router.back() },
            { text: "全消去", style: "destructive", onPress: handleClearAll },
            { text: "キャンセル", style: "cancel" }
        ]);
    };

    const renderItem: ListRenderItem<Line> = useCallback(({ item }) => {
        const isMe = item.type === 'tsukkomi';
        const isAction = item.type === 'action';

        if (isAction) {
            return (
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        onLongPress={() => handleDeleteLine(item.id)}
                        delayLongPress={500}
                        style={[styles.actionBadge, { backgroundColor: theme.bubbleAction }]}
                    >
                        <Text style={[styles.actionText, { color: theme.textAction }]}>{item.text}</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        const alignStyle = isMe ? 'flex-end' : 'flex-start';
        const bubbleColor = isMe ? theme.bubbleRight : theme.bubbleLeft;
        const textColor = isMe ? theme.textRight : theme.textLeft;

        return (
            <View style={[styles.messageRow, { justifyContent: alignStyle }]}>
                {!isMe && (
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatarCircle, { backgroundColor: '#ccc' }]}>
                            <User size={20} color="#fff" />
                        </View>
                    </View>
                )}

                <TouchableOpacity
                    onLongPress={() => handleDeleteLine(item.id)}
                    delayLongPress={500}
                    activeOpacity={0.8}
                    style={[
                        styles.bubble,
                        { backgroundColor: bubbleColor },
                        isMe ? styles.bubbleRightRadius : styles.bubbleLeftRadius
                    ]}
                >
                    <Text style={[styles.messageText, { color: textColor }]}>{item.text}</Text>
                </TouchableOpacity>
            </View>
        );
    }, [theme]);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <View style={[styles.header, {
                height: headerHeight,
                backgroundColor: theme.headerBg,
                paddingTop: headerPaddingTop
            }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                    <ChevronLeft size={28} color={theme.headerText} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <TextInput
                        value={title}
                        onChangeText={setTitle}
                        placeholder="タイトルを入力"
                        placeholderTextColor={theme.placeholder}
                        style={[styles.headerTitle, { color: theme.headerText }]}
                        textAlign="center"
                    />
                </View>

                <TouchableOpacity onPress={showMenu} style={styles.headerBtn}>
                    <Menu size={24} color={theme.headerText} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
            >
                <View
                    ref={viewRef}
                    collapsable={false}
                    style={{ flex: 1, backgroundColor: theme.background }}
                >
                    <FlatList
                        ref={flatListRef}
                        data={[...lines].reverse()}
                        inverted
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        style={{ flex: 1 }}
                    />
                </View>

                <View style={[styles.inputContainer, {
                    backgroundColor: theme.inputBg,
                    // 修正: 固定の10px余白を削除し、SafeAreaのみ確保するように変更
                    paddingBottom: insets.bottom
                }]}>
                    <View style={styles.roleSwitcher}>
                        <TouchableOpacity onPress={() => setCurrentRole('boke')} style={{ opacity: currentRole === 'boke' ? 1 : 0.4 }}>
                            <Text style={[styles.roleLabel, { color: theme.text }]}>相手(ボケ)</Text>
                        </TouchableOpacity>
                        <Text style={{ color: theme.placeholder }}>|</Text>
                        <TouchableOpacity onPress={() => setCurrentRole('action')} style={{ opacity: currentRole === 'action' ? 1 : 0.4 }}>
                            <Text style={[styles.roleLabel, { color: theme.text }]}>ト書き</Text>
                        </TouchableOpacity>
                        <Text style={{ color: theme.placeholder }}>|</Text>
                        <TouchableOpacity onPress={() => setCurrentRole('tsukkomi')} style={{ opacity: currentRole === 'tsukkomi' ? 1 : 0.4 }}>
                            <Text style={[styles.roleLabel, { color: theme.text }]}>自分(ツッコミ)</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputRow}>
                        <TouchableOpacity style={styles.attachBtn}>
                            <ArrowUp size={24} color={theme.placeholder} />
                        </TouchableOpacity>

                        <TextInput
                            style={[styles.textInput, { backgroundColor: theme.inputTextBg, color: theme.text }]}
                            placeholder={`${currentRole === 'action' ? 'ト書き' : (currentRole === 'boke' ? 'ボケ' : 'ツッコミ')}を入力`}
                            placeholderTextColor={theme.placeholder}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            blurOnSubmit={false}
                        />

                        <TouchableOpacity
                            onPress={handleAddLine}
                            style={[styles.sendBtn, { opacity: inputText.length > 0 ? 1 : 0.5 }]}
                            disabled={inputText.length === 0}
                        >
                            <Send size={20} color="#fff" fill="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
        zIndex: 10,
    },
    headerBtn: { padding: 8 },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: 'bold', width: '100%' },

    listContent: { paddingVertical: 16, paddingHorizontal: 10, paddingBottom: 20 },

    messageRow: {
        flexDirection: 'row', marginBottom: 16, width: '100%',
        alignItems: 'flex-start',
    },
    avatarContainer: { marginRight: 8, alignItems: 'center' },
    avatarCircle: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
        marginTop: 2,
    },
    bubble: {
        paddingVertical: 10, paddingHorizontal: 14,
        borderRadius: 18, maxWidth: '80%',
        minHeight: 36,
    },
    bubbleLeftRadius: { borderTopLeftRadius: 4 },
    bubbleRightRadius: { borderTopRightRadius: 4 },
    messageText: { fontSize: 16, lineHeight: 22 },

    actionRow: { alignItems: 'center', marginVertical: 12 },
    actionBadge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12 },
    actionText: { fontSize: 12 },

    inputContainer: { paddingTop: 8 },
    roleSwitcher: {
        flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 8
    },
    roleLabel: { fontSize: 11, fontWeight: 'bold' },

    inputRow: {
        flexDirection: 'row', alignItems: 'flex-end',
        paddingHorizontal: 10, gap: 8,
    },
    attachBtn: { paddingBottom: 10 },
    textInput: {
        flex: 1, minHeight: 40, maxHeight: 100,
        borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
        fontSize: 16,
    },
    sendBtn: {
        backgroundColor: '#007AFF',
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 2,
    },
});