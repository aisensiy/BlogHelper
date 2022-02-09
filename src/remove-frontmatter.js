function remarkRemoveFrontmatter() {
  return async (tree) => {
    const {visit} = await import('unist-util-visit')
    const {squeezeParagraphs} = await import('mdast-squeeze-paragraphs')
    visit(tree, (node, index, parent) => {
      if (parent && typeof index === 'number' && node.type === 'yaml') {
        parent.children.splice(
          index,
          1,
          ...('children' in node ? node.children : [])
        )
        return index
      }
    })

    squeezeParagraphs(tree)
  }
}

module.exports = remarkRemoveFrontmatter
