(() => {
  const base = document.baseURI.match(/^http.*\/u\/\d+/)?.at(0)
  const initialSender = {}
  const composers = []
  let currentReplyTo = ''

  function updateDetails (at, cfa, cfn, cfrt) {
    currentReplyTo = cfrt
    const details = { at, cfa, cfn, cfrt, nvp_bu_eacc: 'Save', redir: '?v=pra' }
    return navigator.sendBeacon(`${base}/h/${details.at}?&`, new URLSearchParams(details))
  }

  async function getSenderDetails () {
    const shadow = document.createElement('div')
    shadow.innerHTML = await fetch(base + '/h/?v=pra').then(x => x.text())

    const [at, cfa, cfn, cfrt] = ['at', 'cfa', 'cfn', 'cfrt']
      .map(key => shadow.querySelector(`[name="${key}"]`)?.value)
    return Object.assign(initialSender, { at, cfa, cfn, cfrt })
  }

  function updateSelectOptions (select) {
    const [defaultOpt] = select.options
    const newValue = currentReplyTo || 'Same as sender'
    defaultOpt.innerText = `Default (${defaultOpt.value = newValue})`
    // Since the latest reply to address change was just saved, set the select to its default
    select.value = defaultOpt.value
  }

  async function addReplyAddressField (composer) {
    const subjectField = [...composer.querySelector('form').children]
      .find(el => !!el.querySelector('input[name="subjectbox"]'))
    const replyToField = document.createElement('div')
    replyToField.classList.value = subjectField.classList.value
    replyToField.innerText = 'Reply To: '
    subjectField.after(replyToField)

    const select = replyToField.appendChild(document.createElement('select'))
    select.style.border = 'none'
    select.addEventListener('input', () => {
      const value = select.value === 'Same as sender' ? '' : select.value
      updateDetails(initialSender.at, initialSender.cfa, initialSender.cfn, value)
    })

    let { cfrt } = await getSenderDetails()
    if (!cfrt) cfrt = 'Same as sender'

    const options = {
      [`Default (${cfrt})`]: cfrt,
      'Same as sender': '',
      'team@treasurehacks.org': '',
      'events@treasurehacks.org': ''
    }
    Object.entries(options).forEach(([opt, val]) => {
      const el = select.appendChild(document.createElement('option'))
      el.innerText = opt
      el.value = val || opt
    })

    document.body.addEventListener('_emailsent', () => updateSelectOptions(select))
  }

  function resetReplyTo () {
    if (currentReplyTo === initialSender.cfrt) return
    updateDetails(initialSender.at, initialSender.cfa, initialSender.cfn, initialSender.cfrt)
  }

  function initObserver () {
    const findComposer = n => n.parentElement?.matches('.no') &&
      n?.matches('[style*=width][style*=height]') &&
      n?.querySelector('input[name="subjectbox"]')
    const observer = new MutationObserver(mutations => {
      const addedNodes = mutations.flatMap(m => [...m.addedNodes])
      const removedNodes = mutations.flatMap(m => [...m.removedNodes])
      const addedComposer = addedNodes.find(findComposer)
      if (addedComposer) {
        addReplyAddressField(addedComposer)
        composers.push(addedComposer)
        console.log(composers)
      }
      const removedComposer = removedNodes.find(el => composers.includes(el))
      if (removedComposer) resetReplyTo()
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }
  initObserver()

  window.addEventListener('beforeunload', resetReplyTo)

  let isPatched = false
  let patchInterval
  function patchSend () {
    if (isPatched) return

    const Composer = Object.values(window._m).find(v => {
      const p = v?.prototype || {}
      return p.send && p.discard && p.resize
    })

    if (!Composer) return
    isPatched = true
    clearInterval(patchInterval)

    const original = Composer.prototype.send
    Composer.prototype._send = original
    Composer.prototype.send = function (...args) {
      initialSender.cfrt = currentReplyTo
      original.apply(this, args)
      document.body.dispatchEvent(new CustomEvent('_emailsent'))
    }
  }
  window.addEventListener('load', () => { patchInterval = setInterval(patchSend, 50) })

  return true
})()
