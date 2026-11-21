"use server";

import { revalidatePath } from "next/cache";
import { accountPhotoSchema } from "../types/auth";
import { updateAccountProfilePhoto } from "../services/account-photo-service";
import { requireUser } from "./session";

export async function updateAccountProfilePhotoAction(formData: FormData) {
  const user = await requireUser();
  const image = accountPhotoSchema.safeParse(formData.get("imageUrl"));

  if (!image.success) {
    return {
      ok: false,
      message: "Pilih foto JPG, PNG, atau WebP berukuran maksimal 8 MB.",
    } as const;
  }

  let result: Awaited<ReturnType<typeof updateAccountProfilePhoto>>;
  try {
    result = await updateAccountProfilePhoto(user.id, image.data);
  } catch {
    console.error("[auth] account profile photo could not be saved");
    return { ok: false, message: "Foto profil belum bisa disimpan. Coba lagi." } as const;
  }

  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/pengaturan");
  }
  return result;
}
