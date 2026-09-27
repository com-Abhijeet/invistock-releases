import * as PresetRepo from "../repositories/attributePresetRepository.mjs";

export const getAllPresetsController = async (req, res) => {
  try {
    const presets = PresetRepo.getAllAttributePresets();
    return res.status(200).json({ status: "success", data: presets });
  } catch (error) {
    console.error("Error in getAllPresetsController:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

export const getPresetByIdController = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const preset = PresetRepo.getAttributePresetById(id);
    if (!preset) {
      return res.status(404).json({ status: "error", message: "Preset not found" });
    }
    return res.status(200).json({ status: "success", data: preset });
  } catch (error) {
    console.error("Error in getPresetByIdController:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

export const createPresetController = async (req, res) => {
  try {
    const { name, dimension_label, values } = req.body;
    if (!name || !dimension_label) {
      return res.status(400).json({
        status: "error",
        message: "Name and dimension label are required",
      });
    }

    const created = PresetRepo.createAttributePreset({ name, dimension_label, values });
    return res.status(201).json({ status: "success", data: created });
  } catch (error) {
    console.error("Error in createPresetController:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

export const updatePresetController = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, dimension_label, values } = req.body;
    if (!name || !dimension_label) {
      return res.status(400).json({
        status: "error",
        message: "Name and dimension label are required",
      });
    }

    const updated = PresetRepo.updateAttributePreset(id, { name, dimension_label, values });
    return res.status(200).json({ status: "success", data: updated });
  } catch (error) {
    console.error("Error in updatePresetController:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

export const deletePresetController = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const success = PresetRepo.deleteAttributePreset(id);
    if (!success) {
      return res.status(404).json({ status: "error", message: "Preset not found" });
    }
    return res.status(200).json({ status: "success", message: "Preset deleted successfully" });
  } catch (error) {
    console.error("Error in deletePresetController:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};
