import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const packagePath = new URL('../package.json', import.meta.url)
const lockPath = new URL('../package-lock.json', import.meta.url)
const currentPackage = JSON.parse(readFileSync(packagePath, 'utf8'))
const lock = JSON.parse(readFileSync(lockPath, 'utf8'))

function writeVersion(version) {
  currentPackage.version = version
  writeFileSync(packagePath, `${JSON.stringify(currentPackage, null, 2)}\n`)

  lock.version = version
  if (lock.packages?.['']) lock.packages[''].version = version
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`)
}

let committedPackage
try {
  committedPackage = JSON.parse(execFileSync('git', ['show', 'HEAD:package.json'], { encoding: 'utf8' }))
} catch {
  committedPackage = null
}

// Si la version diffère déjà de HEAD, elle a été incrémentée explicitement ou
// par une précédente tentative de commit : on synchronise seulement le lock.
if (committedPackage && currentPackage.version !== committedPackage.version) {
  writeVersion(currentPackage.version)
  process.exit(0)
}

const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(currentPackage.version)
if (!match) throw new Error(`Version SemVer invalide : ${currentPackage.version}`)

const nextVersion = `${match[1]}.${match[2]}.${Number(match[3]) + 1}`
writeVersion(nextVersion)

process.stdout.write(`Version SteinBP : ${committedPackage?.version ?? 'initiale'} → ${nextVersion}\n`)
