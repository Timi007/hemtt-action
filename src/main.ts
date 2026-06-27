import * as core from '@actions/core'
import {downloadRelease} from '@terascope/fetch-github-release'
import {execSync} from 'child_process'

const isWin = process.platform === 'win32'

async function run(): Promise<void> {
  try {
    const tag: string = core.getInput('version')

    if (!tag) {
      core.warning('HEMTT version is not set. Download will fail.')
    }

    core.info(`Start downloading hemtt ${tag}.`)
    await downloadRelease(
      'BrettMayson',
      'HEMTT',
      'hemtt',
      release => {
        if (tag === 'latest') return release.prerelease === false
        return release.tag_name === tag
      },
      asset => {
        return isWin
          ? asset.name === 'windows-x64.zip'
          : asset.name === 'linux-x64.zip'
      },
      false,
      false
    )
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
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
