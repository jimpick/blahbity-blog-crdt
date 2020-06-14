import { h } from './util.js'

const IFRAME_CSP = `default-src 'self' 'unsafe-inline';`
const IFRAME_SANDBOX = `allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox`

const PATH = '/microblog/'

customElements.define('pfrazee-microblog', class extends HTMLElement {
  async connectedCallback () {
    try {
      var files = await beaker.hyperdrive.query({
        path: PATH + '*',
        sort: 'ctime',
        reverse: true,
        limit: this.hasAttribute('limit') ? Number(this.getAttribute('limit')) : 100
      })
    } catch (e) {
      console.debug(`Unable to query ${PATH}`)
      return
    }

    for (let file of files) {
      let filename = file.path.split('/').pop()
      let day = niceDate(file.stat.ctime)
      this.append(h('div', {class: 'meta'}, 
        h('a', {href: file.path, title: filename}, filename),
        ' ',
        day
      ))

      let content
      try {
        if (/\.(png|jpe?g|gif|svg)$/i.test(file.path)) {
         content = h('p', h('img', {src: file.path}))
        } else if (/\.(mp4|webm|mov)/i.test(file.path)) {
         content = h('p', h('video', {controls: true}, h('source', {src: file.path})))
        } else if (/\.(mp3|ogg)/i.test(file.path)) {
         content = h('p', h('audio', {controls: true}, h('source', {src: file.path})))
        } else if (/\.goto?$/i.test(file.path)) {
          let title = file.stat.metadata.title || filename
          content = h('p', h('a', {href: file.stat.metadata.href, title}, title))
        } else if (/\.html?$/i.test(file.path)) {
          content = h('iframe', {
            class: 'content',
            csp: IFRAME_CSP,
            sandbox: IFRAME_SANDBOX,
            src: file.url,
            width: '100%'
          })
        } else {
          let txt = await beaker.hyperdrive.readFile(file.url)
          if (/\.md$/i.test(file.path)) {
            content = h('div', {class: 'content'})
            content.innerHTML = beaker.markdown.toHTML(txt)
          } else {
            content = h('div', {class: 'content'}, h('pre', txt))
          }
        }
      } catch (e) {
        console.error('Failed to read', file.path)
        console.error(e)
        continue
      }

      this.append(h('div', {class: 'content'}, content))
    }
  }
})

var today = (new Date()).toLocaleDateString()
var yesterday = (new Date(Date.now() - 8.64e7)).toLocaleDateString()
function niceDate (ts) {
  var date = (new Date(ts)).toLocaleDateString()
  if (date === today) return 'Today'
  if (date === yesterday) return 'Yesterday'
  return date
}