import * as pulumi from "@pulumi/pulumi";
import * as volcengine from "@volcengine/pulumi";
import * as fs from "fs";

const KEY_PAIR_NAME = "demo-key-pair"
const SECRET_NAME = "demo-key-pair-secret"
const KEY_PEN_PATH = "./poc_key_pair_private_key.pem"

/**
 * 1. Keypair's private key can be downloaded only once when keypair is created
 * 2. If don't want to update the secret, just set ignoreChanges: ["secretValue"]
 * 3. Just catch "File not exists" exception
 */
function createKeyPairSecret() {
    // Create key pair and store PEM content in local file

    const keyPair = new volcengine.ecs.KeyPair(KEY_PAIR_NAME, {
        keyPairName: KEY_PAIR_NAME,
        keyFile: KEY_PEN_PATH,
    });

    // Read local file content, but may not exists because of the rerunn of pipeline or someone else trigger this pipeline
    // Private key can be downloaded once, volcengine will not store private key for the safty purpose.
    const privateKeyContent = keyPair.id.apply(() => {
        try {
            // Make sure to use readFileSync, this will guarantee that the private key file content is obtained before secret is created
            const content = fs.readFileSync(KEY_PEN_PATH, "utf-8");
            // Just for verification, do not enable this in your production environment
            console.log(content);
            return content;
        } catch (err) {
            console.log("File doesn't exists! Created before.")
            return ""
        }
    });


    let opt: pulumi.CustomResourceOptions = {
        ignoreChanges: ["secretValue"]
    }
    // You can customize your own logic to determain whether secret should be updated
    // Here is only a demo
    const forceUpdate = false
    if (forceUpdate) {
        opt = {}
    }
    // Put PEM content in Secrets Manager
    new volcengine.kms.Secret(SECRET_NAME, {
        secretName: SECRET_NAME,
        secretType: "Generic",
        secretValue: privateKeyContent
    }, opt);
}

export function main() {
    createKeyPairSecret()
}
