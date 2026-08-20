type DOMElements = {
  $videos: HTMLVideoElement[]
  $lazyVideos: HTMLVideoElement[]
}

type State = {
  observerConfigs: IntersectionObserverInit[]
  observers: IntersectionObserver[]
  once: boolean[]
}

type Events =
  | 'video:play'
  | 'video:pause'
  | 'video:mute'
  | 'video:unmute'
  | 'video:toggle:sound'
  | 'video:toggle:playback'

/** Must stay in sync with `core-video/styles.scss` (mq.min(large)). */
const CORE_VIDEO_DESKTOP_MEDIA = '(min-width: 1024px)'

export class CoreVideo extends HTMLElement {
  private dom: DOMElements
  private state: State
  private events: Map<Events, EventListener>
  private posterMediaListeners: Array<{
    mq: MediaQueryList
    listener: () => void
  }>

  constructor() {
    super()
    this.dom = {
      $videos: [],
      $lazyVideos: []
    }
    this.state = {
      observerConfigs: [],
      observers: [],
      once: []
    }
    this.posterMediaListeners = []
    this.events = new Map<Events, EventListener>([
      ['video:play', this.handlePlay],
      ['video:pause', this.handlePause],
      ['video:mute', this.handleMute],
      ['video:unmute', this.handleUnmute],
      ['video:toggle:sound', this.handleToggleSound],
      ['video:toggle:playback', this.handleTogglePlayback]
    ])
  }

  connectedCallback(): void {
    this.dom.$videos = Array.from(this.querySelectorAll('video'))
    this.dom.$lazyVideos = Array.from(
      this.querySelectorAll('.js-core-video-lazyload')
    )

    this.setupFiniteLoops()
    this.state.observerConfigs = this.dom.$lazyVideos.map(() => ({
      rootMargin: '250px',
      threshold: 0.01
    }))
    this.state.once = this.dom.$lazyVideos.map(() => false)

    this.bindEvents()
    this.dom.$videos.forEach((video) => {
      this.bindResponsivePoster(video)
    })

    if (!('IntersectionObserver' in window)) {
      this.loadAllVideos()
    } else {
      this.observeAllVideos()
    }
  }

  disconnectedCallback(): void {
    this.unbindEvents()
    this.teardownPosterMediaListeners()
    this.state.observers.forEach((observer, index) => {
      const element = this.dom.$lazyVideos[index] ?? null
      if (element) {
        observer.unobserve(element)
      }
    })
    this.state.observers = []
  }

  /** Sets `poster` from `data-poster-mobile` / `data-poster-desktop` for the current viewport. */
  private syncResponsiveDualPoster(video: HTMLVideoElement) {
    const mobile = video.getAttribute('data-poster-mobile')
    const desktop =
      video.getAttribute('data-poster-desktop') || video.getAttribute('poster')
    if (!mobile || !desktop) {
      return
    }
    const mq = window.matchMedia(CORE_VIDEO_DESKTOP_MEDIA)
    const next = mq.matches ? desktop : mobile
    if (video.getAttribute('poster') !== next) {
      video.setAttribute('poster', next)
    }
  }

  private bindResponsivePoster(video: HTMLVideoElement) {
    const mobile = video.getAttribute('data-poster-mobile')
    const desktop =
      video.getAttribute('data-poster-desktop') || video.getAttribute('poster')
    if (!mobile || !desktop) {
      return
    }

    const mq = window.matchMedia(CORE_VIDEO_DESKTOP_MEDIA)
    const listener = () => {
      this.syncResponsiveDualPoster(video)
    }

    const deferInitialPoster =
      video.classList.contains('js-core-video-lazyload') &&
      !video.hasAttribute('poster')

    if (!deferInitialPoster) {
      this.syncResponsiveDualPoster(video)
    }
    mq.addEventListener('change', listener)
    this.posterMediaListeners.push({ mq, listener })
  }

  private teardownPosterMediaListeners() {
    this.posterMediaListeners.forEach(({ mq, listener }) => {
      mq.removeEventListener('change', listener)
    })
    this.posterMediaListeners = []
  }

  private bindEvents() {
    for (const [eventName, handler] of this.events) {
      this.addEventListener(eventName, handler)
    }
  }

  private unbindEvents() {
    for (const [eventName, handler] of this.events) {
      this.removeEventListener(eventName, handler)
    }
  }

  private observeAllVideos() {
    this.dom.$lazyVideos.forEach((video, index) => {
      const observer = new IntersectionObserver(
        this.onIntersection.bind(this, index),
        this.state.observerConfigs[index] ?? {
          rootMargin: '250px',
          threshold: 0.01
        }
      )
      observer.observe(video)
      this.state.observers.push(observer)
    })
  }

  private onIntersection = (
    index: number,
    entries: IntersectionObserverEntry[]
  ) => {
    if (!this.state.once[index]) {
      const entry = entries[0] ?? null
      if (!entry) {
        return
      }
      const inview = entry.intersectionRatio > 0
      if (inview) {
        const element = this.dom.$lazyVideos[index] ?? null
        if (!element) {
          return
        }
        this.loadVideo(element)
        this.state.once[index] = true
        this.state.observers[index]?.unobserve(entry.target)
      }
    }
  }

  private loadAllVideos() {
    this.dom.$lazyVideos.forEach((video) => this.loadVideo(video))
  }

  /** Respect `<source media="…">` so lazy merge does not activate both desktop + mobile URLs. */
  private sourceMatchesViewport(source: HTMLSourceElement): boolean {
    const media = source.getAttribute('media')?.trim()
    if (!media) {
      return true
    }
    try {
      return window.matchMedia(media).matches
    } catch {
      return true
    }
  }

  private loadVideo(video: HTMLVideoElement) {
    if (video) {
      const poster = video.getAttribute('data-poster')
      if (poster) {
        video.setAttribute('poster', poster)
        video.removeAttribute('data-poster')
      }

      this.syncResponsiveDualPoster(video)

      const sources = video.getElementsByTagName('source')
      Array.from(sources).forEach((source) => {
        if (!this.sourceMatchesViewport(source)) {
          return
        }
        const src = source.getAttribute('data-src') || ''
        if (src) {
          source.setAttribute('src', src)
          source.removeAttribute('data-src')
        }
      })
      video.load()
      video.addEventListener(
        'loadeddata',
        () => {
          this.playVideo(video)
        },
        { once: true }
      )
    }
  }

  private playVideo(video: HTMLVideoElement) {
    const shouldPlay = video.hasAttribute('autoplay')
    if (shouldPlay) {
      video.play().catch((err) => {
        console.warn('Error playing the video', err)
      })
    }
  }

  /**
   * Stops a looping video after a finite number of play-throughs.
   *
   * Videos with `data-loop-count="N"` are rendered without the native `loop`
   * attribute (see core-video snippet) so the `ended` event fires once per
   * play-through. We replay until N play-throughs complete, then leave the
   * video on its final frame.
   */
  private setupFiniteLoops() {
    this.dom.$videos.forEach((video) => {
      const raw = video.getAttribute('data-loop-count')
      if (raw === null) {
        return
      }

      const total = Number.parseInt(raw, 10)
      if (!Number.isInteger(total) || total <= 0) {
        return
      }

      // Guard against stacking listeners if the element is re-attached.
      if (video.dataset.loopBound === 'true') {
        return
      }
      video.dataset.loopBound = 'true'

      let completedPlays = 0
      video.addEventListener('ended', () => {
        completedPlays += 1
        if (completedPlays < total) {
          video.currentTime = 0
          video.play().catch((err) => {
            console.warn('Error replaying the video', err)
          })
        }
      })
    })
  }

  private handlePlay = () => {
    this.dom.$videos.forEach((video) => {
      video.play().catch((err) => {
        console.warn('Error playing the video', err)
      })
    })
  }

  private handlePause = () => {
    this.dom.$videos.forEach((video) => {
      try {
        video.pause()
      } catch (err) {
        console.warn('Error pausing the video', err)
      }
    })
  }

  private handleMute = () => {
    this.dom.$videos.forEach((video) => {
      try {
        video.muted = true
      } catch (err) {
        console.warn('Error muting the video', err)
      }
    })
  }

  private handleUnmute = () => {
    this.dom.$videos.forEach((video) => {
      try {
        video.muted = false
      } catch (err) {
        console.warn('Error unmuting the video', err)
      }
    })
  }

  private handleToggleSound = () => {
    this.dom.$videos.forEach((video) => {
      const muted = video.muted
      try {
        video.muted = !muted
      } catch (err) {
        console.warn('Error toggling video sound', err)
      }
    })
  }

  private handleTogglePlayback = () => {
    this.dom.$videos.forEach((video) => {
      const paused = video.paused
      try {
        if (paused) {
          video.play().catch((err) => {
            console.warn('Error playing video', err)
          })
        } else {
          video.pause()
        }
      } catch (err) {
        console.warn('Error playing video', err)
      }
    })
  }
}
