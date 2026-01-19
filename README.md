# DefRM CMM - Capability Matrix Management

A desktop application for managing capability matrices when responding to RFPs. Create standardized matrices, collect partner responses, and compare capabilities across companies to build your strongest consortium.

## Why DefRM CMM?

- **Streamline teaming decisions** - Compare capability scores across all potential partners in one view
- **Standardize your process** - Create consistent capability matrices that partners can easily complete
- **Excel-native workflow** - Export and import standard Excel spreadsheets
- **100% local and private** - All data stays on your machine. No cloud, no accounts, no tracking. Your competitive intelligence remains yours.

## How It Works

1. **Create** - Build your capability matrix with requirements from the RFP/PWS
2. **Export** - Generate formatted Excel spreadsheets to send to potential teaming partners
3. **Collect** - Partners fill in their capability scores (0-3 scale) and return the spreadsheet
4. **Import** - Load all partner responses back into the app
5. **Compare** - View every company side-by-side with color-coded scores
6. **Decide** - Identify which combination of partners gives you the strongest consortium

## Features

- **Matrix Editor** - Add, edit, and reorder requirements with drag-and-drop
- **Capability Scoring** - 0-3 scale with color-coded badges (None/Some/Good/Excellent)
- **Excel Export** - Professional spreadsheets with conditional formatting, legend, and company metadata
- **Bulk Import** - Load multiple partner spreadsheets at once with automatic header detection
- **Comparison View** - Grand comparison table showing all requirements across all companies
- **Details on Hover** - View past performance and comments without leaving the comparison view
- **Auto-Save** - Changes are saved automatically as you work
- **Light & Dark Themes** - Choose your preferred appearance

## Installation

### Download (Recommended)

Download the latest release for your platform:

- **macOS** - `.dmg` installer
- **Windows** - `.msi` installer

[View Releases](https://github.com/DefRM-US/CMM/releases)

### Build from Source

Prerequisites: [Bun](https://bun.sh/) and [Rust](https://rustup.rs/)

```bash
git clone git@github.com:DefRM-US/CMM.git
cd CMM
bun install
bun run tauri build
```

Installers will be created in `src-tauri/target/release/bundle/`.

## Getting Started

1. Launch DefRM CMM
2. Click **New Matrix** to create your first capability matrix
3. Add requirements from your RFP or PWS
4. Rate your own company's capabilities for each requirement
5. Go to the **Export** tab to generate an Excel spreadsheet
6. Send the spreadsheet to potential teaming partners
7. When partners return their completed matrices, use the **Import** tab to load them
8. Switch to the **Compare** tab to see all responses side-by-side

## Privacy & Security

DefRM CMM is designed with your data security in mind:

- All data is stored locally in a SQLite database on your machine
- No internet connection required after installation
- No cloud synchronization or external data transmission
- No telemetry or usage tracking
- Your competitive intelligence and teaming strategies stay completely private

## System Requirements

- macOS 10.15 (Catalina) or later
- Windows 10 or later
- Approximately 100MB disk space

## Support

Found a bug or have a feature request? [Open an issue on GitHub](https://github.com/DefRM-US/CMM/issues).
