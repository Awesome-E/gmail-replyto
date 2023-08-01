/* eslint-disable no-undef,no-unused-vars */
const browserContext = typeof browser !== 'undefined' ? 'firefox' : 'chrome'
let api = null
// let browserAction = 'browserAction'
if (typeof browser !== 'undefined') {
  api = browser
} else if (typeof chrome !== 'undefined') {
  api = chrome
  // browserAction = 'action'
}

const script = document.createElement('script')
script.src = api.runtime.getURL('content-script.js')
document.body.appendChild(script)
