// Re-export all server actions for convenient importing

export {
  getSettings,
  updateSettings,
  getScanDirectories,
  addScanDirectory,
  removeScanDirectory,
  toggleScanDirectory,
  isSetupComplete,
} from "./settings"

export {
  getThemes,
  getThemeByName,
  createTheme,
  updateTheme,
  deleteTheme,
  createDefaultThemes,
} from "./themes"

export {
  getRepositories,
  getRepository,
  getRepositoryCounts,
  assignTheme,
  bulkAssignTheme,
  setTriageStatus,
  ignoreRepository,
  deleteRepositoryRecord,
} from "./repositories"

export { triggerScan, refreshRepositoryStatus } from "./scan"

export {
  generateMovePreview,
  executeMoves,
  getTriageReady,
} from "./triage"
