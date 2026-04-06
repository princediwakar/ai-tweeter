// lib/utils/cloudinaryUtils.ts

import { v2 as cloudinary } from 'cloudinary';

import { AccountWithCredentials } from '../types';

/**
 * Configure Cloudinary using account's decrypted credentials
 */
export function configureCloudinary(account: AccountWithCredentials): boolean {
  // Check if account has Cloudinary credentials configured
  if (!account.cloudinary_cloud_name ||
    !account.cloudinary_api_key ||
    !account.cloudinary_api_secret) {
    console.error(`❌ Account ${account.name} missing Cloudinary credentials. Please configure Cloudinary credentials for this account.`);
    return false;
  }

  try {
    cloudinary.config({
      cloud_name: account.cloudinary_cloud_name,
      api_key: account.cloudinary_api_key,
      api_secret: account.cloudinary_api_secret
    });
    console.log(`✅ Configured Cloudinary for account: ${account.name}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to configure Cloudinary for account ${account.name}:`, error);
    return false;
  }
}

/**
 * Upload image buffer to Cloudinary using account-specific credentials
 */
export async function uploadToCloudinary(imageBuffer: Buffer, publicId: string, account: AccountWithCredentials): Promise<string> {
  if (!configureCloudinary(account)) {
    throw new Error(`No Cloudinary configuration available for account: ${account.name}`);
  }
  // Determine folder based on account
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