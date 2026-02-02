import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
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

export async function getImageUrl(storagePath: string): Promise<string> {
  const storageRef = ref(storage, storagePath);
  return getDownloadURL(storageRef);
}

export async function deleteImage(storagePath: string): Promise<void> {
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}
