import { h } from '../vendor/pauls-ui-kit/util.js'

export default class extends HTMLElement {
  constructor () {
    super()
  }

  async connectedCallback () {
    try {
      this.remoteInfo = JSON.parse(localStorage.remoteInfo)
      if (this.remoteInfo.state === 'created') {
        this.replicaDrive = await beaker.hyperdrive.drive(
          this.remoteInfo.replicaDriveUrl
        )
        this.primaryProfileUrl = this.remoteInfo.primaryProfileUrl
        this.renderConnectToPrimaryForm()
        return
      }
    } catch (e) {
      console.debug('bb-setup load remoteInfo', e)
    }

    this.append(
      h(
        'div',
        h(
          'button',
          { click: this.onClickChangeProfile.bind(this) },
          'Select a profile on this machine to post with'
        )
      )
    )
    this.append(
      h(
        'div',
        h(
          'button',
          { click: this.onClickSetupRemote.bind(this) },
          'Set up as a "remote" for a profile on another machine'
        )
      )
    )
  }

  async onClickChangeProfile (e) {
    e.preventDefault()
    const profile = await beaker.contacts.requestProfile()
    localStorage.profile = JSON.stringify(profile)
    localStorage.removeItem('remoteInfo')
    location.reload()
  }

  async onClickSetupRemote (e) {
    e.preventDefault()
    localStorage.removeItem('profile')
    localStorage.removeItem('remoteInfo')
    console.log('Setup remote')
    this.renderPrimaryProfileUrlForm()
  }

  renderPrimaryProfileUrlForm () {
    for (const child of [...this.childNodes]) child.remove()
    this.append(
      h(
        'p',
        'Paste hyper://... URL of profile from other machine',
        h(
          'form',
          { submit: this.onSubmitPrimaryProfileUrl.bind(this) },
          h(
            'p',
            h('input', {
              id: 'primaryProfileUrl',
              type: 'text',
              placeholder: 'hyper://...',
              style: 'width: 100%',
              input: this.onInputPrimaryProfileUrl.bind(this)
            }),
            h('button', { type: 'submit', disabled: true }, 'Submit')
          )
        )
      )
    )
  }

  onInputPrimaryProfileUrl (e) {
    this.querySelector('button').disabled = !e.target.value.match(
      /^hyper:\/\/[0-9a-fA-F]{64}\/?$/
    )
  }

  async onSubmitPrimaryProfileUrl (e) {
    e.preventDefault()
    this.primaryProfileUrl = this.querySelector('#primaryProfileUrl').value
    console.log('Submit', this.primaryProfileUrl)
    try {
      this.primaryProfileDrive = await beaker.hyperdrive.drive(
        this.primaryProfileUrl
      )
      this.primaryProfileInfo = await this.primaryProfileDrive.getInfo()
    } catch (e) {
      // FIXME - show error in UI
      console.error(
        'Error loading primary profile drive',
        this.primaryProfileUrl
      )
      throw e
    }
    this.renderNicknameForm()
  }

  renderNicknameForm () {
    for (const child of [...this.childNodes]) child.remove()
    this.append(
      h(
        'p',
        `Primary profile (on another machine):`,
        h(
          'p',
          h('a', { href: this.primaryProfileUrl }, this.primaryProfileUrl)
        ),
        h('div', `Title: ${this.primaryProfileInfo.title}`),
        h('div', `Description: ${this.primaryProfileInfo.description}`),
        h('img', {
          src: `${this.primaryProfileUrl}/thumb.png`
        })
      ),
      h(
        'p',
        'A hyperdrive will be created to host a replica related to the ' +
          'profile on this machine. Please set a nickname for the replica ' +
          `(eg. 'desktop', 'laptop'):`
      ),
      h(
        'form',
        { submit: this.onSubmitNickname.bind(this) },
        h(
          'p',
          h('input', {
            id: 'nickname',
            type: 'text',
            placeholder: 'desktop',
            style: 'width: 100%'
          }),
          h('button', { type: 'submit' }, 'Create archive to contain replica')
        )
      )
    )
  }

  async onSubmitNickname (e) {
    e.preventDefault()
    this.nickname = this.querySelector('#nickname').value
    console.log('SubmitNickname', this.nickname)
    this.replicaDrive = await beaker.hyperdrive.createDrive({
      title: `remote-${this.nickname}`,
      description: 'Remote replica for profile'
    })
    await this.replicaDrive.writeFile(
      '/remote-replica.json',
      JSON.stringify({
        nickname: this.nickname,
        primaryProfile: this.primaryProfileUrl
      })
    )
    this.remoteInfo = {
      primaryProfileUrl: this.primaryProfileUrl,
      replicaDriveUrl: this.replicaDrive.url,
      state: 'created'
    }
    localStorage.setItem('remoteInfo', JSON.stringify(this.remoteInfo))
    console.log('Jim', this.replicaDrive)
    this.renderConnectToPrimaryForm()
  }

  renderConnectToPrimaryForm () {
    for (const child of [...this.childNodes]) child.remove()
    this.append(
      h(
        'p',
        'A hyperdrive was created to host a replica on this machine:',
        h('p', this.replicaDrive.url),
        h('p', h('a', { href: this.replicaDrive.url }, 'Link'))
      ),
      h(
        'p',
        'Now, go to your other machine that hosts your ',
        h('a', { href: this.primaryProfileUrl }, this.primaryProfileUrl),
        ' and add the URL for this replica.'
      ),
      h(
        'button',
        { click: this.onCheckButtonClick.bind(this) },
        'Check Primary'
      )
    )
  }

  async onCheckButtonClick (e) {
    e.preventDefault()
    console.log('Check')
    // FIXME: Error checking
    const primaryDrive = await beaker.hyperdrive.drive(this.primaryProfileUrl)
    const replicas = await primaryDrive.readFile('replicas.json', 'json')
    console.log('Replicas', replicas, this.replicaDrive.url)
    console.log('this.replicaDrive.url', replicas, this.replicaDrive.url)
    if (replicas.includes(this.replicaDrive.url)) {
      console.log('Found')
      this.remoteInfo = {
        primaryProfileUrl: this.primaryProfileUrl,
        replicaDriveUrl: this.replicaDrive.url,
        state: 'connected'
      }
      localStorage.setItem('remoteInfo', JSON.stringify(this.remoteInfo))
      const { url, title, description } = await primaryDrive.getInfo()
      const profile = {
        url,
        title,
        description
      }
      localStorage.setItem('profile', JSON.stringify(profile))
      location.reload()
    }
  }
}
