import * as pulumi from "@pulumi/pulumi";
import * as volcengine from "@volcengine/pulumi";
import { RequestObj } from "@volcengine/openapi/lib/base/types";
import * as utils from "./utils"
import { ResourceStatusPoller } from "./status_poller"

/**
 * 1. Create ECS instance with random password, or an initially provisioned keypair
 * 2. Create ECS type secret with custom ssh key pair. (Associate it with ECS instance above)
 * 3. Poll the status of cloud assistant installed on the ECS instance
 * 4. When the status of cloud assistant turns to "Running", manually rotate the ECS type secret
 * 5. Now can use ssh private key stored in secret manager to login to ECS created above
 * P.S. This will not be reflected in the metadata of ECS, and it will not prohibit password-based login for ECS.
 */
export function main() {
    const instance = new volcengine.ecs.Instance("test-instance-type", {
        instanceName: "test-instance-type",
        description: "test-instance-type",
        imageId: 'image-ydf193g9cqb6uoeqqqj8', // Ubuntu 24.04 64 bit
        instanceType: 'ecs.c4i.large', // 2 vCPU, 4 GiB, ecs.g4i.large -> 2 vCPU, 8 GiB
        instanceChargeType: 'PostPaid',
        systemVolumeType: 'ESSD_PL0',
        systemVolumeSize: 40,
        subnetId: "PutYourOwn",
        securityGroupIds: ["PutYourOwn"],
        password: "PutYourOwn",
    });

    const extendedConfig = instance.id.apply(instanceId => {
        return JSON.stringify(
            { "InstanceId": instanceId, "SecretSubType": "SSHKey", "CustomData": { "desc": "test" } }
        )
    })

    const { privateKey, publicKey } = utils.generateSshKeyPair()

    const secretValue = JSON.stringify(
        { "UserName": "root", "PublicKey": publicKey, "PrivateKey": privateKey }
    )

    const ecsSecret = new volcengine.kms.Secret("test-ecs-secret", {
        secretName: "for-ecs-secret",
        secretType: "ECS",
        extendedConfig: extendedConfig,
        secretValue: secretValue,
        automaticRotation: false,
    });

    const config = new pulumi.Config("volcengine")

    const region = config.require("region")
    const accessKey = config.require("accessKey")
    const secretKey = config.requireSecret("secretKey")
    const ecsSecretTrn = ecsSecret.trn
    const instanceId = instance.id


    pulumi.all([ecsSecretTrn, secretKey, instanceId]).apply(async ([ecsSecretTrn, secretKey, instanceId]) => {

        console.log("Created " + ecsSecretTrn + " with instance: " + instanceId)

        // Have to poll until the cloud assistant's status turns to "Running" on the respective ECS instance
        // Because ECS type secret uses cloud assistant to submit key rotation and modify ~/.ssh/authorized_keys in corresponding ECS instaces
        const assistantRequest: RequestObj = {
            method: "GET",
            region: region,
            params: {
                Action: "DescribeCloudAssistantStatus",
                Version: "2020-04-01",
                "InstanceIds.1": instanceId
            },
        }

        const statusPoller = new ResourceStatusPoller("Running", 5000, 20)
        statusPoller.setResourceProvider(utils.invokeOpenAPI);
        statusPoller.setStatusExtractor(utils.getAssistantStatus);

        const canProceed = await statusPoller.poll(accessKey, secretKey, "ecs", assistantRequest, { "InstanceId": instanceId });

        if (canProceed) {
            // Rotate ssh in secret manager manually to apply change in ECS instance OS level (~/.ssh/authorized_keys)
            const rotateRequest: RequestObj = {
                method: "GET",
                region: region,
                params: {
                    Action: "RotateSecret",
                    Version: "2021-02-18",
                    SecretName: "for-ecs-secret"
                },
            }

            utils.invokeOpenAPI(accessKey, secretKey, "kms", rotateRequest)
        }
    })
}





