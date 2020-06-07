import { h } from './util.js'

const PATH = '/profile.json'

customElements.define('pfrazee-contact-info', class extends HTMLElement {
  async connectedCallback () {
    try { var file = await beaker.hyperdrive.readFile(PATH) }
    catch (e) {
      console.debug(`No ${PATH} found`)
      return
    }
    try { var json = JSON.parse(file) } catch (e) {
      console.error(`Failed to parse ${PATH}`)
      console.error(e)
      return
    }
    
    if (json.addresses && Array.isArray(json.addresses)) {
      let tableEl = h('table')
      for (let address of json.addresses) {
        if (address.type === 'email') {
          tableEl.append(h('tr',
            h('td', 'Email'),
            h('td', h('a', {href: `mailto:${address.address}`}, address.address))
          ))
        } else if (address.type === 'profile') {
          tableEl.append(h('tr',
            h('td', address.service),
            h('td', h('a', {href: address.address}, strippedUrl(address.address)))
          ))
        }
      }
      this.append(tableEl)
    }
  }
})

function strippedUrl (v) {
  try {
    let url = new URL(v)
    return url.hostname + url.pathname
  } catch (e) {
    return v
  }
}