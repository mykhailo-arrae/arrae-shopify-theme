import { makeEventNamespace } from '../../core/dom/events/index.js'
import { findElements, findOneElement } from '../../core/dom/traversal/index.js'
import {
  makeVisibilityTracker,
  type VisibilityTracker
} from '../../core/dom/visibility-tracker/index.js'
import { initSnippet } from '../../core/shopify/init-snippet/index.js'
import { VideoControlsSchema } from './io.js'
import { style } from './styles.scss.js'

initSnippet('core-video-controls', (snippet) => {
  const settingsEl = findOneElement(snippet, '.js-video-controls-settings')
  const {
    videoClass,
    scrollAutoPlay,
    hideButtonOnPlay,
    playOnClickVideo,
    pausePageVideosOnPlay,
    intersectionThreshold
  } = VideoControlsSchema.parse(
    JSON.parse(settingsEl ? settingsEl.textContent || '' : '')
  )

  if (!videoClass) {
    return
  }

  const namespace = makeEventNamespace()

  let autoplayVisibilityTracker: VisibilityTracker | undefined

  const playButton = findOneElement(snippet, '.js-controls-play-button')
  const playIcon = findOneElement(snippet, '.js-controls-play-icon')
  const pauseIcon = findOneElement(snippet, '.js-controls-pause-icon')
  const muteButton = findOneElement(snippet, '.js-controls-mute-button')
  const muteIcon = findOneElement(snippet, '.js-controls-mute-icon')
  const unmuteIcon = findOneElement(snippet, '.js-controls-unmute-icon')
  const videos = findElements(document, `.${videoClass}`).filter(
    (v) => v instanceof HTMLVideoElement
  )
  const playLabel = playIcon?.dataset.ariaLabel
  const pauseLabel = pauseIcon?.dataset.ariaLabel
  const muteLabel = muteIcon?.dataset.ariaLabel
  const unmuteLabel = unmuteIcon?.dataset.ariaLabel

  const isElementVisible = (element: HTMLElement) => {
    return !!(
      element.offsetWidth ||
      element.offsetHeight ||
      element.getClientRects().length
    )
  }

  const showPlayIcon = () => {
    if (pauseIcon && playIcon) {
      playIcon.dataset.display = 'show'
      pauseIcon.dataset.display = 'hide'
    }

    if (playButton && hideButtonOnPlay) {
      playButton.classList.remove(style['controls__button--hidden'])
    }

    if (playButton && playLabel) {
      playButton.ariaLabel = playLabel
    }
  }

  const showPauseIcon = () => {
    if (pauseIcon && playIcon) {
      playIcon.dataset.display = 'hide'
      pauseIcon.dataset.display = 'show'
    }

    if (playButton && hideButtonOnPlay) {
      playButton.classList.add(style['controls__button--hidden'])
    }

    if (playButton && pauseLabel) {
      playButton.ariaLabel = pauseLabel
    }
  }

  const showMuteIcon = () => {
    if (muteIcon && unmuteIcon) {
      unmuteIcon.dataset.display = 'hide'
      muteIcon.dataset.display = 'show'
    }

    if (muteButton && muteLabel) {
      muteButton.ariaLabel = muteLabel
    }
  }

  const showUnmuteIcon = () => {
    if (muteIcon && unmuteIcon) {
      unmuteIcon.dataset.display = 'show'
      muteIcon.dataset.display = 'hide'
    }

    if (muteButton && unmuteLabel) {
      muteButton.ariaLabel = unmuteLabel
    }
  }

  const playVideo = (video: HTMLVideoElement) => {
    if (pausePageVideosOnPlay) {
      document.querySelectorAll('video').forEach((documentVideo) => {
        documentVideo.pause()
      })
    }

    video
      .play()
      .then(() => {
        showPauseIcon()
      })
      .catch((err) => {
        console.warn('Error playing the video', err)
      })
  }

  const pauseVideo = (video: HTMLVideoElement) => {
    video.pause()
    showPlayIcon()
  }

  const muteVideo = (video: HTMLVideoElement) => {
    video.muted = true
    showUnmuteIcon()
  }

  const unmuteVideo = (video: HTMLVideoElement) => {
    video.muted = false
    showMuteIcon()
  }

  const resetNonVisibleVideos = () => {
    const nonVisibleVideos = videos.filter((video) => !isElementVisible(video))
    nonVisibleVideos.forEach((video) => {
      video.pause()
      video.currentTime = 0
      video.muted = true
    })
  }
  resetNonVisibleVideos()

  const updateVideosControls = () => {
    videos
      .filter((video) => isElementVisible(video))
      .forEach((video) => {
        if (video.paused && pauseIcon && playIcon) {
          showPlayIcon()
        } else if (!video.paused && pauseIcon && playIcon) {
          showPauseIcon()
        }

        if (video.muted && muteIcon && unmuteIcon) {
          showUnmuteIcon()
        } else if (!video.muted && muteIcon && unmuteIcon) {
          showMuteIcon()
        }
      })
  }

  const handleResize = () => {
    resetNonVisibleVideos()
    updateVideosControls()
  }
  window.addEventListener('resize', handleResize)

  const bindVideoToggle = (video: HTMLVideoElement) => {
    video.addEventListener('click', () => {
      if (video.paused) {
        playVideo(video)
        unmuteVideo(video)
      } else {
        pauseVideo(video)
      }
    })
  }

  const bindActionListeners = (video: HTMLVideoElement) => {
    video.addEventListener('play', () => {
      showPauseIcon()
    })
    video.addEventListener('pause', () => {
      showPlayIcon()
    })
    video.addEventListener('volumechange', () => {
      if (video.muted) {
        showUnmuteIcon()
      } else {
        showMuteIcon()
      }
    })
  }

  videos.forEach((video) => {
    bindActionListeners(video)

    if (playOnClickVideo) {
      bindVideoToggle(video)
    }

    if (video.readyState >= 1) {
      updateVideosControls()
    } else {
      video.addEventListener('canplay', updateVideosControls, { once: true })
    }
  })

  if (scrollAutoPlay) {
    autoplayVisibilityTracker = makeVisibilityTracker({
      threshold: intersectionThreshold
    })

    videos.forEach((video) => {
      autoplayVisibilityTracker?.track(video, ({ isVisible }) => {
        if (isVisible) {
          playVideo(video)
        } else {
          pauseVideo(video)
        }
      })
    })
  }

  namespace.addDelegatedEventListener(
    snippet,
    '.js-controls-play-button',
    'click',
    () => {
      resetNonVisibleVideos()
      const visibleVideos = videos.filter((video) => isElementVisible(video))

      visibleVideos.forEach((video) => {
        if (!video.paused) {
          pauseVideo(video)
        } else {
          playVideo(video)
        }
      })
    }
  )

  namespace.addDelegatedEventListener(
    snippet,
    '.js-controls-mute-button',
    'click',
    () => {
      resetNonVisibleVideos()
      const visibleVideos = videos.filter((video) => isElementVisible(video))

      visibleVideos.forEach((video) => {
        if (video.muted) {
          unmuteVideo(video)
        } else {
          muteVideo(video)
        }
      })
    }
  )

  return () => {
    autoplayVisibilityTracker?.destroy()
    namespace.destroy()
    window.removeEventListener('resize', handleResize)
  }
})
