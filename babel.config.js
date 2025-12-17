// babel.config.js
module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            // もし将来的にReanimatedを使う場合はここに記述しますが、
            // 今は安定動作のために空、またはreanimatedプラグインを記述
            'react-native-reanimated/plugin',
        ],
    };
};