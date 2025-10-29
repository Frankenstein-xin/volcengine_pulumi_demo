import * as volcengine from "@volcengine/pulumi";

export async function main() {
    const iamUser = new volcengine.iam.User("iam-secret-user", {
        description: "For IAM secret",
        displayName: "iam-secret-user",
        userName: "iam-secret-user",
    });

    const policyDocument = {
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "kms:*"
                ],
                "Resource": [
                    "*"
                ]
            }
        ]
    }

    const policy = new volcengine.iam.Policy("iam-secret-user", {
        policyDocument: JSON.stringify(policyDocument),
        policyName: "iam-secret-user-policy",
    });

    const policyAttachment = new volcengine.iam.UserPolicyAttachment("policy-attachment", {
        userName: iamUser.userName,
        policyName: policy.policyName,
        policyType: policy.policyType,
    });

    const secretValue = JSON.stringify(
        { "AccessKeys": [{ "AccessKeyId": "initialize", "AccessKeySecret": "" }] }
    )

    const extendedConfig = iamUser.userName.apply(userName => {
        return JSON.stringify(
            { "UserName": userName, "SecretSubType": "IAMUserAccessKey" }
        )
    })

    const iamSecret = new volcengine.kms.Secret("iam-secret", {
        secretName: "iam-secret",
        secretType: "IAM",
        secretValue: secretValue,
        automaticRotation: true,
        extendedConfig: extendedConfig
    });
}


