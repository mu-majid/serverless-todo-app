/**
 * Fields in a request to get a Pre-signed URL
 */
export interface CreateSignedURLRequest {
  Bucket: string,
  Key: string,
  Expires: string
}