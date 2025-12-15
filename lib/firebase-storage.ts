import { storage } from "./firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";

export interface UploadOptions {
  onProgress?: (progress: number) => void;
  metadata?: {
    contentType?: string;
    customMetadata?: Record<string, string>;
  };
}

export const uploadFile = async (
  file: File,
  path: string,
  options?: UploadOptions
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file, options?.metadata);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        options?.onProgress?.(progress);
      },
      (error) => {
        console.error("Upload error:", error);
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};

export const deleteFile = async (fileUrl: string): Promise<void> => {
  try {
    // Extract file path from URL
    const url = new URL(fileUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
    if (!pathMatch) throw new Error("Invalid file URL");
    
    const filePath = decodeURIComponent(pathMatch[1]);
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
  } catch (error) {
    console.error("Delete file error:", error);
    throw error;
  }
};

// Upload server image
export const uploadServerImage = async (
  file: File,
  serverId: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const path = `servers/${serverId}/${Date.now()}_${file.name}`;
  return uploadFile(file, path, {
    onProgress,
    metadata: {
      contentType: file.type,
      customMetadata: {
        uploadedBy: "server",
        serverId,
      },
    },
  });
};

// Upload message file (image or PDF)
export const uploadMessageFile = async (
  file: File,
  channelId: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const path = `messages/${channelId}/${Date.now()}_${file.name}`;
  return uploadFile(file, path, {
    onProgress,
    metadata: {
      contentType: file.type,
      customMetadata: {
        uploadedBy: "message",
        channelId,
      },
    },
  });
};

// Upload direct message file
export const uploadDirectMessageFile = async (
  file: File,
  conversationId: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const path = `direct-messages/${conversationId}/${Date.now()}_${file.name}`;
  return uploadFile(file, path, {
    onProgress,
    metadata: {
      contentType: file.type,
      customMetadata: {
        uploadedBy: "direct-message",
        conversationId,
      },
    },
  });
};
