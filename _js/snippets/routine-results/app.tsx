import {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { initCart } from '../../core/cart-v2/index.js'
import type { SingleItemPayload } from '../../core/cart-v2/operations/add-items/payload.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import { initMainBus } from '../../core/messaging/main/index.js'
import { formatMoney } from '../../core/shopify/format-money.js'
import {
  findMatchingEntry,
  type RoutineCreatorResults,
  type RoutineResultProduct,
  type RoutineSettings
} from './io.js'
import styles from './styles.scss.js'

type Props = {
  snippet: HTMLElement
  entries: RoutineCreatorResults
  settings: RoutineSettings
}

type RoutineState =
  | { kind: 'idle' }
  | { kind: 'matched'; products: RoutineResultProduct[] }
  | { kind: 'no-match' }

type AddingState = { id: number | 'all' } | null

const ROUTINE_SHOW_EVENT = 'routine:show'
const ROUTINE_CLOSE_EVENT = 'routine:close'
const ADD_ALL_SELECTOR = '.js-routine-add-all'
const ADD_ALL_LABEL_SELECTOR = '.js-routine-add-all-label'
const CLOSE_BUTTON_SELECTOR = '.js-routine-results-close'
const TITLE_SELECTOR = '.js-routine-results-title'

const isAnswers = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

const extractAnswersFromDetail = (detail: unknown): string[] | null => {
  if (detail == null || typeof detail !== 'object') {
    return null
  }

  if (!('answers' in detail)) {
    return null
  }

  const answers = detail.answers
  return isAnswers(answers) ? answers : null
}

type ServerHtmlProps = {
  html: string
  className?: string
}

const ServerHtml: FC<ServerHtmlProps> = ({ html, className }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el == null || el.innerHTML === html) {
      return
    }
    el.innerHTML = html
  }, [html])

  return <div ref={ref} className={className} />
}

const dedupeProductsById = (
  products: RoutineResultProduct[]
): RoutineResultProduct[] => {
  const seen = new Set<number>()
  const out: RoutineResultProduct[] = []
  for (const product of products) {
    if (seen.has(product.productId)) {
      continue
    }
    seen.add(product.productId)
    out.push(product)
  }
  return out
}

export const App: FC<Props> = ({ snippet, entries, settings }) => {
  const [state, setState] = useState<RoutineState>({ kind: 'idle' })
  const [adding, setAdding] = useState<AddingState>(null)
  const cart = useMemo(() => initCart(), [])
  const mainBus = useMemo(() => initMainBus(), [])
  const labels = settings.labels
  const isAdding = adding != null

  const products: RoutineResultProduct[] = useMemo(() => {
    if (state.kind !== 'matched') {
      return []
    }
    return state.products
  }, [state])

  const totalPrice = useMemo(() => {
    const total = products.reduce((acc, product) => {
      return product.availableForSale ? acc + product.price : acc
    }, 0)
    return total
  }, [products])

  const handleClose = useCallback(() => {
    snippet.dispatchEvent(
      new CustomEvent(ROUTINE_CLOSE_EVENT, { bubbles: true })
    )
  }, [snippet])

  const handleAddSingleToCart = useCallback(
    async (product: RoutineResultProduct) => {
      if (!product.availableForSale || adding != null) {
        return
      }

      setAdding({ id: product.productId })

      try {
        const items: SingleItemPayload[] = [
          { id: product.variantId, quantity: 1 }
        ]

        const result = await cart.sendAsync({
          type: 'AddItems',
          payload: { items }
        })

        if (result === 'busy') {
          console.warn('Cart is busy, please try again')
          return
        }

        handleClose()

        mainBus.send({
          name: 'request:open-cart-drawer',
          details: null,
          source: { type: 'global' }
        })
      } finally {
        setAdding(null)
      }
    },
    [cart, mainBus, handleClose, adding]
  )

  const handleAddAllToCart = useCallback(async () => {
    if (adding != null) {
      return
    }

    const items: SingleItemPayload[] = []
    for (const product of products) {
      if (!product.availableForSale) {
        continue
      }
      items.push({ id: product.variantId, quantity: 1 })
    }

    if (items.length === 0) {
      return
    }

    setAdding({ id: 'all' })

    try {
      const result = await cart.sendAsync({
        type: 'AddItems',
        payload: { items }
      })

      if (result === 'busy') {
        console.warn('Cart is busy, please try again')
        return
      }

      handleClose()

      mainBus.send({
        name: 'request:open-cart-drawer',
        details: null,
        source: { type: 'global' }
      })
    } finally {
      setAdding(null)
    }
  }, [products, cart, mainBus, handleClose, adding])

  useEffect(() => {
    const handleShow = (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        return
      }

      const detail: unknown = event.detail
      const answers = extractAnswersFromDetail(detail)
      if (answers == null) {
        return
      }

      const matched = findMatchingEntry(entries, answers)
      if (matched == null) {
        setState({ kind: 'no-match' })
        return
      }

      const recommendedProducts = dedupeProductsById(matched.results)

      setState({
        kind: 'matched',
        products: recommendedProducts
      })
    }

    snippet.addEventListener(ROUTINE_SHOW_EVENT, handleShow)
    const parentSection = snippet.closest('.shopify-section')
    if (parentSection != null) {
      parentSection.addEventListener(ROUTINE_SHOW_EVENT, handleShow)
    }

    return () => {
      snippet.removeEventListener(ROUTINE_SHOW_EVENT, handleShow)
      if (parentSection != null) {
        parentSection.removeEventListener(ROUTINE_SHOW_EVENT, handleShow)
      }
    }
  }, [snippet, entries])

  useEffect(() => {
    const titleEls = findElements(snippet, TITLE_SELECTOR)
    titleEls.forEach((el) => {
      el.textContent = labels.resultsTitle
    })

    const closeButtons = findElements(snippet, CLOSE_BUTTON_SELECTOR)
    closeButtons.forEach((el) => {
      el.setAttribute('aria-label', labels.close)
    })
  }, [snippet, labels.close, labels.resultsTitle])

  useEffect(() => {
    const closeButton = findOneElement(snippet, CLOSE_BUTTON_SELECTOR)
    if (closeButton == null) {
      return
    }

    const onClick = () => {
      handleClose()
    }

    closeButton.addEventListener('click', onClick)
    return () => {
      closeButton.removeEventListener('click', onClick)
    }
  }, [snippet, handleClose])

  useEffect(() => {
    // Any click that lands on the host but outside the snippet — i.e. on the
    // blurred area next to the drawer panel — should dismiss the drawer.
    const host = snippet.parentElement
    if (host == null) {
      return
    }

    const onHostClick = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return
      }
      if (snippet.contains(event.target)) {
        return
      }
      handleClose()
    }

    host.addEventListener('click', onHostClick)
    return () => {
      host.removeEventListener('click', onHostClick)
    }
  }, [snippet, handleClose])

  useEffect(() => {
    // Pressing Escape while the routine results drawer is open dismisses it.
    const host = snippet.parentElement
    if (host == null) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      if (host.getAttribute('data-expanded') !== 'true') {
        return
      }
      handleClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [snippet, handleClose])

  useEffect(() => {
    const addAllButton = findOneElement(snippet, ADD_ALL_SELECTOR)
    if (addAllButton == null) {
      return
    }

    const labelEl = findOneElement(addAllButton, ADD_ALL_LABEL_SELECTOR)
    const isAddingAll = adding?.id === 'all'
    const totalLabel = isAddingAll
      ? labels.addingToCart
      : products.length > 0
        ? `${labels.addAllToCart} - ${formatMoney(totalPrice, settings.moneyFormat)}`
        : labels.addAllToCart

    if (labelEl != null) {
      labelEl.textContent = totalLabel
    } else {
      addAllButton.textContent = totalLabel
    }

    const hasAnyAvailable = products.some((p) => p.availableForSale)
    addAllButton.toggleAttribute('disabled', !hasAnyAvailable || isAdding)

    const onClick = () => {
      void handleAddAllToCart()
    }

    addAllButton.addEventListener('click', onClick)
    return () => {
      addAllButton.removeEventListener('click', onClick)
    }
  }, [
    snippet,
    products,
    totalPrice,
    handleAddAllToCart,
    labels.addAllToCart,
    labels.addingToCart,
    settings.moneyFormat,
    adding,
    isAdding
  ])

  if (state.kind === 'idle') {
    return null
  }

  if (state.kind === 'no-match') {
    return (
      <p className={styles.error} role="alert">
        {labels.errorMessage}
      </p>
    )
  }

  return (
    <ul className={styles.products}>
      {products.map((product) => (
        <li key={product.productId} className={styles.product}>
          {product.routineTitle !== '' ? (
            <h4 className={styles.product__heading}>{product.routineTitle}</h4>
          ) : null}
          {product.routineDescription !== '' ? (
            <p className={styles.product__subheading}>
              {product.routineDescription}
            </p>
          ) : null}
          <div className={styles.product__row}>
            <a
              href={product.url}
              className={styles.product__media}
              tabIndex={-1}
              aria-hidden="true"
            >
              {product.featuredImage != null && product.featuredImage !== '' ? (
                <img
                  src={product.featuredImage}
                  alt=""
                  loading="lazy"
                  className={styles.product__image}
                />
              ) : null}
            </a>
            <div className={styles.product__content}>
              {product.reviewsHtml !== '' ? (
                <ServerHtml
                  className={styles.product__reviews}
                  html={product.reviewsHtml}
                />
              ) : null}
              <h5 className={styles.product__title}>
                <a href={product.url} className={styles.product__link}>
                  {product.title}
                </a>
              </h5>
              {product.description !== '' ? (
                <p className={styles.product__description}>
                  {product.description}
                </p>
              ) : null}
              <p className={styles.product__price}>
                {formatMoney(product.price, settings.moneyFormat)}
              </p>
              <button
                type="button"
                className={
                  styles.product__atc + ' ' + styles.product__atc_desktop
                }
                onClick={() => {
                  void handleAddSingleToCart(product)
                }}
                disabled={!product.availableForSale || isAdding}
              >
                {adding?.id === product.productId
                  ? labels.addingToCart
                  : product.availableForSale
                    ? labels.addToCart
                    : labels.soldOut}
              </button>
            </div>
          </div>
          <button
            type="button"
            className={styles.product__atc + ' ' + styles.product__atc_mobile}
            onClick={() => {
              void handleAddSingleToCart(product)
            }}
            disabled={!product.availableForSale || isAdding}
          >
            {adding?.id === product.productId
              ? labels.addingToCart
              : product.availableForSale
                ? labels.addToCart
                : labels.soldOut}
          </button>
        </li>
      ))}
    </ul>
  )
}
