import { h } from '../vendor/pauls-ui-kit/util.js'

var profile
try {
  profile = JSON.parse(localStorage.profile)
} catch (e) {
  console.debug(e)
}

export default class extends HTMLElement {
  constructor () {
    super()
  }

  async connectedCallback () {
    if (!profile) return
    this.profileDrive = await beaker.hyperdrive.drive(profile)
    this.replicas = []
    this.replicaNicknames = {}
    this.replicaElements = []
    let loadReplicas = false
    try {
      const stat = await this.profileDrive.stat('replicas.json')
      loadReplicas = true
    } catch (e) {
      console.log('Stat replicas.json error', e)
      // Ignore if file doesn't exist yet
    }
    if (loadReplicas) {
      this.replicas = await this.profileDrive.readFile('replicas.json', 'json')
      for (const replicaUrl of this.replicas) {
        // FIXME: Error in UI if this doesn't work
        const replicaDrive = await beaker.hyperdrive.drive(replicaUrl)
        const { nickname } = await replicaDrive.readFile(
          'remote-replica.json',
          'json'
        )
        this.replicaNicknames[replicaUrl] = nickname
        this.replicaElements.push(h('div', nickname))
      }
    }
    this.append(
      h(
        'div',
        { style: 'display: flex' },
        'Replicas:',
        h.apply(null, ['div', ...this.replicaElements]),
        h('button', { click: this.onClickAddReplica.bind(this) }, '+')
      )
    )
  }

  async onClickAddReplica (evt) {
    evt.preventDefault()
    this.renderAddReplicaForm()
  }

  renderAddReplicaForm () {
    this.append(
      h(
        'p',
        'URL of replica from other machine',
        h(
          'form',
          { submit: this.onSubmitReplicaUrl.bind(this) },
          h(
            'p',
            h('input', {
              id: 'replicaUrl',
              type: 'text',
              placeholder: 'hyper://...',
              style: 'width: 100%',
              input: this.onInputReplicaUrl.bind(this)
            }),
            h('button', { type: 'submit', disabled: true }, 'Submit')
          )
        )
      )
    )
  }

  onInputReplicaUrl (e) {
    this.querySelector(
      'button[type="submit"]'
    ).disabled = !e.target.value.match(/^hyper:\/\/[0-9a-fA-F]{64}\/?$/)
  }

  async onSubmitReplicaUrl (e) {
    e.preventDefault()
    const replicaUrl = this.querySelector('#replicaUrl').value
    console.log('Submit', replicaUrl)
    try {
      const replicaDrive = await beaker.hyperdrive.drive(replicaUrl)
      console.log('Jim replicaDrive', replicaDrive)
      const remoteReplica = await replicaDrive.readFile(
        'remote-replica.json',
        'json'
      )
      console.log('Jim remote-replica.json', remoteReplica)
      if (remoteReplica.primaryProfile !== profile.url) {
        console.error(
          'Remote replica is following different profile',
          remoteReplica.primaryProfile,
          '!==',
          profile.url
        )
        throw new Error('Wrong profile')
        // FIXME - show error in UI
      }
      this.replicas.push(replicaUrl)
      console.log('New replicas', this.replicas)
      await this.profileDrive.writeFile(
        'replicas.json',
        JSON.stringify(this.replicas)
      )
    } catch (e) {
      // FIXME - show error in UI
      console.error('Error loading replica drive', replicaUrl)
      throw e
    }
  }
}
