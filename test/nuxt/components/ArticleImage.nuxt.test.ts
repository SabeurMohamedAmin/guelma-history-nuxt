import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ArticleImage from '../../../app/components/ArticleImage.vue'

// Keep these tests independent of IPX and remote image availability.
const NuxtImgStub = defineComponent({
  props: ['src', 'alt'],
  emits: ['error'],
  template: '<img :src="src" :alt="alt" @error="$emit(\'error\')">',
  mounted() {
    // happy-dom does not fetch image files, so make the initial source behave
    // like a successfully loaded image unless a test explicitly emits error.
    Object.defineProperty(this.$el, 'naturalWidth', { configurable: true, value: 1 })
  },
})

async function mountImage(src: string | null) {
  return mountSuspended(ArticleImage, {
    props: { src, alt: 'Guelma archive' },
    attrs: { width: '400', height: '220', loading: 'lazy', class: 'article-cover' },
    global: { stubs: { NuxtImg: NuxtImgStub } },
  })
}

describe('ArticleImage', () => {
  it('preserves the source, alternative text and layout attributes', async () => {
    const wrapper = await mountImage('/archive.jpg')
    const image = wrapper.get('img')
    expect(image.attributes()).toMatchObject({
      src: '/archive.jpg', alt: 'Guelma archive', width: '400', height: '220', loading: 'lazy',
    })
    expect(image.classes()).toContain('article-cover')
    wrapper.unmount()
  })

  it.each([null, '', '   '])('uses the local placeholder when the source is %s', async (src) => {
    const wrapper = await mountImage(src)
    expect(wrapper.get('img').attributes('src')).toBe('/img/image-placeholder.svg')
    expect(wrapper.get('img').attributes('alt')).toBe('')
    wrapper.unmount()
  })

  it('falls back once on error without retrying a broken source', async () => {
    const wrapper = await mountImage('/missing.jpg')
    await wrapper.get('img').trigger('error')
    expect(wrapper.get('img').attributes('src')).toBe('/img/image-placeholder.svg')
    expect(wrapper.get('img').attributes('alt')).toBe('')
    await wrapper.get('img').trigger('error')
    expect(wrapper.get('img').attributes('src')).toBe('/img/image-placeholder.svg')
    wrapper.unmount()
  })

  it('tries a new source when the article image changes', async () => {
    const wrapper = await mountImage('/missing.jpg')
    await wrapper.get('img').trigger('error')
    await wrapper.setProps({ src: '/replacement.jpg' })
    expect(wrapper.get('img').attributes('src')).toBe('/replacement.jpg')
    expect(wrapper.get('img').attributes('alt')).toBe('Guelma archive')
    wrapper.unmount()
  })
})
