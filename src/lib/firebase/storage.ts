import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { storage } from "./client";

export async function uploadImage(
  submissionId: string,
  imageId: string,
  file: File
): Promise<{ storagePath: string; downloadUrl: string }> {
  const extension = file.name.split(".").pop() || "jpg";
  const storagePath = `submissions/${submissionId}/images/${imageId}.${extension}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, {
    contentType: file.type,
  });

  const downloadUrl = await getDownloadURL(storageRef);

  return { storagePath, downloadUrl };
}
