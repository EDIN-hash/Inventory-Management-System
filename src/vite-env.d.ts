/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly DEV: boolean;
    readonly VITE_SERVER_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

interface Window {
    swUpdateAvailable?: boolean;
    swRegistration?: ServiceWorkerRegistration;
    CSP_NONCE?: string;
}
