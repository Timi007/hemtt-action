import * as core from '@actions/core'
import {downloadRelease} from '@terascope/fetch-github-release'
import {execSync} from 'child_process'

const isWin = process.platform === 'win32'

process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err && (err.stack || err.message || err))
  try { core.setFailed(String(err)) } catch {}
  // rethrow? keep process alive long enough to see logs
})

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason)
  try { core.setFailed(String(reason)) } catch {}
})

async function run(): Promise<void> {
  try {
    const tag: string = core.getInput('version')

    if (!tag) {
      core.warning('HEMTT version is not set. Download will fail.')
    }

    core.info(`Start downloading hemtt ${tag}.`)
    console.error('About to call downloadRelease')

    // diagnostic wrappers for the filters:
    const releaseFilter = (release: any) => {
      try {
        console.error('releaseFilter check:', release && release.tag_name, 'prerelease=', release && release.prerelease)
        if (tag === 'latest') return release.prerelease === false
        return release.tag_name === tag
      } catch (e) {
        console.error('releaseFilter threw:', e)
        throw e
      }
    }

    const assetFilter = (asset: any) => {
      try {
        console.error('assetFilter check:', asset && asset.name)
        return isWin
          ? asset.name === 'windows-x64.zip'
          : asset.name === 'linux-x64.zip'
      } catch (e) {
        console.error('assetFilter threw:', e)
        throw e
      }
    }

    // call downloadRelease and inspect what it returns
    const dlReturn = downloadRelease(
      'BrettMayson',
      'HEMTT',
      'hemtt',
      releaseFilter,
      assetFilter,
      false,
      false
    )

    console.error('downloadRelease returned (type):', typeof dlReturn, 'isPromise:', !!(dlReturn && typeof (dlReturn as any).then === 'function'))

    const downloadPromise = (dlReturn && typeof (dlReturn as any).then === 'function')
      ? dlReturn as Promise<any>
      : Promise.resolve(dlReturn)

    // timebox the download so we can detect hangs
    const TIMEOUT_MS = 3 * 60 * 1000
    const result = await Promise.race([
      downloadPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`downloadRelease timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS))
    ]).catch(err => {
      console.error('downloadRelease promise rejected or timed out:', err)
      throw err
    })

    console.error('downloadRelease resolved with:', result)
    core.info('Finished download.')

    if (!isWin) {
      core.info('Setting execution permissions.')
      const output = execSync('chmod +x hemtt/hemtt')
      core.info(output.toString('utf8'))
    }

    const hemttPath = core.toPlatformPath(`${process.cwd()}/hemtt`)
    core.info(`Adding "${hemttPath}" to Github system path.`)
    core.addPath(hemttPath)
    core.info('Done.')
  } catch (error) {
    console.error('Top-level catch:', error)
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed(String(error))
    }
  }
}

run()
