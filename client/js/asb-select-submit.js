/* global HTMLElement, customElements */

class AsbSelectSubmit extends HTMLElement {
  connectedCallback () {
    this.form = this.querySelector('form')
    this.submit = this.querySelector('input[type=submit]')

    this.submit.classList.add('hidden')
    this.addEventListener('change', (e) => {
      this.form.submit()
    })
  }
}

customElements.define('asb-select-submit', AsbSelectSubmit)
