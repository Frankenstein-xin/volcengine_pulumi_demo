import { RequestObj } from "@volcengine/openapi/lib/base/types";


export class ResourceStatusPoller {

    private targetStatus: string;
    private interval: number;
    private maxTryNum: number;
    private currentTry: number;
    private resourceProvider!: (ak: string, sk: string, service: string, openApiRequestData: RequestObj) => Promise<Response>;
    private statusExtractor!: (result: Record<string, any>, customConf?: Record<string, any>) => string


    constructor(targetStatus: string, interval: number = 3000, maxTryNum: number = 3) {
        this.targetStatus = targetStatus;
        this.interval = interval;
        this.maxTryNum = maxTryNum;
        this.currentTry = 0;
    }

    setResourceProvider(resourceProvider: (ak: string, sk: string, service: string, openApiRequestData: RequestObj) => Promise<Response>) {
        this.resourceProvider = resourceProvider;
    }

    setStatusExtractor(statusExtractor: (result: Record<string, any>, customConf?: Record<string, any>) => string) {
        this.statusExtractor = statusExtractor;
    }

    async poll(ak: string, sk: string, service: string,
        openApiRequestData: RequestObj, customConf?: Record<string, any>): Promise<Boolean> {

        const startTime = Date.now();

        while (true) {
            this.currentTry++;

            if (this.currentTry > this.maxTryNum) {
                throw new Error(`Error: Poll ${this.currentTry} exceed ${this.maxTryNum} times`);
            }

            console.log(`[Polling] current try: ${this.currentTry}`);

            try {
                const response = await this.resourceProvider(ak, sk, service, openApiRequestData);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                const status = this.statusExtractor(data, customConf);

                console.log(`[Polling] current status: ${status}`);

                if (status === this.targetStatus) {
                    console.log(`Status fullfill: ${status}`);
                    return true;
                }

                await new Promise(resolve => setTimeout(resolve, this.interval));

            } catch (error) {
                console.error('Request fail:', error instanceof Error ? error.message : error);
                console.error('Exception stack:', error instanceof Error ? error.stack : error);
                await new Promise(resolve => setTimeout(resolve, this.interval));
            }
        }
    }
};
