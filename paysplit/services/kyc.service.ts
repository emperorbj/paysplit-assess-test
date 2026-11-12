import { apiClient } from "@/lib/api/client"
import type {
  InternationalIdentityDto,
  KycActionResponse,
  KycCountry,
  KycStatusResponse,
  NigeriaIdentityDto,
  UpdateKycProfileDto,
} from "@/types/api/kyc"

export const kycService = {
  countries: () =>
    apiClient
      .get<KycCountry[]>("/kyc/countries", { skipAuth: true })
      .then((r) => r.data),

  status: () =>
    apiClient.get<KycStatusResponse>("/kyc/status").then((r) => r.data),

  updateProfile: (dto: UpdateKycProfileDto) =>
    apiClient.put<KycActionResponse>("/kyc/profile", dto).then((r) => r.data),

  verifyNigeriaIdentity: (dto: NigeriaIdentityDto) =>
    apiClient
      .post<KycActionResponse>("/kyc/identity/nigeria", dto)
      .then((r) => r.data),

  uploadInternationalIdentity: ({
    documentType,
    front,
    back,
  }: InternationalIdentityDto) => {
    const form = new FormData()
    form.append("documentType", documentType)
    form.append("front", front)
    if (back) form.append("back", back)
    return apiClient
      .post<KycActionResponse>("/kyc/identity/international", form)
      .then((r) => r.data)
  },

  submitLiveness: (selfie: Blob) => {
    const form = new FormData()
    form.append("selfie", selfie, "selfie.jpg")
    return apiClient
      .post<KycActionResponse>("/kyc/liveness", form)
      .then((r) => r.data)
  },
}
