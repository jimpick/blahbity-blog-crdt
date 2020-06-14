var profile = undefined
try { profile = JSON.parse(localStorage.profile) }
catch (e) { console.debug(e) }

export async function loadFeedFromCache (progressCb = () => {}) {
  try {
    if (localStorage.cachedFeed) {
      console.debug('Using cached feed')
      return JSON.parse(localStorage.cachedFeed)
    }
  } catch (e) {
    console.log('Failed to load cached feed, running query', e)
  }
  return loadFeed(progressCb)
}

export async function loadFeed (progressCb = () => {}) {
  var contacts = await getContacts()
  if (contacts.length === 0) return []

  var numLoaded = 0
  var numToLoad = contacts.length
  progressCb({label: 'Querying...', progress: 0})

  var feedsFiles = await Promise.all(contacts.map(async contact => {
    let files = await beaker.hyperdrive.query({
      path: '/microblog/*',
      drive: contact.url,
      sort: 'ctime',
      reverse: true,
      limit: 200,
      timeout: 15e3
    }).catch(e => ([]))
    progressCb({label: 'Querying...', progress: (++numLoaded) / numToLoad})
    return files
  }))

  var files = feedsFiles.flat()
  files.sort((a, b) => b.stat.ctime - a.stat.ctime)
  return files.slice(0, 200).map(file => ({
    author: contacts.find(c => c.url === file.drive),
    url: file.url,
    filename: file.url.split('/').filter(Boolean).pop(),
    ctime: file.stat.ctime,
    metadata: file.stat.metadata,
    content: undefined
  }))
}

export async function loadPost (post) {
  try {
    if (/\.(png|jpe?g|gif|svg)$/i.test(post.url)) {
      post.content = {img: post.url}
    } else if (/\.(mp4|webm|mov)/i.test(post.url)) {
      post.content = {video: post.url}
    } else if (/\.(mp3|ogg)/i.test(post.url)) {
      post.content = {audio: post.url}
    } else if (/\.goto$/i.test(post.url)) {
      if (!post.metadata) {
        const stat = await beaker.hyperdrive.stat(post.url)
        post.metadata = stat.metadata
      }
      post.content = {
        link: {
          href: post.metadata?.href,
          title: post.metadata?.title
        }
      }
    } else {
      let txt = await beaker.hyperdrive.readFile(post.url)
      if (/\.html?$/i.test(post.url)) {
        post.content = {iframe: post.url}
      } else if (/\.md$/i.test(post.url)) {
        post.content = {html: beaker.markdown.toHTML(txt)}
      } else {
        post.content = {txt}
      }
    }
  } catch (e) {
    console.error('Failed to read', post.url)
    console.error(e)
  }
}

async function getContacts () {
  var contacts = await beaker.contacts.list()
  if (profile && !contacts.find(c => c.url === profile.url)) {
    contacts.push(profile)
  }
  return contacts
}
