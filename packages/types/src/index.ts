export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
}
