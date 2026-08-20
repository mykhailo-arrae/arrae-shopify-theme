export type CreateUrlParams = {
  inputUrl: string
  productHandle: string
  variantId: number | null
}

export const updateUrl = ({
  inputUrl,
  productHandle,
  variantId
}: CreateUrlParams): string => {
  const url = new URL(inputUrl)

  const pathSegments = url.pathname.split('/')
  const actualHandle = pathSegments[pathSegments.length - 1]
  const pageType = pathSegments[pathSegments.length - 2]

  if (pageType !== 'products') {
    return inputUrl
  }

  if (actualHandle !== productHandle) {
    return inputUrl
  }

  if (variantId) {
    url.searchParams.set('variant', variantId.toString())
  } else {
    url.searchParams.delete('variant')
  }

  // Selling plan is derived from the selected variant in product-options.
  url.searchParams.delete('selling_plan')

  return url.toString()
}

export type UpdateAddressBarParams = {
  productHandle: string
  variantId?: number | null
}

export const updateAddressBar = ({
  productHandle,
  variantId = null
}: UpdateAddressBarParams): void => {
  try {
    const inputUrl = window.location.href
    const nextUrl = updateUrl({
      inputUrl,
      productHandle,
      variantId
    })

    if (nextUrl === inputUrl) {
      return
    }

    window.history.replaceState(null, document.title, nextUrl)
  } catch (err) {
    console.error(err)
  }
}
