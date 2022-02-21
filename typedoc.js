module.exports = {
  allReflectionsHaveOwnDocument: true,
  disableSources: true,
  entryPoints: ['src/index.ts'],
  excludeExternals: true,
  excludePrivate: true,
  excludeProtected: true,
  gitRevision: 'typescript',
  hideBreadcrumbs: false,
  hideGenerator: true,
  out: 'docs',
  plugin: ['typedoc-plugin-markdown'],
  readme: 'none',
}
