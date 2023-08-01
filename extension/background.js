const browserContext = typeof browser !== 'undefined' ? 'firefox' : 'chrome'
let api = null
let scripting = 'tabs'
if (typeof browser !== 'undefined') {
  api = browser
} else if (typeof chrome !== 'undefined') {
  api = chrome
  scripting = 'scripting'
}

// const loaderBlock = ['\u2598', '\u259D', '\u2597', '\u2596']

async function executeScript (message) {
  const tabs = message.tabList

  const results = []
  // for await (const tab of tabs) {
  await Promise.all(tabs.map(async tab => {
    async function execute (content) {
      // eslint-disable-next-line no-undef
      const result = await execAsync(content)
      const response = { status: 'success', ...result }
      response.document = response.document.documentElement.innerHTML
      // return response
      const getCircularReplacer = () => {
        const seen = new WeakSet()
        return (key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return
            }
            seen.add(value)
          }
          return value
        }
      }
      getCircularReplacer()
      return JSON.parse(JSON.stringify(response, getCircularReplacer()))
    }

    const payload = {
      chrome: [{
        target: { tabId: tab.id, allFrames: message.allFrames },
        func: execute,
        args: [message.content]
      }],
      firefox: [tab.id, {
        allFrames: message.allFrames,
        code: `(${execute.toString()})(${JSON.stringify(message.content)})`
      }]
    }

    console.log(payload)
    const frameResponses = await api[scripting].executeScript(...payload[browserContext])
      .catch(() => []) // If failed, the responses should just be an empty array
    console.log(frameResponses)

    frameResponses.forEach(response => {
      let body = browserContext === 'chrome' ? response.result : response
      if (!body) {
        body = {
          status: 'error',
          tab,
          error: `Could not run script on ${tab.url}`
        }
      }
      body.tab = tab
      results.push(body)
    })
  }))

  api.runtime.sendMessage({ type: 'script-exec-response', content: results })
}

function getLoadListener (tab, resolve) {
  function listener (tabId, info, tabObject) {
    const isComplete = !tabObject || info.status === 'complete'
    if (isComplete && tabId === tab.id) {
      api.tabs.onUpdated.removeListener(listener)
      api.tabs.onRemoved.removeListener(listener)
      resolve(tab)
    }
  }
  return listener
}

async function reloadTabs (message) {
  const tabs = message.tabList
  await Promise.all(tabs.map(tab => {
    api.tabs.reload(tab.id)
    return new Promise(resolve => {
      const listener = getLoadListener(tab, resolve)
      api.tabs.onUpdated.addListener(listener)
      api.tabs.onRemoved.addListener(listener)
    })
  }))

  api.runtime.sendMessage({ type: 'tab-reload-finished' })
}

const messageHandlers = {
  'initiate-script-exec': executeScript,
  'initiate-reload': reloadTabs
}

api.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  const reject = { error: 'unknown command' }
  if (!messageHandlers[message.type]) return sendResponse(reject) || reject
  messageHandlers[message.type](message)
  sendResponse(true)
})

// Expose for test
if (typeof module !== 'undefined') module.exports = {}
