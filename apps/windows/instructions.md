cd apps\windows
pnpm install

# Initialize Windows native project
npx react-native init-windows --overwrite

# Autolink native dependencies
npx react-native autolink-windows

# Run the app
pnpm dev
