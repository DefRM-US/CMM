declare namespace NodeJS {
  interface ProcessEnv {
    CMM_DATA_DIR?: string;
    VITE_DEV_SERVER_URL?: string;
    CMM_TEST_SAVE_PATH?: string;
    CMM_TEST_OPEN_PATHS?: string;
  }
}
