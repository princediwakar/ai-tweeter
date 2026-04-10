// lib/utils/cloudinaryUtils.ts

import { v2 as cloudinary } from 'cloudinary';
import { platformSettings } from '../platformSettings';
import type { ConnectedAccountWithCredentials } from '../types';

export function configureCloudinary(account: ConnectedAccountWithCredentials): boolean {
  return false;
}

export async function uploadToCloudinary(imageBuffer: Buffer, publicId: string, account: ConnectedAccountWithCredentials): Promise<string> {
  const creds = await platformSettings.getCloudinaryCredentials();
  
  if (!creds.cloud_name || !creds.api_key) {
    throw new Error(`No Cloudinary configuration available`);
  }

  cloudinary.config({
    cloud_name: creds.cloud_name,
    api_key: creds.api_key,
    api_secret: creds.api_secret,
  });

  const folderName = `${account.account_username.replace('@', '')}-content`;

  try {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          public_id: publicId,
          folder: folderName,
          format: 'jpg',
          quality: 'auto:good',
          overwrite: true,
        },
        (error, result) => error ? reject(error) : resolve(result)
      ).end(imageBuffer);
    });

    if (result && typeof result === 'object' && 'secure_url' in result) {
      console.log(`✅ Image uploaded to Cloudinary for ${account.name}: ${result.secure_url}`);
      return result.secure_url as string;
    } else {
      throw new Error('Invalid Cloudinary response');
    }
  } catch (error) {
    console.error(`❌ Failed to upload image to Cloudinary for ${account.name}:`, error);
    throw error;
  }
}
