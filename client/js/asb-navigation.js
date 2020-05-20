/* global customElements, HTMLElement */

class AsbNavigation extends HTMLElement {
  connectedCallback () {
    this.button = this.querySelector('button')
    this.list = this.querySelector('ul')
    this.button.addEventListener('focus', this.openMenu)
    this.button.addEventListener('focusout', this.closeMenu)
    document.querySelector('a').addEventListener('click', (e) => {
      console.log(e)
    })
  }

  disconnectedCallback () {
    this.button.removeEventListener('focus', this.openMenu)
    this.button.removeEventListener('focusout', this.closeMenu)
  }

  get openMenu () {
    if (this._openMenu) { return this._openMenu }

    this._openMenu = (e) => {
      this.button.setAttribute('aria-expanded', 'true')
      this.list.removeAttribute('hidden')
    }

    return this._openMenu
  }

  get closeMenu () {
    if (this._closeMenu) { return this._closeMenu }

    this._closeMenu = (e) => {
      setTimeout(() => {
        this.button.setAttribute('aria-expanded', 'false')
        this.list.setAttribute('hidden', true)
      }, 100)
    }

    return this._closeMenu
  }
}

customElements.define('asb-navigation', AsbNavigation, { extends: 'nav' })
