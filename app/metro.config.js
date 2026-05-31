// Metro config para monorepo: o Metro tem de saber procurar módulos TANTO em
// app/node_modules COMO na raiz do monorepo (node_modules partilhado). Sem isto,
// pacotes içados para a raiz (ex.: @expo-google-fonts/quicksand) não resolvem no
// bundler do dispositivo, apesar de o Node os encontrar.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1. Observar também a raiz do monorepo.
config.watchFolders = [workspaceRoot];

// 2. Resolver módulos nas duas pastas node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
