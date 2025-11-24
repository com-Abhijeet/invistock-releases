import { storageLocationSchema } from "../validations/storageSchema.mjs";
import * as repo from "../repositories/storageRepository.mjs";

export const addStorageService = async (input) => {
  const data = storageLocationSchema.parse(input);
  return await repo.createStorageLocation(data);
};
