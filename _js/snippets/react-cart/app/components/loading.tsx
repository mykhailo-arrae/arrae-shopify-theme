import type React from 'react'
import styles from '../../styles.scss.js'

const Loading: React.FC = () => {
  return (
    <div className={styles.loading}>
      <svg
        className={styles.loading__spinner}
        width="25"
        height="24"
        viewBox="0 0 25 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12.4615 21C7.49098 21 3.46155 16.9706 3.46155 12C3.46155 7.02944 7.49098 3 12.4615 3"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>
    </div>
  )
}

export default Loading
