import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bucket, Storage } from '@google-cloud/storage';
import { JWT } from 'google-auth-library';

const PUBLIC_HOST = 'https://storage.googleapis.com';
const READ_WRITE_SCOPE = 'https://www.googleapis.com/auth/devstorage.read_write';

/**
 * Thin wrapper around a single Google Cloud Storage bucket.
 *
 * Credentials: if `GCP_STORAGE_KEY_FILE` is set, that service-account key is
 * used (local dev). Otherwise the client falls back to Application Default
 * Credentials, i.e. the service account attached to the GCP runtime.
 *
 * Objects are served from the bucket's public URL, so the bucket must allow
 * public reads (allUsers: Storage Object Viewer).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: Bucket | null;
  private readonly bucketName: string;

  constructor(configService: ConfigService) {
    this.bucketName = configService.get<string>('gcs.bucket', '');
    const projectId = configService.get<string>('gcs.projectId', '') || undefined;
    const keyFile = configService.get<string>('gcs.keyFile', '');

    if (!this.bucketName) {
      this.logger.warn('GCP_STORAGE_BUCKET not set — file uploads will fail.');
      this.bucket = null;
      return;
    }

    const authClient = keyFile ? StorageService.clientFromKeyFile(keyFile) : undefined;
    this.bucket = new Storage({ projectId, authClient }).bucket(this.bucketName);
  }

  /** Uploads a file and returns its public URL. */
  async upload(path: string, data: Buffer, contentType: string): Promise<string> {
    const file = this.requireBucket().file(path);
    try {
      await file.save(data, {
        resumable: false,
        contentType,
        // Paths are unique per upload, so caching is safe. Kept short because Google's
        // edge cache keeps serving a public object for up to max-age after it's deleted.
        metadata: { cacheControl: 'public, max-age=3600' },
      });
    } catch (error) {
      this.logger.error(`Upload to ${path} failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException('File storage is unavailable. Please try again.');
    }
    return this.publicUrl(path);
  }

  /**
   * Deletes the object behind a URL this service produced. URLs from other
   * hosts or buckets are ignored, as are objects that no longer exist.
   */
  async deleteByUrl(url: string): Promise<void> {
    const path = this.pathFromUrl(url);
    if (!path) return;
    await this.requireBucket().file(path).delete({ ignoreNotFound: true });
  }

  publicUrl(path: string): string {
    const encoded = path.split('/').map(encodeURIComponent).join('/');
    return `${PUBLIC_HOST}/${this.bucketName}/${encoded}`;
  }

  pathFromUrl(url: string): string | null {
    const prefix = `${PUBLIC_HOST}/${this.bucketName}/`;
    if (!this.bucketName || !url.startsWith(prefix)) return null;
    return url.slice(prefix.length).split('/').map(decodeURIComponent).join('/');
  }

  private requireBucket(): Bucket {
    if (!this.bucket) {
      throw new ServiceUnavailableException('File storage is not configured.');
    }
    return this.bucket;
  }

  private static clientFromKeyFile(keyFile: string): JWT {
    try {
      const key = JSON.parse(readFileSync(resolve(keyFile), 'utf8')) as Record<string, string>;
      return new JWT({ email: key.client_email, key: key.private_key, scopes: [READ_WRITE_SCOPE] });
    } catch (error) {
      throw new Error(
        `Could not read GCP_STORAGE_KEY_FILE "${keyFile}": ${(error as Error).message}`,
      );
    }
  }
}
