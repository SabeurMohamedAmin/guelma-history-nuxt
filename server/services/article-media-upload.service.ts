import sharp from 'sharp'
import type { FitEnum } from 'sharp'
import type { ImageVariants } from '~~/shared/types/article'
import { destroyManyFromCloudinary, uploadToCloudinary, type CloudinaryAsset } from '~~/server/utils/cloudinary'
import { validateArticleMediaFile } from '~~/server/utils/mediaFileValidation'

export const MAX_ARTICLE_MEDIA_BYTES = 100 * 1024 * 1024

export class ArticleMediaUploadService {
  async upload(data: Buffer, declaredType?: string) {
    if (data.length === 0) throw createError({ statusCode: 400, message: 'Uploaded file is empty.' })
    if (data.length > MAX_ARTICLE_MEDIA_BYTES) throw createError({ statusCode: 413, message: 'File is too large.' })
    const type = validateArticleMediaFile(data, declaredType)

    if (!type.startsWith('image/')) {
      const uploaded = await uploadToCloudinary(data)
      return {
        mediaId: uploaded.publicId,
        url: uploaded.url,
        type: 'video' as const,
        posterUrl: uploaded.posterUrl,
        publicId: uploaded.publicId,
        resourceType: 'video' as const,
        imageVariants: null,
      }
    }

    return this.uploadImage(data)
  }

  private async uploadImage(data: Buffer) {
    type VariantName = Exclude<keyof ImageVariants, 'original'>
    type Options = { width: number, height?: number, quality: number, fit: keyof FitEnum }
    const baseId = `image-${Date.now()}-${crypto.randomUUID()}`
    const created: CloudinaryAsset[] = []
    const variants: Record<VariantName, Options> = {
      thumbnail: { width: 320, height: 200, quality: 80, fit: 'fill' },
      slider: { width: 960, quality: 82, fit: 'fill' },
      main: { width: 1280, height: 800, quality: 82, fit: 'fill' },
    }

    try {
      const uploadedVariants = {} as Record<VariantName, string>
      for (const [name, options] of Object.entries(variants) as [VariantName, Options][]) {
        const buffer = await sharp(data, { failOn: 'error' }).rotate().resize({
          width: options.width,
          height: options.height,
          fit: options.fit,
          withoutEnlargement: true,
        }).webp({ quality: options.quality }).toBuffer()
        const uploaded = await uploadToCloudinary(buffer, 'articles', `${baseId}-${name}`)
        created.push({ publicId: uploaded.publicId, type: 'image' })
        uploadedVariants[name] = uploaded.url
      }

      const original = await uploadToCloudinary(data, 'articles', `${baseId}-original`)
      created.push({ publicId: original.publicId, type: 'image' })
      const imageVariants: ImageVariants = { ...uploadedVariants, original: original.url }

      return {
        mediaId: original.publicId,
        url: imageVariants.main,
        type: 'image' as const,
        posterUrl: null,
        publicId: original.publicId,
        resourceType: 'image' as const,
        imageVariants,
      }
    }
    catch (error) {
      await destroyManyFromCloudinary(created)
      throw error
    }
  }
}

export const articleMediaUploadService = new ArticleMediaUploadService()
