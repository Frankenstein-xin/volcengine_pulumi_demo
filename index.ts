import * as ManualRtote from "./manual_rotate_ecs_type_secret"
import * as UpdateOnlyWhenNeeded from "./update_only_when_needed"
import * as IAMSecrets from "./iam_secret"

function main() {
    // const runMode = process.env.RUN_MODE;
    // if (runMode === "ManualRtote") {
    //     ManualRtote.main()
    // } else {
    //     UpdateOnlyWhenNeeded.main()
    // }
    IAMSecrets.main()
}

main()