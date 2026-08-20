import { initSection } from '../../core/shopify/init-section/index.js'
import { setupBlogLoadMore } from '../../project/blog/setup-blog-load-more.js'

initSection('.js-blog-main-section', (section) => {
  const loadMore = setupBlogLoadMore(section)

  return {
    unload: () => {
      loadMore.destroy()
    }
  }
})
