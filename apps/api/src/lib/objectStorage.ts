import { StorageClient } from "@supabase/storage-js";
import { Readable } from "stream";
import { randomUUID } from "crypto";

type DownloadObjectResult = {
  status: number;
  headers: Map<string, string>;
  body: ReadableStream<Uint8Array> | null;
};

function getStorageClient(): StorageClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY must be set for Supabase Storage",
    );
  }

  return new StorageClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
}

export const objectStorageClient = getStorageClient();

export const SB_BUCKET = process.env.SB_BUCKET || "murivest-assets";
export const PUBLIC_OBJECT_PREFIX =
  process.env.PUBLIC_OBJECT_PREFIX || "public";
export const PRIVATE_OBJECT_PREFIX =
  process.env.PRIVATE_OBJECT_PREFIX || "private";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    if (!PUBLIC_OBJECT_PREFIX) {
      throw new Error(
        "PUBLIC_OBJECT_PREFIX not set. Set PUBLIC_OBJECT_PREFIX env var.",
      );
    }
    return [`${PUBLIC_OBJECT_PREFIX}`];
  }

  getPrivateObjectDir(): string {
    if (!PRIVATE_OBJECT_PREFIX) {
      throw new Error(
        "PRIVATE_OBJECT_PREFIX not set. Set PRIVATE_OBJECT_PREFIX env var.",
      );
    }
    return `${PRIVATE_OBJECT_PREFIX}`;
  }

  async searchPublicObject(
    filePath: string,
  ): Promise<{ id: string; name: string } | null> {
    for (const prefix of this.getPublicObjectSearchPaths()) {
      const fullPath = `${prefix}/${filePath}`;
      const bucket = objectStorageClient.from(SB_BUCKET);

      try {
        const { data, error } = await bucket.list(fullPath.split("/")[0], {
          prefix: filePath,
          limit: 1,
        });

        if (error) continue;
        if (data && data.length > 0) {
          return { id: data[0].id, name: data[0].name };
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  async downloadObject(
    file: { id: string; name: string },
    cacheTtlSec: number = 3600,
  ): Promise<DownloadObjectResult> {
    const bucket = objectStorageClient.from(SB_BUCKET);

    const { data, error } = await bucket.download(file.name);

    if (error || !data) {
      throw new ObjectNotFoundError();
    }

    const headers = new Map<string, string>();
    headers.set("Content-Type", "application/octet-stream");
    headers.set("Cache-Control", `private, max-age=${cacheTtlSec}`);

    return {
      status: 200,
      headers,
      body: data as ReadableStream<Uint8Array>,
    };
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_PREFIX not set. Set PRIVATE_OBJECT_PREFIX env var.",
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const bucket = objectStorageClient.from(SB_BUCKET);
    const { data, error } = bucket.createSignedUploadUrl(fullPath, {
      expiresIn: 900,
    });

    if (error) {
      throw new Error(`Failed to create upload URL: ${error.message}`);
    }

    return data?.signedUrl || "";
  }

  async getObjectEntityFile(objectPath: string): Promise<{
    id: string;
    name: string;
  }> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    const entityDir = this.getPrivateObjectDir();
    const fullPath = `${entityDir}/${entityId}`;

    const bucket = objectStorageClient.from(SB_BUCKET);
    const { data, error } = await bucket.list("", {
      prefix: fullPath,
      limit: 1,
    });

    if (error || !data || data.length === 0) {
      throw new ObjectNotFoundError();
    }

    return { id: data[0].id, name: data[0].name };
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.includes("supabase")) {
      return rawPath;
    }

    try {
      const url = new URL(rawPath);
      const pathParts = url.pathname.split("/");
      const idx = pathParts.indexOf(SB_BUCKET);
      if (idx >= 0) {
        const objectPath = pathParts.slice(idx + 2).join("/");
        return `/objects/${objectPath}`;
      }
    } catch {
      return rawPath;
    }

    return rawPath;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    _aclPolicy: unknown,
  ): Promise<string> {
    return this.normalizeObjectEntityPath(rawPath);
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    _requestedPermission,
  }: {
    userId?: string;
    objectFile: unknown;
    requestedPermission?: unknown;
  }): Promise<boolean> {
    if (!userId) return false;
    return true;
  }
}

export async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const bucket = objectStorageClient.from(bucketName);

  const expiresIn = ttlSec;
  const options =
    method === "PUT" ? { method: "POST" as const } : { download: objectName };

  const { data, error } = bucket.createSignedUrl(
    objectName,
    expiresIn,
    options,
  );

  if (error) {
    throw new Error(`Failed to sign URL: ${error.message}`);
  }

  return data?.signedUrl || "";
}
