function addHostForLinks(options = {}) {
  const host = options.host || 'https://aisensiy.me';
  return async (tree) => {
    const {visit} = await import('unist-util-visit')
    visit(tree, (node, index, parent) => {
      if (parent && typeof index === 'number' && node.type === 'link' && !node.url.startsWith('http')) {
        if (node.url.startsWith('/')) {
          node.url = `${host}${node.url}`
        } else {
          node.url = `${host}/${node.url}`
        }
      }
    })
  }
}

module.exports = addHostForLinks
