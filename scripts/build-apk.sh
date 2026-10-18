#!/bin/sh
# Compile l'APK Android signée (steinbp-<version>.apk à la racine du dépôt).
# L'APK ouvre https://steinbp.fr : on ne la recompile que pour changer
# l'icône, le nom ou une permission. Les déploiements suffisent pour le reste.
set -eu

cd "$(dirname "$0")/.."
JAVA_HOME="${JAVA_HOME_21:-$HOME/Android/jdk-21.0.12.1+1}"
KEY="$HOME/Android/keys/steinbp-release.properties"
VERSION="$(node -p "require('./package.json').version")"

[ -f "$KEY" ] || { echo "Clé de signature introuvable : $KEY" >&2; exit 1; }
[ -f android/local.properties ] || echo "sdk.dir=$HOME/Android/Sdk" > android/local.properties

npm run build
npx cap sync android

# Orca n'a que 14 Go de RAM : Gradle tourne dans un scope plafonné.
(cd android && systemd-run --user --scope -q -p MemoryMax=7G \
  env JAVA_HOME="$JAVA_HOME" ./gradlew assembleRelease --no-daemon -q)

cp android/app/build/outputs/apk/release/app-release.apk "steinbp-$VERSION.apk"
echo "APK prête : steinbp-$VERSION.apk"
