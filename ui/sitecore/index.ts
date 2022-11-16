import { LinkHelper } from "@sitecore/sc-contenthub-webclient-sdk";
import OAuthPasswordGrant from "@sitecore/sc-contenthub-webclient-sdk/dist/authentication/oauth-password-grant";
import { ContentHubClient } from "@sitecore/sc-contenthub-webclient-sdk/dist/clients/content-hub-client";
import { CultureLoadOption } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/culture-load-option";
import { EntityLoadConfiguration } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/entity-load-configuration";
import { PropertyLoadOption } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/property-load-option";
import { RelationLoadOption } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/relation-load-option";
import { RelationSpecification } from "@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/relation-specification";
import Link from "@sitecore/sc-contenthub-webclient-sdk/dist/link";
import { ArrayBufferUploadSource } from '@sitecore/sc-contenthub-webclient-sdk/dist/models/upload/array-buffer-upload-source'
import { UploadRequest } from '@sitecore/sc-contenthub-webclient-sdk/dist/models/upload/upload-request'

interface ContentHubConfiguration {
    endpoint: string;
    clientId: string;
    clientSecret: string;
    userName: string;
    password: string;
}

async function getAuthenticatedClient(config: ContentHubConfiguration): Promise<ContentHubClient> {
    const oauth = new OAuthPasswordGrant(
        config.clientId,
        config.clientSecret,
        config.userName,
        config.password,
    );

    const client = new ContentHubClient(config.endpoint, oauth);
    const authenticated = await client.internalClient.authenticateAsync();

    if (!authenticated) {
        throw new Error(`Unable to authenticate to CH endpoint '${config.endpoint}'`);
    }

    return client;
}

export async function UploadNewMasterFile(config: ContentHubConfiguration, entityId: number, imgSrc: string): Promise<boolean> {
    const client = await getAuthenticatedClient(config);

    const resp = await fetch(imgSrc)
    const buffer = await resp.arrayBuffer()

    const uploadSource = new ArrayBufferUploadSource(buffer, 'stablediffusionbg.jpg');

    const request = new UploadRequest(
        uploadSource,
        'AssetUploadConfiguration',
        'NewMainFile'
    );

    request.actionParameters = {
        AssetId: entityId,
    }

    const result = await client.uploads.uploadAsync(request);
    if (!result.isSuccessStatusCode) {
        throw new Error(`Unable to upload file to DAM ${result.statusCode}: ${result.statusText}`);
    }

    return true;
}

export async function UploadNewAsset(config: ContentHubConfiguration, entityId: number, relationToTarget: string, imgSrc: string): Promise<boolean> {
    const client = await getAuthenticatedClient(config);

    const resp = await fetch(imgSrc)
    const buffer = await resp.arrayBuffer()

    const uploadSource = new ArrayBufferUploadSource(buffer, 'stablediffusionbg.jpg');

    const request = new UploadRequest(
        uploadSource,
        'AssetUploadConfiguration',
        'NewAsset'
    );

    const result = await client.uploads.uploadAsync(request);
    if (!result.isSuccessStatusCode) {
        throw new Error(`Unable to upload file to DAM ${result.statusCode}: ${result.statusText}`);
    }

    const location = result.responseHeaders["location"];
    console.log(`Created CH Asset with location ${location}`);

    const lh = new LinkHelper(client);
    const assetId = await lh.idFromEntityAsync(new Link(location));

    if (assetId == null) {
        throw new Error(`Unable to retrieve Asset Id from ${location}`);
    }

    const asset = await client.entities.getAsync(assetId, new EntityLoadConfiguration(CultureLoadOption.None,
        PropertyLoadOption.None, new RelationLoadOption([new RelationSpecification(relationToTarget) ])))

    if (asset == null) {
        throw new Error(`Unable to retrieve Asset with Id ${assetId} from CH`);
    }

    asset?.getRelation(relationToTarget)?.setIds([entityId as number]);

    await client.entities.saveAsync(asset);

    console.log(`Linked Asset with Id ${assetId} to ${entityId} via relation ${relationToTarget}`);

    return true;
}