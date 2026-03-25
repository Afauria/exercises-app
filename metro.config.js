const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// txt：内置题库等资源。wasm：Metro 必须把 .wasm 当作可解析资源，否则 expo-sqlite 的 web/worker.ts
// 无法打包（Unable to resolve wa-sqlite.wasm）。Worker 内通过 locateFile 使用该资源 URL 加载二进制。
for (const ext of ['txt', 'wasm']) {
  if (!config.resolver.assetExts.includes(ext)) {
    config.resolver.assetExts.push(ext);
  }
}
module.exports = config;
