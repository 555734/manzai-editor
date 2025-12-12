// babel.config.js
module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: ['react-native-reanimated/plugin'], // ★この行が超重要です
    };
};