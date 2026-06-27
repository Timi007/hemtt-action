import * as core from '@actions/core'
import {downloadRelease} from '@terascope/fetch-github-release'
import {exec} from 'child_process'

async function run(): Promise<void> {
  try {
    const tag: string = core.getInput('version')

    if (!tag) {
      core.warning('HEMTT version is not set. Download will fail.')
    }

    core.info(`Start downloading hemtt ${tag}.`)
    console.error('Start download (console.log).')
    await downloadRelease(
      'BrettMayson',
      'HEMTT',
      'hemtt',
      release => {
        if (tag === 'latest') return release.prerelease === false
        return release.tag_name === tag
      },
      asset => {
        return core.platform.isWindows
          ? asset.name === 'windows-x64.zip'
          : asset.name === 'linux-x64.zip'
      },
      false,
      false
    )
    console.error('Finished download.')

    if (!core.platform.isWindows) {
      console.error('Setting execution permissions.')
      exec('chmod +x hemtt/hemtt', (error, stdout, stderr) => {
        if (error) {
          core.setFailed(error.message)
        }
        if (stderr) {
          core.setFailed(stderr)
        }
        core.info(stdout)
      })
    }

    const hemttPath = core.toPlatformPath(`${process.cwd()}/hemtt`)
    console.error(`Adding "${hemttPath}" to Github system path.`)
    core.addPath(hemttPath)
    console.error('Done.')
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
