"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadToDam = void 0;
const sc_contenthub_webclient_sdk_1 = require("@sitecore/sc-contenthub-webclient-sdk");
const oauth_password_grant_1 = __importDefault(require("@sitecore/sc-contenthub-webclient-sdk/dist/authentication/oauth-password-grant"));
const content_hub_client_1 = require("@sitecore/sc-contenthub-webclient-sdk/dist/clients/content-hub-client");
const culture_load_option_1 = require("@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/culture-load-option");
const entity_load_configuration_1 = require("@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/entity-load-configuration");
const property_load_option_1 = require("@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/property-load-option");
const relation_load_option_1 = require("@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/relation-load-option");
const relation_specification_1 = require("@sitecore/sc-contenthub-webclient-sdk/dist/contracts/querying/relation-specification");
const link_1 = __importDefault(require("@sitecore/sc-contenthub-webclient-sdk/dist/link"));
const array_buffer_upload_source_1 = require("@sitecore/sc-contenthub-webclient-sdk/dist/models/upload/array-buffer-upload-source");
const upload_request_1 = require("@sitecore/sc-contenthub-webclient-sdk/dist/models/upload/upload-request");
function UploadToDam(config, entityId, relationToTarget, imgSrc) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const oauth = new oauth_password_grant_1.default(config.clientId, config.clientSecret, config.userName, config.password);
        const client = new content_hub_client_1.ContentHubClient(config.endpoint, oauth);
        const authenticated = yield client.internalClient.authenticateAsync();
        if (!authenticated) {
            throw new Error(`Unable to authenticate to CH endpoint '${config.endpoint}'`);
        }
        const resp = yield fetch(imgSrc);
        const buffer = yield resp.arrayBuffer();
        const uploadSource = new array_buffer_upload_source_1.ArrayBufferUploadSource(buffer, 'background.jpg');
        const request = new upload_request_1.UploadRequest(uploadSource, 'AssetUploadConfiguration', 'NewAsset');
        const result = yield client.uploads.uploadAsync(request);
        if (!result.isSuccessStatusCode) {
            throw new Error(`Unable to upload file to DAM ${result.statusCode}: ${result.statusText}`);
        }
        const location = result.responseHeaders["location"];
        console.log(`Created CH Asset with location ${location}`);
        const lh = new sc_contenthub_webclient_sdk_1.LinkHelper(client);
        const assetId = yield lh.idFromEntityAsync(new link_1.default(location));
        if (assetId == null) {
            throw new Error(`Unable to retrieve Asset Id from ${location}`);
        }
        const asset = yield client.entities.getAsync(assetId, new entity_load_configuration_1.EntityLoadConfiguration(culture_load_option_1.CultureLoadOption.None, property_load_option_1.PropertyLoadOption.None, new relation_load_option_1.RelationLoadOption([new relation_specification_1.RelationSpecification(relationToTarget)])));
        if (asset == null) {
            throw new Error(`Unable to retrieve Asset with Id ${assetId} from CH`);
        }
        (_a = asset === null || asset === void 0 ? void 0 : asset.getRelation(relationToTarget)) === null || _a === void 0 ? void 0 : _a.setIds([entityId]);
        yield client.entities.saveAsync(asset);
        console.log(`Linked Asset with Id ${assetId} to ${entityId} via relation ${relationToTarget}`);
        return true;
    });
}
exports.UploadToDam = UploadToDam;
