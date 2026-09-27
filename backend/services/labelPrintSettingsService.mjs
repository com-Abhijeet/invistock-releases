import * as repository from "../repositories/labelPrintSettingsRepository.mjs";

export function fetchLabelPrintSettings() {
  return repository.getLabelPrintSettings();
}

export function modifyLabelPrintSettings(data) {
  return repository.updateLabelPrintSettings(data);
}
