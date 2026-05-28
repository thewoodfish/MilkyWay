import { v2 as cloudinary } from "cloudinary";

cloudinary.config({ secure: true });

export async function uploadImage(fileBuffer: Buffer, fileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "milkyway-agents",
          public_id: fileName,
          overwrite: true,
          resource_type: "image",
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error("Upload failed"));
          resolve(result.secure_url);
        }
      )
      .end(fileBuffer);
  });
}
