import * as businessRepo from "../repositories/businessRepository.mjs";

export function getBusiness() {
  return businessRepo.getBusiness();
}

export function updateBusiness(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid business data provided.");
  }
  return businessRepo.updateBusiness(data);
}
