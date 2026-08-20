import { html, LitElement, nothing, type TemplateResult, unsafeCSS } from 'lit'
import { property } from 'lit/decorators.js'
import { z } from 'zod'
import { ImplementationError } from '../../core/errors/implementation-error.js'
import { mutedIcon, unmutedIcon } from './icons.js'
import { shadowStyles } from './style.shadow.scss'

const Context = z.object({
  locales: z.object({
    mute: z.string(),
    unmute: z.string()
  })
})
export type Context = z.infer<typeof Context>

export class InternalDemoMuteButton extends LitElement {
  static override styles = [unsafeCSS(shadowStyles)]
  context: Context

  @property()
  accessor sound: 'muted' | 'unmuted' = 'muted'

  private _toggleSound = (): void => {
    this.sound = this.sound === 'muted' ? 'unmuted' : 'muted'
  }

  constructor() {
    super()

    const script = this.querySelector('script[type="application/json"]')

    if (script == null) {
      throw new ImplementationError('Context JSON script not found')
    }

    const contextResult = Context.safeParse(
      JSON.parse(script.textContent || '{}')
    )

    if (!contextResult.success) {
      throw new ImplementationError('Context JSON script is invalid', {
        issues: contextResult.error.issues
      })
    }

    this.context = contextResult.data
  }

  override connectedCallback(): void {
    super.connectedCallback()

    // eslint-disable-next-line no-console
    console.log('Connected')
  }

  protected override render(): typeof nothing | TemplateResult<1> {
    if (this.context == null) {
      return nothing
    }

    return html`
    <div class="container">
      <div class="icon">
        <div class="icon-placeholder">
          ${this.sound === 'muted' ? mutedIcon : unmutedIcon}
        </div>
      </div>
      <div class="label">
        ${this.sound === 'muted' ? this.context.locales.unmute : this.context.locales.mute}
      </div>
      <button class="button" type='button' @click=${this._toggleSound}>
        ${this.sound === 'muted' ? this.context.locales.unmute : this.context.locales.mute}
      </button>
    </div>
    `
  }
}
