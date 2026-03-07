import { api } from "./api";

export interface BusinessProfile {
  kosh_business_id?: string;
  [key: string]: any; // To support future dynamic fields seamlessly
}

export const getBusinessProfile = async (): Promise<BusinessProfile> => {
  const response = await api.get("/api/business");
  return response.data.data;
};

export const updateBusinessProfile = async (
  data: BusinessProfile,
): Promise<BusinessProfile> => {
  const response = await api.put("/api/business", data);
  return response.data.data;
};
