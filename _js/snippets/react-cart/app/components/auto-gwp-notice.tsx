import type { FC } from 'react'
import styles from '../../styles.scss.js'

type AutoGwpNoticeProps = {
  message: string | null
}

export const AutoGwpNotice: FC<AutoGwpNoticeProps> = ({ message }) => {
  if (!message) {
    return null
  }

  return (
    <p className={styles.progress__notice} role="alert">
      {message}
    </p>
  )
}
