import { h, executeJs } from './util.js'

var self = beaker.hyperdrive
async function stat(p) {
  return self.stat(p).catch(e => undefined)
}

const regexImages = /\.(png|jpe?g|gif|svg|webp)$/i
const regexCode = /\.(js|py)$/i
const regexMD = /\.(md)$/i
const regexPDF = /\.(pdf)$/i
const regexGoto = /\.(goto)$/i

customElements.define('pfrazee-page-content', class extends HTMLElement {
  constructor() {
    super()
    this.render()
  }

  async renderFile(file, url, list) {
    const fs = await stat(url + file)
    
    const href = './' + file
    let icon = '📄' 

    if (fs) {  
      // console.debug(fs)
      
      if (fs.isDirectory()) {
        icon = '📁' 
      } else {
        if (regexMD.test(file)) {
          icon = '📝'
        }
        if (regexPDF.test(file)) {
          icon = '📔'
        }
        if (regexImages.test(file)) {
          icon = '🖼️'
        }
        if (regexCode.test(file)) {
          icon = '📜'
        }
        if (regexGoto.test(file)) {
          icon = '🌐'
        }
      }
      
      const label = h('span', h('span', { class: 'icon' }, icon), h('span', { class: 'file' }, file))
      
      const fileSize = `${(fs.size / 1024).toFixed(3)} KB`
      let title = `${file} (${fileSize})`

      if (fs.metadata && fs.metadata.href) {
        title = fs.metadata.href
      }

      if (fs.metadata && fs.metadata.title) {
        title = fs.metadata.title
      }
      
      list.append(h('li', h('a', {
          href,
          title, 
        },
        label
      )))
    }
    return list
  }

  /**
   * The body classList mutations will be replaced with customEvents
   */
  isLoading(state) {
     (state)
      ? document.body.classList.add('loading')
      : document.body.classList.remove('loading')
  }

  /**
   * Inspired By Kaezarrex
   * <hyper://b7169383b56c84ce41ac844813bb5240c5a9eb1e39e0b14b141b54a15532d17d/.ui/>
   */
  async renderDirectory(url, container) {
    const dir = await beaker.hyperdrive.readdir(url)
    const list = h('ul', { class: 'directory tags' })
    let promises = []
    let meta

    try {
      meta = await beaker.hyperdrive.readFile(url + 'index.json')
    } catch (error) {
      console.debug('No index.json found')
    }

    let dirInfo = h('h2', location.pathname)
    let dirMeta = h('div')
    let dirLength = `${dir.length} ${dir.length === 1 ? 'file' : 'files'}`
    let dirDesc = h('h3', dirLength)

    if (meta) {
      try {
        const metaData = JSON.parse(meta);
        // console.debug(metaData)
        if (metaData.title) {
          dirInfo = h('h2', metaData.title)
        }
        if (metaData.description) {
          dirDesc = h('h3', metaData.description)
        }
      } catch (error) {
        console.error('Error parsing index.json', error)
      }
    }

    dirMeta.append(dirInfo)
    dirMeta.append(dirDesc)

    // console.debug(dir)

    dir.sort((a, b) => {
      const nameA = a.toUpperCase(); // ignore upper and lowercase
      const nameB = b.toUpperCase(); // ignore upper and lowercase
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      // names must be equal
      return 0;
    })

    
    container.append(h('div', { class: 'directory-meta' }, dirMeta))
    
    dir.forEach(file => promises.push(this.renderFile(file, url, list)))

    return Promise.all(promises).then(() => {
      return list.outerHTML
    })
  }

  async render() {
    // check existence
    var st
    var pathname = location.pathname

    this.isLoading(1)
    
    document.body.classList.remove('home')

    if (pathname.endsWith('/')) {
      st = await stat(pathname + 'index.html')
      if (st) {
        pathname += 'index.html'
      } else if (st = await stat(pathname + 'index.md')) {
        pathname += 'index.md'
      // rendering directory
      } else {
        document.body.classList.add('directory')
        this.isLoading(0)
        const section = h('section')
        const div = h('div', { class: 'directory-listing' })
        div.innerHTML = await this.renderDirectory(location.pathname, section)
        section.append(div)
        this.append(section)
        return
      }
    } else {
      st = await stat(pathname)
    }

    if (!st) {
      // 404
      this.append(h('article',
        h('h2', `404 Not Found for ${pathname}`),
        h('p', `The content you are looking for at this path is not longer here or has never been here.`),
        h('p', 'Please contact me if this is not what you were expecting.')
      ))
      this.isLoading(0)
      document.body.classList.add('error')
      return
    }

    // embed content
    if (/\.(png|jpe?g|gif|svg|webp)$/i.test(pathname)) {
      this.append(h('article', h('img', { src: pathname, style: 'max-width:97vw;flex:1;', title: pathname, alt: pathname })))
      this.isLoading(0)
    } else if (/\.(mp4|webm|mov)/i.test(pathname)) {
      this.append(h('article', h('video', { controls: true }, h('source', { src: pathname }))))
      this.isLoading(0)
    } else if (/\.(mp3|ogg)/i.test(pathname)) {
      this.append(h('article', h('audio', { controls: true }, h('source', { src: pathname }))))
      this.isLoading(0)
    // Makes it look we're on a text file
    } else if (/\.(txt|log)/i.test(pathname)) {
      let content = await self.readFile(pathname)
      document.head.innerHTML = null
      document.title = pathname
      document.body.classList.add('binary')
      document.body.innerHTML = '<pre>' + content + '</pre>'
      this.isLoading(0)
    // Trying to still open binaries and PDF
    } else if (/\.(pdf|doc|zip|docx|rar)/i.test(pathname)) {
      document.body.classList.add('binary')
      const filename = pathname.split('/').slice(-1)[0]
      // The `download` attribute will trigger the file download
      const link = h('a', { href: pathname, download: filename, title: `Download ${filename}` }, pathname)
      this.append(h('section', h('article', link)))
      this.isLoading(0)
    } else if (/\.(goto)$/i.test(pathname)) {
      // console.debug(st)
      if (st.metadata) {
        this.append(h('article', h('a', { href: st.metadata.href }, st.metadata.title)))
      } else {
        this.append(h('article', pathname))
      }
      this.isLoading(0)
    // Render md or html
    } else {
      let content = await self.readFile(pathname)
      // render content
      if (/\.(md|html)$/i.test(pathname)) {
        if (pathname.endsWith('.md')) {
          document.body.classList.remove('home')
          document.body.classList.add('md')
          content = '<section><article>' + beaker.markdown.toHTML(content) + '</article></section>'
        } else {
          document.body.classList.add('home','html')
        }
        this.innerHTML = content
        this.isLoading(0)
        executeJs(this)
      } else {
        document.body.classList.add('code')
        this.append(h('article', h('pre', h('code', content))))
        this.isLoading(0)
      }
    }
  }
})
