module.exports = {
  disableSources: true,
  entryPoints: ['src/index.ts'],
  excludeExternals: true,
  excludePrivate: true,
  excludeProtected: true,
  gitRevision: 'main',
  hideBreadcrumbs: false,
  hideGenerator: true,
  out: 'docs',
  plugin: ['typedoc-plugin-markdown'],
  readme: 'none',
}
