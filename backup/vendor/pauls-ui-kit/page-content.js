import { h, executeJs } from './util.js'

var self = beaker.hyperdrive
async function stat (p) {
  return self.stat(p).catch(e => undefined)
}

customElements.define('pfrazee-page-content', class extends HTMLElement {
  constructor () {
    super()
    this.render()
  }

  async render () {
    // check existence
    var st
    var pathname = location.pathname
    if (pathname.endsWith('/')) {
      st = await stat(pathname + 'index.html')
      if (st) {
        pathname += 'index.html'
      } else if (st = await stat(pathname + 'index.md')) {
        pathname += 'index.md'
      }
    } else {
      st = await stat(pathname)
    }
    if (!st) {
      // 404
      this.append(h('h2', '404 Not Found'))
      return
    }

    // embed content
    if (/\.(png|jpe?g|gif|svg)$/i.test(pathname)) {
      this.append(h('img', {src: pathname}))
    } else if (/\.(mp4|webm|mov)/i.test(pathname)) {
      this.append(h('video', {controls: true}, h('source', {src: pathname})))
    } else if (/\.(mp3|ogg)/i.test(pathname)) {
      this.append(h('audio', {controls: true}, h('source', {src: pathname})))
    } else {
      let content = await self.readFile(pathname)
      // render content
      if (/\.(md|html)$/i.test(pathname)) {
        if (pathname.endsWith('.md')) {
          content = beaker.markdown.toHTML(content)
        }
        this.innerHTML = content
        executeJs(this)
      } else {
        this.append(h('pre', content))
      }
    }
  }
})
