import PocketBase, { type RecordModel } from 'pocketbase'

const pbUrl = import.meta.env.VITE_POCKETBASE_URL as string

if (!pbUrl) {
  throw new Error('VITE_POCKETBASE_URL est requis dans .env')
}

export const pb = new PocketBase(pbUrl)

export function fileUrl(record: RecordModel, filename: string | null | undefined): string | null {
  if (!filename) return null
  return pb.files.getURL(record, filename)
}
