import * as Q from 'q'
import * as fs from 'fs'
import * as vm from 'vso-node-api'
import * as vc from 'vso-node-api/TfvcApi'
import * as vci from "vso-node-api/interfaces/TfvcInterfaces"
import * as tasklib from 'vsts-task-lib'
import * as path from 'path'
import { IRequestHandler } from "vso-node-api/interfaces/common/VsoBaseInterfaces"

const accessTokenKey = "AccessToken"
const endpointAuthorizationKey = "SYSTEMVSSCONNECTION";

async function run() {

    let endpointAuth: tasklib.EndpointAuthorization = tasklib.getEndpointAuthorization(endpointAuthorizationKey, false)

    let token: string = endpointAuth.parameters[accessTokenKey]

    let authHandler: IRequestHandler = vm.getPersonalAccessTokenHandler(token)

    let collectionUri: string = tasklib.getVariable("System.TeamFoundationCollectionUri")

    console.log('Collection Uri: ' + collectionUri);

    let vsts: vm.WebApi = new vm.WebApi(collectionUri, authHandler)

    let tfvc: vc.ITfvcApi = vsts.getTfvcApi()

    let sourceVersion: string = tasklib.getVariable("Build.SourceVersion")

    console.log('Source Version: ' + sourceVersion);

    if (sourceVersion.substr(0, 1) == "C")
        sourceVersion = sourceVersion.substring(1);

    let versionDescriptor: vci.TfvcVersionDescriptor = {
        version: sourceVersion,
        versionOption: vci.TfvcVersionOption.None,
        versionType: vci.TfvcVersionType.Changeset
    }

    let source = tasklib.getInput("Source")

    console.log('Source Path: ' + source);

    let sourcesDirectory = tasklib.getVariable('Build.SourcesDirectory')

    console.log('Sources Directory: ' + sourcesDirectory);

    let destination = path.join(sourcesDirectory, tasklib.getInput("Destination"))

    console.log('Destination Path: ' + destination);

    let project: string = tasklib.getVariable("System.TeamProject")

    console.log('Project: ' + project);

    try {
        let recursionLevel: vci.VersionControlRecursionType = vci.VersionControlRecursionType.None

        let item = await tfvc.getItem(source, undefined, undefined, undefined, undefined, recursionLevel, versionDescriptor)

        if (item.isFolder) recursionLevel = vci.VersionControlRecursionType.Full

        let items = await tfvc.getItems(undefined, source, recursionLevel, undefined, versionDescriptor);

        for (var i in items) {
            item = items[i]

            let itemServerPath: string = item.path
            let itemLocalPath = itemServerPath.replace(source, destination)

            if (item.isFolder) {
                console.log('Creating Path: ' + itemLocalPath)
                tasklib.mkdirP(itemLocalPath)
            }
            else {
                console.log('Downloading File: ' + item.path + ' -> ' + itemLocalPath);
                let fileContent = await tfvc.getItemContent(item.path, undefined, undefined, undefined, undefined, undefined, versionDescriptor)
                fs.writeFileSync(itemLocalPath, fileContent.read())
            }
        }
    }
    catch (exception) {
        console.error(exception);
    }
}

run()