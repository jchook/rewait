module.exports = {
  disableSources: true,
  entryPoints: ['src/index.ts'],
  excludeExternals: true,
  excludePrivate: true,
  excludeProtected: true,
  gitRevision: 'master',
  hideBreadcrumbs: false,
  hideGenerator: true,
  out: 'docs',
  plugin: ['typedoc-plugin-markdown'],
  readme: 'none',
}
