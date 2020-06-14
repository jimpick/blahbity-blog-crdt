import { h } from './util.js'

const dateFmt = new Intl.DateTimeFormat('default')

class PfrazeeBlogposts extends HTMLElement {
  async connectedCallback () {
    var path = this.getAttribute('path') || '/blog'
    path = path.endsWith('/') ? (path + '*.md') : (path + '/*.md')

    try {
      var posts = await beaker.hyperdrive.query({path, sort: 'ctime', reverse: true})
    } catch (e) {
      console.debug(`Failed to query ${path}`)
      return
    }

    this.render(posts)
  }

  render (posts) {
    var ul = h('ul')
    for (let post of posts) {
      let title = post.stat.metadata.title || post.path.split('/').pop()
      ul.append(h('li',
        h('a', {href: post.url, title}, title),
        this.hasAttribute('include-dates') ? h('small', ` ${dateFmt.format(post.stat.ctime)}`) : ''
      ))
    }
    this.append(ul)
  }
}
customElements.define('pfrazee-blogposts', PfrazeeBlogposts)
