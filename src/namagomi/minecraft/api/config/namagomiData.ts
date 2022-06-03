import {GitTree} from "../github/GitTree";
import fs, {createWriteStream} from "fs";
import {pipeline} from "stream/promises";
import fetch from "electron-fetch";
import {namagomiDataFileUrlBase, namagomiFileUrlBase} from "../../../settings/config";
import path from "path";
import {mainDir, namagomiCache} from "../../../settings/localPath";

export interface NamagomiCache {
    data: [
        {
            name: string
            sha: string
        }
    ],
    mods: string
}

export async function downloadAllDataFiles(branch: string) {
    const tree = await new GitTree().build('NamagomiNetwork', 'Namagomi-mod', branch);
    const dataSha = tree.getData('data').data.sha;
    const dataTree = await new GitTree().build('NamagomiNetwork', 'Namagomi-mod', dataSha);
    const dataPaths = await dataTree.getAllFilePaths()
    const dataSubDirs = await dataTree.getAllDirectoryPaths()

    if (!fs.existsSync(namagomiCache)) createEmptyJson(namagomiCache)
    const cacheJson = JSON.parse(fs.readFileSync(namagomiCache, 'utf8')) as NamagomiCache

    await Promise.all(dataPaths.map(async cfgPath => {
        if (!fs.existsSync(mainDir)) fs.mkdirSync(mainDir)
        dataSubDirs.map(async (dir) => {
            const absDir = path.join(mainDir, dir)
            if (!fs.existsSync(absDir)) fs.mkdirSync(absDir)
        })

        const sha = (await dataTree.getData(cfgPath)).data.sha

        const findIndex = cacheJson.data.findIndex((d: { name: string, sha: string }) => d.name === cfgPath)

        if (findIndex === -1 || cacheJson.data[findIndex].sha !== sha) {
            const filePath = path.join(mainDir, cfgPath)

            const fileContent = await fetch(namagomiDataFileUrlBase(branch, cfgPath))
            switch (fileContent.status) {
                case 200:
                    await pipeline(await fileContent.text(),
                        createWriteStream(filePath))
                        .then(() => {
                            console.log('downloaded: ' + cfgPath)
                            if(findIndex === -1)
                                cacheJson.data.push({name:cfgPath, sha:sha})
                            else
                                cacheJson.data[findIndex].sha = sha
                        }).catch(err => {
                            console.error(err)
                            console.log('failed: ' + cfgPath + ' ' + namagomiFileUrlBase(branch, cfgPath))
                        })
                    break;
                default:
                    console.error('failed: ' + cfgPath + ' ' + namagomiFileUrlBase(branch, cfgPath))
                    console.error(`status: ${fileContent.status}`)
            }
        }
    }))
    fs.writeFileSync(namagomiCache, JSON.stringify(cacheJson))
}

function createEmptyJson(path: string) {
    fs.writeFileSync(path, JSON.stringify({data: [], mods:''}))
}