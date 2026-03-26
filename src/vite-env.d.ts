/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 构建时注入，用于内置 bank.json 请求防缓存 */
  readonly VITE_BANK_STAMP: string;
}
