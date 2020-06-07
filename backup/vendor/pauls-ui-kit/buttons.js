customElements.define('pfrazee-add-contact-button', class extends HTMLButtonElement {
  connectedCallback () {
    this.textContent = 'Add to Address Book'
    this.addEventListener('click', e => {
      beaker.contacts.requestAddContact(location.hostname)
    })
  }
}, {extends: 'button'})