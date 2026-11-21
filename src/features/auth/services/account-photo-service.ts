import { isValidCloudinaryProfilePhoto } from "../repository/account-image-storage";
import { saveAccountProfileImage } from "../repository/account-repository";

export async function updateAccountProfilePhoto(userId: string, imageUrl: string) {
  if (!(await isValidCloudinaryProfilePhoto(imageUrl))) {
    return { ok: false, message: "Pilih foto JPG, PNG, atau WebP berukuran maksimal 8 MB." } as const;
  }
  await saveAccountProfileImage(userId, imageUrl);
  return { ok: true, imageUrl } as const;
}
