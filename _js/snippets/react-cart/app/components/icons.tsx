import { type ReactElement, useId } from 'react'

export const IconPlus = (): ReactElement => {
  const titleId = useId()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
    >
      <title id={titleId}>Plus</title>
      <path
        d="M15.292 9.89453C15.4882 9.89453 15.6475 10.0538 15.6475 10.25V14.2695H19.667C19.8632 14.2695 20.0224 14.4289 20.0225 14.625C20.0224 14.8211 19.8632 14.9805 19.667 14.9805H15.6475V19C15.6474 19.1961 15.4882 19.3555 15.292 19.3555C15.0959 19.3554 14.9366 19.1961 14.9365 19V14.9805H10.917C10.7208 14.9805 10.5616 14.8211 10.5615 14.625C10.5616 14.4289 10.7208 14.2695 10.917 14.2695H14.9365V10.25C14.9365 10.0538 15.0958 9.89461 15.292 9.89453Z"
        fill="currentColor"
      />
    </svg>
  )
}

export const IconMinus = (): ReactElement => {
  const titleId = useId()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
    >
      <title id={titleId}>Minus</title>
      <path
        d="M20.4427 14.9062C20.6499 14.9063 20.8177 15.0741 20.8177 15.2812C20.8177 15.4884 20.6499 15.6562 20.4427 15.6562H9.75525C9.54814 15.6562 9.38025 15.4884 9.38025 15.2812C9.38025 15.0741 9.54814 14.9063 9.75525 14.9062H20.4427Z"
        fill="currentColor"
      />
    </svg>
  )
}

export const IconButtonPlus = (): ReactElement => {
  const titleId = useId()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-labelledby={titleId}
    >
      <title id={titleId}>Add to Cart</title>
      <path d="M6 0L6 12M0 6H12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export const IconButtonArrowPrev = (): ReactElement => {
  const titleId = useId()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="25"
      height="24"
      viewBox="0 0 25 24"
      fill="none"
      aria-labelledby={titleId}
    >
      <title id={titleId}>Previous</title>
      <path
        d="M24.7072 11.5536H1.50715M11.9072 0.353577L0.707153 11.5536L11.9072 22.7536"
        stroke="currentColor"
      />
    </svg>
  )
}

export const IconDropDownArrow = (): ReactElement => {
  const titleId = useId()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
    >
      <title id={titleId}>Expand</title>
      <path
        d="M15.0879 12.6562C15.1816 12.6563 15.27 12.6733 15.3516 12.707C15.4358 12.7419 15.5165 12.8 15.5918 12.8779L19.1807 16.5918C19.26 16.6739 19.3115 16.7681 19.3115 16.8721C19.3115 16.9761 19.26 17.0692 19.1807 17.1514C19.0983 17.2366 19.0001 17.2878 18.8877 17.2773C18.7885 17.268 18.702 17.2248 18.6318 17.1523L15.3106 13.7168L15.3096 13.7158L15.0879 13.4727L14.8672 13.7158L14.8652 13.7168L11.5449 17.1523C11.466 17.2339 11.3734 17.2881 11.2695 17.2881C11.1658 17.2881 11.074 17.2338 10.9951 17.1523C10.9125 17.0669 10.8653 16.9658 10.875 16.8535C10.8839 16.7534 10.9251 16.6652 10.9951 16.5928L14.585 12.8779C14.6602 12.8002 14.7401 12.7419 14.8242 12.707C14.9058 12.6733 14.9942 12.6563 15.0879 12.6562Z"
        fill="currentColor"
      />
    </svg>
  )
}

export const IconButtonArrowNext = (): ReactElement => {
  const titleId = useId()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="25"
      height="24"
      viewBox="0 0 25 24"
      fill="none"
      aria-labelledby={titleId}
    >
      <title id={titleId}>Next</title>
      <path
        d="M0 11.5536H23.2M12.8 0.353577L24 11.5536L12.8 22.7536"
        stroke="currentColor"
      />
    </svg>
  )
}

export const IconButtonRemove = (): ReactElement => {
  const titleId = useId()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
    >
      <title id={titleId}>Remove from Cart</title>
      <path
        d="M19.3065 10.119C19.4652 9.96035 19.7224 9.96037 19.881 10.119C20.0396 10.2777 20.0397 10.5349 19.881 10.6935L16.0745 14.5L19.881 18.3065C20.0396 18.4652 20.0397 18.7224 19.881 18.881C19.7224 19.0397 19.4652 19.0396 19.3065 18.881L15.5 15.0745L11.6935 18.881C11.5349 19.0397 11.2777 19.0396 11.119 18.881C10.9604 18.7224 10.9604 18.4652 11.119 18.3065L14.9247 14.5L11.119 10.6935C10.9603 10.5348 10.9603 10.2777 11.119 10.119C11.2777 9.96033 11.5348 9.96033 11.6935 10.119L15.5 13.9247L19.3065 10.119Z"
        fill="currentColor"
      />
    </svg>
  )
}
