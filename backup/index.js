import * as api from './api.js'
import BBSetup from './components/bb-setup.js'
import BBReplicas from './components/bb-replicas.js'

const IFRAME_CSP = `default-src 'self' 'unsafe-inline';`
const IFRAME_SANDBOX = `allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox`

const PATH = '/microblog/'
var profile = undefined
var remoteInfo = undefined

try {
  profile = JSON.parse(localStorage.profile)
} catch (e) {
  console.debug('load profile', e)
}
try {
  remoteInfo = JSON.parse(localStorage.remoteInfo)
} catch (e) {
  console.debug('load remoteInfo', e)
}

customElements.define('bb-setup', BBSetup)
customElements.define('bb-replicas', BBReplicas)

if (profile && !remoteInfo) {
  const replicasEl = document.createElement('bb-replicas')
  document.querySelector('header').appendChild(replicasEl)
}

if (remoteInfo) {
  document
    .querySelector('header')
    .appendChild(
      h(
        'div',
        'Remote replica [',
        h('a', { href: remoteInfo.primaryProfileUrl }, 'primary profile'),
        ']'
      )
    )
}

customElements.define(
  'bb-composer',
  class extends HTMLElement {
    constructor () {
      super()
      this.preview = null
    }

    async connectedCallback () {
      if (!profile && !remoteInfo) {
        this.append(h('bb-setup'))
      } else if (remoteInfo && remoteInfo.state === 'created') {
        this.append(h('bb-setup'))
      } else {
        this.preview = h('div', {
          class: 'preview content'
        })
        this.append(
          h(
            'form',
            { submit: this.onSubmit },
            h(
              'p',
              h('textarea', {
                name: 'content',
                required: true,
                placeholder: 'Enter your post here',
                input: this.onChange.bind(this)
              })
            ),
            this.preview,
            h(
              'p',
              h('input', {
                name: 'filename',
                placeholder: 'Post filename (optional)'
              }),
              h(
                'button',
                { type: 'submit' },
                `Post to ${profile.title}'s microblog`
              ),
              ' ',
              h(
                'small',
                h(
                  'a',
                  {
                    href: '#',
                    click: this.onClickChangeProfile.bind(this)
                  },
                  'Change profile'
                )
              )
            )
          )
        )
      }
    }

    onChange (e) {
      e.preventDefault()
      var content = e.target.value
      this.preview.innerHTML = beaker.markdown.toHTML(content)
    }

    async onSubmit (e) {
      e.preventDefault()
      var filename = e.target.filename.value
      var content = e.target.content.value
      filename = filename || `${Date.now()}.md`
      if (filename.indexOf('.') === -1) filename += '.md'
      await beaker.hyperdrive
        .drive(profile.url)
        .mkdir(PATH)
        .catch(e => undefined)
      await beaker.hyperdrive
        .drive(profile.url)
        .writeFile(PATH + filename, content)
      location.reload()
    }

    async onClickChangeProfile (e) {
      e.preventDefault()
      this.replaceChild(h('bb-setup'), this.firstChild)
      document.querySelector('bb-feed').remove()
    }
  }
)

customElements.define(
  'bb-feed',
  class extends HTMLElement {
    connectedCallback () {
      this.initialLoad()
    }

    async initialLoad () {
      if (!localStorage.profile) {
        return
      }
      this.textContent = 'Loading...'
      try {
        var posts = await api.loadFeed(({ label, progress }) => {
          this.textContent = `${label} (${(progress * 100) | 0}%)`
        })
      } catch (e) {
        this.textContent = e.toString()
        console.debug(`Unable to query ${PATH}`, e)
        return
      }
      this.textContent = ''

      for (let post of posts) {
        this.append(new BBFeedPost(post))
      }
    }
  }
)

class BBFeedPost extends HTMLElement {
  constructor (post) {
    super()
    this.load(post)
  }

  async load (post) {
    this.append(
      h(
        'a',
        { class: 'thumb', href: post.author.url },
        h('img', { src: `${post.author.url}thumb` })
      )
    )

    let offset = niceDate(post.ctime)
    let day = new Date(post.ctime).toLocaleDateString()
    this.append(
      h(
        'div',
        { class: 'meta' },
        h(
          'a',
          {
            href: post.author.url,
            title: post.author.title
          },
          post.author.title
        ),
        ' ',
        h('a', { class: 'day', href: post.url, title: day }, offset)
      )
    )

    var contentDiv = h('div', { class: 'content' }, 'Loading...')
    this.append(contentDiv)

    try {
      await api.loadPost(post)

      contentDiv.innerHTML = ''
      if (post.content.img) {
        contentDiv.append(h('img', { src: post.content.img }))
      } else if (post.content.video) {
        contentDiv.append(
          h(
            'video',
            { controls: true },
            h('source', { src: post.content.video })
          )
        )
      } else if (post.content.audio) {
        contentDiv.append(
          h(
            'audio',
            { controls: true },
            h('source', { src: post.content.audio })
          )
        )
      } else if (post.content.link) {
        const { href, title } = post.content.link
        contentDiv.append(
          h('bb-link-card', {
            href,
            title: title ? title : ''
          })
        )
      } else if (post.content.iframe) {
        contentDiv.append(
          h('iframe', {
            class: 'content',
            csp: IFRAME_CSP,
            sandbox: IFRAME_SANDBOX,
            src: post.content.iframe
          })
        )
      } else if (post.content.html) {
        contentDiv.innerHTML = post.content.html

        const links = contentDiv.getElementsByTagName('a')
        if (links.length === 0 || links[0].protocol !== 'hyper:') return

        const linkPath = links[0].href.slice(links[0].origin.length)
        if (linkPath.substring(0, 11) !== '/microblog/') return

        contentDiv.append(h('p', new BBFeedPostPreview(links[0].href)))
      } else if (post.content.txt) {
        contentDiv.append(h('pre', post.content.txt))
      }
    } catch (e) {
      console.error('Failed to render', post)
      console.error(e)
      return
    }
  }
}
customElements.define('bb-feed-post', BBFeedPost)

class BBFeedPostPreview extends HTMLElement {
  constructor (url) {
    super()
    this.load({ url })
  }

  async load (post) {
    var contentDiv = h('blockquote', 'Loading...')
    this.append(contentDiv)

    try {
      await api.loadPost(post)

      contentDiv.innerHTML = ''
      if (post.content.img) {
        contentDiv.append(h('img', { src: post.content.img }))
      } else if (post.content.video) {
        contentDiv.append(
          h(
            'video',
            { controls: true },
            h('source', { src: post.content.video })
          )
        )
      } else if (post.content.audio) {
        contentDiv.append(
          h(
            'audio',
            { controls: true },
            h('source', { src: post.content.audio })
          )
        )
      } else if (post.content.link) {
        console.log(post.content.link)
        const { href, title } = post.content.link
        contentDiv.append(
          h('bb-link-card', {
            href,
            title: title ? title : ''
          })
        )
      } else if (post.content.iframe) {
        contentDiv.append(
          h('iframe', {
            class: 'content',
            csp: IFRAME_CSP,
            sandbox: IFRAME_SANDBOX,
            src: post.content.iframe
          })
        )
      } else if (post.content.html) {
        contentDiv.innerHTML = post.content.html
      } else if (post.content.txt) {
        contentDiv.append(h('pre', post.content.txt))
      }
      contentDiv.append(
        h('footer', h('a', { href: post.url }, post.url.split('/').pop()))
      )
    } catch (e) {
      console.error('Failed to render', post)
      console.error(e)
      return
    }
  }
}
customElements.define('bb-feed-post-preview', BBFeedPostPreview)

class BBLinkCard extends HTMLElement {
  connectedCallback () {
    const href = this.getAttribute('href')
    const title = this.getAttribute('title')

    console.log('bb-link-card ', href, title)

    const link = h('a', { href })

    if (link.protocol === 'hyper:') {
      link.append(
        h('div', {
          class: 'thumb',
          style: 'background-image: url("hyper://' + link.hostname + '/thumb");'
        })
      )
    } else {
      link.append(h('div', { class: 'thumb' }))
    }

    link.append(
      h(
        'div',
        { class: 'meta' },
        h('strong', { class: 'title' }, title),
        h('span', { class: 'host' }, link.hostname)
      )
    )

    this.append(link)
  }
}
customElements.define('bb-link-card', BBLinkCard)

function h (tag, attrs, ...children) {
  var el = document.createElement(tag)
  if (isPlainObject(attrs)) {
    for (let k in attrs) {
      if (typeof attrs[k] === 'function') el.addEventListener(k, attrs[k])
      else el.setAttribute(k, attrs[k])
    }
  } else if (attrs) {
    children = [attrs].concat(children)
  }
  for (let child of children) el.append(child)
  return el
}

function isPlainObject (v) {
  return v && typeof v === 'object' && Object.prototype === v.__proto__
}

var today = new Date().toLocaleDateString()
var yesterday = new Date(Date.now() - 8.64e7).toLocaleDateString()
function niceDate (ts) {
  const then = new Date(ts).getTime() / 1000
  const now = new Date().getTime() / 1000
  const offset = now - then

  if (offset < 60) {
    return Math.round(offset) + 's'
  }

  if (offset < 60 * 60) {
    return Math.round(offset / 60) + 'm'
  }

  if (offset < 60 * 60 * 24) {
    return Math.round(offset / 60 / 60) + 'h'
  }

  return Math.round(offset / 60 / 60 / 24) + 'd'
}
