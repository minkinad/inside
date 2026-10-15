import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { Client as MinioClient } from 'minio';

const bucket = process.env.MINIO_BUCKET || 'inside-assets';
const minio = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'inside',
  secretKey: process.env.MINIO_SECRET_KEY || 'inside-local-secret',
});
const assets = [
  {
    file: 'min-inside-mark.webp',
    key: 'demo/min-inside-mark.webp',
    mimeType: 'image/webp',
  },
  {
    file: 'meeting-background.svg',
    key: 'demo/meeting-background.svg',
    mimeType: 'image/svg+xml',
  },
] as const;

async function main() {
  if (!(await minio.bucketExists(bucket))) await minio.makeBucket(bucket);

  if (process.argv.includes('--cleanup-old')) {
    const db = new PrismaClient();
    try {
      const references = await db.brandAsset.count({
        where: { objectKey: 'demo/northstar-mark.svg' },
      });
      if (references) throw new Error('Old brand object is still referenced');
      await minio.removeObject(bucket, 'demo/northstar-mark.svg');
      console.log('Unreferenced legacy demo object removed.');
    } finally {
      await db.$disconnect();
    }
    return;
  }

  for (const asset of assets) {
    const bytes = await readFile(
      join(process.cwd(), 'prisma', 'seed-assets', asset.file),
    );
    await minio.putObject(bucket, asset.key, bytes, bytes.length, {
      'Content-Type': asset.mimeType,
    });
    const stored = await minio.statObject(bucket, asset.key);
    if (stored.size !== bytes.length)
      throw new Error(`Stored size does not match ${asset.file}`);
  }
  console.log('Replacement demo brand objects uploaded and verified.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Asset upload failed');
  process.exitCode = 1;
});
