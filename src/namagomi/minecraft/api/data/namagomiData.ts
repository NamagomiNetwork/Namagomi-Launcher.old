import {GitTree} from '../github/GitTree'
import fs, {createWriteStream} from 'fs'
import {pipeline} from 'stream/promises'
import fetch from 'electron-fetch'
import {namagomiDataFileUrlBase, namagomiFileUrlBase} from '../../../settings/config'
import path from 'path'
import {mainDir, namagomiCache} from '../../../settings/localPath'
import {log} from '../../../Logger'

export interface NamagomiCache {
    data: {
        name: string
        sha: string
    }[]
    mods: string
}

export async function downloadAllDataFiles(branch: string, side: string) {
    const tree = await new GitTree().build('NamagomiNetwork', 'Namagomi-mod', branch)
    const dataSha = tree.getData('data').data.sha
    const dataTree = await new GitTree().build('NamagomiNetwork', 'Namagomi-mod', dataSha)
    const dataPaths = await dataTree.getAllFilePaths()
    const dataSubDirs = await dataTree.getAllDirectoryPaths()

    if (!fs.existsSync(namagomiCache(side))) createEmptyJson(namagomiCache(side))

    const cacheText = fs.readFileSync(namagomiCache(side), 'utf8')
    try {
        const cacheJson = JSON.parse(cacheText) as NamagomiCache

        await Promise.all(dataPaths.map(async cfgPath => {
            if (!fs.existsSync(mainDir(side))) fs.mkdirSync(mainDir(side))
            dataSubDirs.map(async (dir) => {
                const absDir = path.join(mainDir(side), dir)
                if (!fs.existsSync(absDir)) fs.mkdirSync(absDir)
            })

            const sha = (await dataTree.getData(cfgPath)).data.sha

            const findIndex = cacheJson.data.findIndex((d: { name: string, sha: string }) => d.name === cfgPath)

            if (findIndex === -1 || cacheJson.data[findIndex].sha !== sha) {
                const filePath = path.join(mainDir(side), cfgPath)

                const fileContent = await fetch(namagomiDataFileUrlBase(branch, cfgPath))
                switch (fileContent.status) {
                    case 200:
                        await pipeline(await fileContent.text(),
                            createWriteStream(filePath))
                            .then(() => {
                                log.info('downloaded: ' + cfgPath)
                                if (findIndex === -1)
                                    cacheJson.data.push({name: cfgPath, sha: sha})
                                else
                                    cacheJson.data[findIndex].sha = sha
                            }).catch(err => {
                                log.error(err)
                                log.info('failed: ' + cfgPath + ' ' + namagomiFileUrlBase(branch, cfgPath))
                            })
                        break
                    default:
                        log.error('failed: ' + cfgPath + ' ' + namagomiFileUrlBase(branch, cfgPath))
                        log.error(`status: ${fileContent.status}`)
                }
            }
        }))
        fs.writeFileSync(namagomiCache(side), JSON.stringify(cacheJson))

        deleteFiles(dataTree, side)

        log.info('complete: downloadAllDataFiles')
    } catch (e) {
        log.error(`${namagomiCache(side)} is not json`)
        log.error(e)
        log.error(cacheText)
    }
}

function createEmptyJson(path: string) {
    fs.writeFileSync(path, JSON.stringify({data: [], mods: ''}))
}

function deleteFiles(dataTree: GitTree, side: string) {
    if (!fs.existsSync(namagomiCache(side))) {
        createEmptyJson(namagomiCache(side))
        log.info(`create: ${namagomiCache(side)}`)
    }
    const cacheJson = JSON.parse(fs.readFileSync(namagomiCache(side), 'utf8')) as NamagomiCache

    const newCacheJson = {data: [], mods: cacheJson.mods} as NamagomiCache

    cacheJson.data.map((data) => {
        if (!dataTree.exists(data.name)) {
            const filePath = path.join(mainDir(side), data.name)
            if (fs.existsSync(filePath)) {
                log.info(`delete: ${filePath}`)
                fs.rmSync(filePath)
            }
        } else {
            newCacheJson.data.push(data)
        }
    })

    fs.writeFileSync(namagomiCache(side), JSON.stringify(newCacheJson))
}