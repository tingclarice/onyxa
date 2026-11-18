import { uploadImageToCloudinary } from "../repository/account-image-storage";
import { saveAccountProfileImage } from "../repository/account-repository";

export async function updateAccountProfilePhoto(userId: string, file: File) {
  const uploaded = await uploadImageToCloudinary(file);
  if (!uploaded.ok) return uploaded;

  await saveAccountProfileImage(userId, uploaded.imageUrl);
  return uploaded;
}
