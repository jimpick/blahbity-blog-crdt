import { h } from './util.js'

class PfrazeeLinks extends HTMLElement {
  async connectedCallback () {
    var path = this.getAttribute('path')
    path = path.endsWith('/') ? (path + '*.goto') : (path + '/*.goto')

    try {
      var gotos = await beaker.hyperdrive.query({path, sort: 'name'})
    } catch (e) {
      console.debug(`Failed to query ${path}`)
      return
    }

    this.render(gotos)
  }

  render (gotos) {
    var ul = h('ul')
    for (let goto of gotos) {
      let title = goto.stat.metadata.title || goto.path.split('/').pop()
      ul.append(h('li',
        h('a', {href: goto.stat.metadata.href, title}, title),
        this.hasAttribute('include-description') ? ` ${goto.stat.metadata.description || ''}` : ''
      ))
    }
    this.append(ul)
  }
}
customElements.define('pfrazee-links', PfrazeeLinks)

customElements.define('pfrazee-links-table', class extends PfrazeeLinks {
  render (gotos) {
    var table = h('table')
    for (let goto of gotos) {
      let title = goto.stat.metadata.title || goto.path.split('/').pop()
      table.append(h('tr',
        h('td', goto.stat.metadata.description || ''),
        h('td', h('a', {href: goto.stat.metadata.href, title}, title))
      ))
    }
    this.append(table)
  }
})

customElements.define('pfrazee-links-detailed', class extends PfrazeeLinks {
  render (gotos) {
    for (let goto of gotos) {
      let title = goto.stat.metadata.title || goto.path.split('/').pop()
      this.append(h('div', {class: 'item'},
        h('p', {class: 'title'}, h('a', {href: goto.stat.metadata.href, title}, title)),
        h('p', {class: 'description'}, goto.stat.metadata.description || '')
      ))
    }
  }
})