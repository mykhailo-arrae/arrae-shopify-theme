export const getOuterWidth = (el: HTMLElement | null): number => {
  if (!el) {
    return 0
  }

  const style = getComputedStyle(el)

  return (
    el.getBoundingClientRect().width +
    Number.parseFloat(style.marginLeft) +
    Number.parseFloat(style.marginRight)
  )
}
