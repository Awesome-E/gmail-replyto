module.exports = function (isFF) {
  const manifest = {
    name: 'Gmail Reply-To',
    description: 'Allows you to choose a reply-to address in the email composer',
    version: '0.1',
    host_permissions: ['https://mail.google.com/'],
    permissions: [
      'activeTab',
      'storage'
    ],
    web_accessible_resources: [{
      matches: ['https://mail.google.com/*'],
      resources: ['content-script.js']
    }],
    background: isFF ? { scripts: ['background.js'] } : { service_worker: 'background.js' },
    content_scripts: [
      {
        matches: ['https://mail.google.com/*'],
        js: ['script-loader.js']
      }
    ],
    icons: {
      16: 'icons/pack-icon-16.png',
      32: 'icons/pack-icon-32.png',
      48: 'icons/pack-icon-48.png'
    },
    minimum_chrome_version: '80.0.3987',
    manifest_version: isFF ? 2 : 3
  }
  if (isFF) {
    manifest.browser_specific_settings = { gecko: { id: '{35bee687-049e-437b-9abb-232fe189b6d9}' } }
  }
  manifest[isFF ? 'browser_action' : 'action'] = {
    default_title: 'Gmail Reply-To',
    default_icon: 'icons/pack-icon-64.png'
  }
  return manifest
}
