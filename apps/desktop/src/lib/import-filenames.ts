export type ImportFileDetails = {
  filename: string;
  companyName: string;
};

const getImportFilename = (filePath: string): string => {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
};

const stripExtension = (filename: string): string => filename.replace(/\.[^/.]+$/, '');

export const deriveImportFileDetails = (filePath: string): ImportFileDetails => {
  const filename = getImportFilename(filePath);
  const companyName = stripExtension(filename).trim() || filename;

  return { filename, companyName };
};
