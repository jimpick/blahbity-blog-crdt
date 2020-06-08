import { h } from '../vendor/pauls-ui-kit/util.js'

export default class extends HTMLElement {
  constructor () {
    super()
  }

  async connectedCallback () {
    this.append(
      h(
        'button',
        { click: this.onClickChangeProfile.bind(this) },
        'Select a profile on this machine to post with'
      )
    )
    this.append(
      h(
        'button',
        { click: this.onClickSetupRemote.bind(this) },
        'Set up as a "remote" for a profile on another machine'
      )
    )
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

  renderNicknameForm () {
    for (const child of [...this.childNodes]) child.remove()
    this.append(
      h(
        'p',
        `Primary profile (on another machine):`,
        h('p', h('a', { href: this.primaryProfile }, this.primaryProfile))
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

  async onClickChangeProfile (e) {
    e.preventDefault()
    const profile = await beaker.contacts.requestProfile()
    localStorage.profile = JSON.stringify(profile)
    localStorage.removeItem('remoteFor')
    location.reload()
  }

  async onClickSetupRemote (e) {
    e.preventDefault()
    localStorage.removeItem('profile')
    localStorage.removeItem('remoteFor')
    console.log('Setup remote')
    this.renderPrimaryProfileUrlForm()
  }

  onInputPrimaryProfileUrl (e) {
    this.querySelector('button').disabled = !e.target.value.match(
      /^hyper:\/\/[0-9a-fA-F]{64}\/?$/
    )
  }

  async onSubmitPrimaryProfileUrl (e) {
    e.preventDefault()
    this.primaryProfile = this.querySelector('#primaryProfileUrl').value
    console.log('Submit', this.primaryProfile)
    /*
    try {
      this.primaryProfileDrive = await beaker.hyperdrive.drive(
        this.primaryProfile
      )
    } catch (e) {
      // FIXME - show error in UI
      console.error('Error loading primary profile drive', this.primaryProfile)
      throw e
    }
    */
    this.renderNicknameForm()
  }

  async onSubmitNickname (e) {
    e.preventDefault()
    this.nickname = this.querySelector('#nickname').value
    console.log('SubmitNickname', this.nickname)
  }
}
