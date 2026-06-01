// Metro config para monorepo: o Metro tem de saber procurar módulos TANTO em
// app/node_modules COMO na raiz do monorepo (node_modules partilhado). Sem isto,
// pacotes içados para a raiz (ex.: @expo-google-fonts/quicksand) não resolvem no
// bundler do dispositivo, apesar de o Node os encontrar.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1. Observar também a raiz do monorepo, SEM descartar os defaults do Expo
//    (acrescentar, não substituir — evita o aviso do expo doctor).
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];

// 2. Resolver módulos nas duas pastas node_modules (app + raiz do monorepo),
//    preservando também quaisquer caminhos que o Expo já tenha definido.
config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths ?? []),
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
