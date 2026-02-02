import {
  DocumentDirectoryPath,
  exists,
  mkdir,
  readFile,
  writeFile,
} from '@dr.pogodin/react-native-fs';

/**
 * Application data directory path
 */
export const APP_DATA_DIR = `${DocumentDirectoryPath}/AppData`;

/**
 * Ensures the application data directory exists
 */
export const ensureAppDirectory = async (): Promise<void> => {
  const dirExists = await exists(APP_DATA_DIR);
  if (!dirExists) {
    await mkdir(APP_DATA_DIR);
  }
};

/**
 * Saves typed data to a JSON file in the app data directory
 * @param filename - The filename (without path) to save to
 * @param data - The data to save
 */
export const saveJSON = async <T>(filename: string, data: T): Promise<string> => {
  await ensureAppDirectory();
  const filePath = `${APP_DATA_DIR}/${filename}`;
  const jsonString = JSON.stringify(data, null, 2);
  await writeFile(filePath, jsonString, 'utf8');
  return filePath;
};

/**
 * Loads typed data from a JSON file in the app data directory
 * @param filename - The filename (without path) to load from
 * @returns The parsed data, or null if the file doesn't exist
 */
export const loadJSON = async <T>(filename: string): Promise<T | null> => {
  const filePath = `${APP_DATA_DIR}/${filename}`;
  const fileExists = await exists(filePath);
  if (!fileExists) {
    return null;
  }
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content) as T;
};
