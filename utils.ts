import * as forge from 'node-forge';
import { Signer } from '@volcengine/openapi';
import { RequestObj, Credentials } from "@volcengine/openapi/lib/base/types";

export function generateSshKeyPair(keySize: number = 2048): { privateKey: string; publicKey: string } {
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: keySize, e: 0x10001 });
    const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);

    const publicKeySsh = forge.ssh.publicKeyToOpenSSH(keyPair.publicKey, 'user@example.com');

    return {
        privateKey: privateKeyPem,
        publicKey: publicKeySsh,
    };
}

export async function invokeOpenAPI(ak: string, sk: string, service: string, openApiRequestData: RequestObj): Promise<Response> {
    const credentials: Credentials = {
        accessKeyId: ak,
        secretKey: sk,
    }

    const signer = new Signer(openApiRequestData, service);
    const signedQueryString = signer.getSignUrl(credentials);

    // console.log(signedQueryString)

    const endpoint = `https://${service}.cn-beijing.volcengineapi.com`
    const response = await fetch(`${endpoint}/?` + signedQueryString)

    console.log(service + "." + openApiRequestData.params.Action + ": " + response.status)

    return response
}

// This is just a demo snippet to extract status of assistant
export function getAssistantStatus(result: Record<string, any>, customObj?: Record<string, any>): string {
    if (result["Result"]["Instances"].length === 0) {
        return "Error, assistant not ready";
    } else {
        if (customObj != null && customObj["InstanceId"] === result["Result"]["Instances"][0]["InstanceId"])
            return result["Result"]["Instances"][0]["Status"];
    }
    return "Error, no status found";
}

