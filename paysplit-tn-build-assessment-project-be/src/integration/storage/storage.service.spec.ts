import { ServiceUnavailableException } from '@nestjs/common';

const save = jest.fn();
const del = jest.fn();
const file = jest.fn(() => ({ save, delete: del }));
const bucket = jest.fn(() => ({ file }));
const storageCtor = jest.fn(() => ({ bucket }));
jest.mock('@google-cloud/storage', () => ({ Storage: storageCtor }));

import { StorageService } from './storage.service';

const config = (values: Record<string, string>) =>
  ({ get: (key: string, fallback?: string) => values[key] ?? fallback }) as never;

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StorageService(config({ 'gcs.bucket': 'my-bucket', 'gcs.projectId': 'proj' }));
  });

  it('uses application default credentials when no key file is set', () => {
    expect(storageCtor).toHaveBeenCalledWith({ projectId: 'proj', authClient: undefined });
    expect(bucket).toHaveBeenCalledWith('my-bucket');
  });

  it('uploads and returns the public URL', async () => {
    save.mockResolvedValue(undefined);
    const url = await service.upload('profile-images/u1/a b.png', Buffer.from('x'), 'image/png');

    expect(file).toHaveBeenCalledWith('profile-images/u1/a b.png');
    expect(save).toHaveBeenCalledWith(
      Buffer.from('x'),
      expect.objectContaining({ contentType: 'image/png', resumable: false }),
    );
    expect(url).toBe('https://storage.googleapis.com/my-bucket/profile-images/u1/a%20b.png');
  });

  it('maps upload failures to 503', async () => {
    save.mockRejectedValue(new Error('403 forbidden'));
    await expect(service.upload('p.png', Buffer.from('x'), 'image/png')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('round-trips paths through URLs', () => {
    const url = service.publicUrl('profile-images/u1/a b.png');
    expect(service.pathFromUrl(url)).toBe('profile-images/u1/a b.png');
  });

  it('deletes objects from its own bucket, ignoring missing ones', async () => {
    del.mockResolvedValue(undefined);
    await service.deleteByUrl('https://storage.googleapis.com/my-bucket/profile-images/u1/x.png');
    expect(file).toHaveBeenCalledWith('profile-images/u1/x.png');
    expect(del).toHaveBeenCalledWith({ ignoreNotFound: true });
  });

  it('ignores URLs from other buckets or hosts', async () => {
    await service.deleteByUrl('https://storage.googleapis.com/other-bucket/x.png');
    await service.deleteByUrl('https://example.com/my-bucket/x.png');
    expect(del).not.toHaveBeenCalled();
  });

  it('fails with 503 when no bucket is configured', async () => {
    const unconfigured = new StorageService(config({}));
    await expect(unconfigured.upload('p.png', Buffer.from('x'), 'image/png')).rejects.toThrow(
      'File storage is not configured.',
    );
  });
});
