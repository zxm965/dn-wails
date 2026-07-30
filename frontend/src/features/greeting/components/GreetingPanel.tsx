import { type FormEvent, useState } from 'react'

import { appConfig } from '@/app/appConfig'
import appIcon from '@/assets/images/app-icon.png'

import { requestGreeting } from '../api/greetingApi'

import './GreetingPanel.css'

const DEFAULT_MESSAGE = 'Please enter your name below 👇'

export function GreetingPanel() {
  const [name, setName] = useState('')
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedName = name.trim()
    if (!normalizedName) {
      setErrorMessage('Please enter your name.')
      return
    }

    setErrorMessage('')
    setIsSubmitting(true)

    try {
      setMessage(await requestGreeting(normalizedName))
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to greet you. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className='greeting-panel' aria-labelledby='greeting-title'>
      <img className='greeting-logo' src={appIcon} alt={`${appConfig.displayName} app icon`} />
      <h1 id='greeting-title' className='greeting-title'>
        Welcome to {appConfig.displayName}
      </h1>
      <p className={`greeting-message${errorMessage ? ' is-error' : ''}`} role={errorMessage ? 'alert' : 'status'}>
        {errorMessage || message}
      </p>

      <form className='greeting-form' onSubmit={handleSubmit}>
        <label className='greeting-label' htmlFor='name'>
          Name
        </label>
        <div className='greeting-fields'>
          <input
            id='name'
            className='greeting-input'
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete='name'
            disabled={isSubmitting}
          />
          <button className='greeting-submit' type='submit' disabled={isSubmitting}>
            {isSubmitting ? 'Greeting…' : 'Greet'}
          </button>
        </div>
      </form>
    </section>
  )
}
