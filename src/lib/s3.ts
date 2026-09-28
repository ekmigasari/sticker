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

export function getBucket() {
  return required("S3_BUCKET")
}

export function getS3() {
  if (!client) {
    const endpoint = process.env.S3_ENDPOINT
    client = new S3Client({
      region: process.env.S3_REGION || "us-east-1",
      endpoint: endpoint || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: required("S3_ACCESS_KEY_ID"),
        secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
      },
    })
  }
  return client
}

export async function ensureBucket() {
  if (process.env.S3_AUTO_CREATE_BUCKET !== "true") return
  const s3 = getS3()
  const Bucket = getBucket()
  try {
    await s3.send(new HeadBucketCommand({ Bucket }))
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket }))
  }
}

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string
) {
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

export async function getObject(key: string) {
  const result = await getS3().send(
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
    })
  )
  return result.Body
}
