/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_ZTQI_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
