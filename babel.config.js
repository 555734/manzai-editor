// babel.config.js
module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        // 修正前: plugins: ['react-native-reanimated/plugin'],
        // 修正後: ↓ workletsプラグインに変更してください
        plugins: ['react-native-worklets/plugin'],
    };
};