import * as Q from 'q'
import * as vm from 'vso-node-api'
import * as vc from 'vso-node-api/TfvcApi'
import * as vci from "vso-node-api/interfaces/TfvcInterfaces"
import * as tasklib from 'vsts-task-lib'
import * as path from 'path'
import { IRequestHandler } from "vso-node-api/interfaces/common/VsoBaseInterfaces"

const endpointAuthorizationKey = "SYSTEMVSSCONNECTION"

async function run() {

    let endpointAuth: tasklib.EndpointAuthorization = tasklib.getEndpointAuthorization(endpointAuthorizationKey, false)

    let token: string = endpointAuth.parameters["AccessToken"]

    let authHandler: IRequestHandler = vm.getPersonalAccessTokenHandler(token)

    let collectionUri: string = tasklib.getVariable("System.TeamFoundationCollectionUri")

    let vsts: vm.WebApi = new vm.WebApi(collectionUri, authHandler)

    let tfvc: vc.ITfvcApi = vsts.getTfvcApi()

    let sourceVersion: string = tasklib.getVariable("Build.SourceVersion")

    if (sourceVersion.substr(0, 1) == "C")
        sourceVersion = sourceVersion.substring(1);

    let versionDescriptor: vci.TfvcVersionDescriptor = {
        version: sourceVersion,
        versionOption: vci.TfvcVersionOption.None,
        versionType: vci.TfvcVersionType.Changeset
    }

    let source = tasklib.getInput("Source")

    let sourcesDirectory = tasklib.getVariable('Build.SourcesDirectory')

    let destination = path.join(sourcesDirectory, tasklib.getInput("Destination"))

    let project: string = tasklib.getVariable("System.TeamProject")

    await tfvc.getItem(source, project).then(async item => {

        let recursionLevel: vci.VersionControlRecursionType

        if (item.isFolder)
            recursionLevel = vci.VersionControlRecursionType.Full
        else
            recursionLevel = vci.VersionControlRecursionType.None

        await tfvc.getItem(source, project, undefined, true, destination, recursionLevel, versionDescriptor)
    })
}

run()