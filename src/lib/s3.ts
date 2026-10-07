import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { Readable } from "node:stream"
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

let client: S3Client | undefined

function required(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set`)
  }
  return value
}

function localDir() {
  return process.env.S3_LOCAL_DIR?.trim() || ""
}

export function getBucket() {
  return required("S3_BUCKET")
}

export function getS3() {
  if (!client) {
    const endpoint = process.env.S3_ENDPOINT
    client = new S3Client({
      region: process.env.S3_REGION || "us-east-1",
      endpoint: endpoint || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE
        ? process.env.S3_FORCE_PATH_STYLE === "true"
        : Boolean(endpoint),
      credentials: {
        accessKeyId: required("S3_ACCESS_KEY_ID"),
        secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
      },
    })
  }
  return client
}

export async function ensureBucket() {
  if (localDir()) return
  if (process.env.S3_AUTO_CREATE_BUCKET !== "true") return
  const s3 = getS3()
  const Bucket = getBucket()
  try {
    await s3.send(new HeadBucketCommand({ Bucket }))
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket }))
  }
}

async function localPath(key: string) {
  const root = localDir()
  const full = path.join(root, getBucket(), key)
  await mkdir(path.dirname(full), { recursive: true })
  return full
}

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string
) {
  if (localDir()) {
    const filePath = await localPath(key)
    await writeFile(filePath, body)
    await writeFile(`${filePath}.meta.json`, JSON.stringify({ contentType }))
    return
  }

  await ensureBucket()
  await getS3().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
}

/** Returns a web ReadableStream of object bytes. */
export async function getObjectStream(key: string): Promise<ReadableStream> {
  if (localDir()) {
    const filePath = await localPath(key)
    const bytes = await readFile(filePath)
    return Readable.toWeb(Readable.from(bytes)) as ReadableStream
  }

  const result = await getS3().send(
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
    })
  )
  if (!result.Body) {
    throw new Error("Object body missing")
  }
  return result.Body.transformToWebStream()
}
