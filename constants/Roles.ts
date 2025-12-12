// constants/Roles.ts

export const ROLES = {
    BOKE: {
        id: 'boke',
        label: 'ボケ',
        color: '#E3F2FD',
        textColor: '#1565C0',
        align: 'flex-start' as const
    },
    TSUKKOMI: {
        id: 'tsukkomi',
        label: 'ツッコミ',
        color: '#FFEBEE',
        textColor: '#C62828',
        align: 'flex-end' as const
    },
    ACTION: {
        id: 'action',
        label: 'ト書き',
        color: '#F5F5F5',
        textColor: '#616161',
        align: 'center' as const
    },
};

// ダークモード時のト書き用カラー設定
export const DARK_THEME_ACTION_COLORS = {
    bubble: '#333333',
    text: '#AAAAAA'
};