//#region imports
import * as hjson                       from "hjson";
import { SERReport }                    from "./serReport";
import { ISerTemplate,
         ISerConnection,
         ISerSenseSelection,
         ISerConfig,
         ISerReport}            from "../node_modules/ser.api/index";
import { ISERDistribute,
         ESERDistribute,
         ISERHub,
         ISERFile,
         ISERMail, 
         ISERReportExtend}                     from "./utils";
import { reject } from "../node_modules/@types/bluebird/index";
import { debug } from "util";
//#endregion

export class SERApp {

    //#region private variables
    private global: EngineAPI.IGlobal;
    private defaultScriptPart: string;
    private serReport: SERReport;
    private distribute: ISERDistribute = {};
    private selection: ISerSenseSelection[] = [];
    private app: EngineAPI.IApp;
    //#endregion

    constructor(global: EngineAPI.IGlobal) {
        console.log("Constructor called: SERApp");

        this.global = global;
        this.defaultScriptPart = `
            Let resultWithTaskId = SER.START(task);
            TRACE TaskId: $(resultWithTaskId);

            Let version = SER.STATUS('');
            TRACE Version: $(version);
            TRACE Result: $(resultWithTaskId);

            Set Status = 0;
            Do while Status < 3 and Status > -1
            Let result = SER.STATUS(resultWithTaskId);
            Let Status = num#(TextBetween(result,'status":','}'))+0;
            TRACE Status: $(Status);
            Sleep 1000;
            Loop

            TRACE $(result);`;
        this.serReport = new SERReport();
    }

    /**
     * getSerJson
     */
    getSerJson(): Promise<string> {
        console.log("fcn called: createSerScript - SERApp");

        return new Promise((resolve, reject) => {
            this.serReport.createReportConfig()
            .then((serReportProperties) => {
                try {
                    resolve(hjson.stringify(serReportProperties));
                } catch (error) {
                    Promise.reject(error);
                }
            })
            .catch((error) => {
                reject(error);
            });
        });
    }

    /**
     * initApp
     * @param app
     */
    initApp(app?: EngineAPI.IApp):Promise<void> {
        console.log("fcn called: initApp - SERApp");

        return new Promise((resolve, reject) => {
            if (typeof(app)!=="undefined") {
                this.app = app;
                resolve();
            } else {
                this.createApplication("InitialAppWillBeRenamed")
                .then((app) => {
                    this.app = app;
                    resolve();
                })
                .catch((error) => {
                    console.log("ERROR in constructor of SERApp", error);
                    reject(error);
                });
            }
        });
    }

    /**
     * createSerScript
     * @param appName
     * @param input
     * @param obj
     */
    createSerScript(appName?: string, input?: string, obj?: any): Promise<void> {
        console.log("fcn called: createSerScript - SERApp");

        return new Promise((resolve, reject) => {
            let serRepotConf;

            if (typeof(appName)!=="undefined" || typeof(input)!=="undefined") {
                this.serReport.setConnection(appName);
                this.serReport.setTemplate(input);
            }

            this.serReport.createReportConfig()
            .then((serReportProperties) => {
                serRepotConf = serReportProperties;
                return this.app.getScript();
            })
            .then((rootScript) => {
                let hstring = hjson.stringify(serRepotConf);
                rootScript += `///$tab Reporting Task\r\n///$autogenerated\r\n
                SET task = ´${hstring.substring(1, hstring.length-2)}´;
                    ${this.defaultScriptPart}
                `;

                console.log("rootScript", rootScript);
                return this.app.setScript(rootScript);
            })
            .then(() => {
                return this.app.doSave();
            })
            .then(() => {
                resolve();
            })
            .catch((error) => {
                reject(error);
            });
        });
    }

    /**
     * getContentLibraries
     */
    getContentLibraries(): Promise<EngineAPI.IContentLibraryList> {
        console.log("fcn called: getContentLibraries - SERApp");

        return new Promise((resolve, reject) => {
            this.app.getContentLibraries()
            .then((contentLibraries) => {
                resolve(contentLibraries);
            })
            .catch((error) => {
                reject(error);
            });
        });
    }

    /**
     * loadContentForLib
     * @param libName
     */
    getContentForLib(libName: string): Promise<EngineAPI.IStaticContentList> {
        console.log("fcn called: loadContentForLib - SERApp");

        return new Promise((resolve, reject) => {
            this.app.getLibraryContent(libName)
            .then((content) => {
                resolve(content);
            })
            .catch((error) => {
                reject(error);
            });
        });
    }

    /**
     * setAppName
     * @param appName
     */
    setAppName(appName: string): Promise<void> {
        console.log("fcn called: setAppName - SERApp");

        return new Promise((resolve, reject) => {
            this.app.getAppProperties()
            .then((properties) => {
                properties.qTitle = appName;
                return this.app.setAppProperties(properties);
            })
            .then(() => {
                this.app.doSave();
            })
            .then(() => {
                resolve();
            })
            .catch((error) => {
                reject(error);
            });
        });
    }

    /**
     * getConnections
     */
    getConnections(): Promise<EngineAPI.IConnection[]> {
        console.log("fcn called: getConnections - SERApp");

        return new Promise((resolve, reject) => {
            this.app.getConnections()
            .then((connections) => {
                resolve(connections);
            })
            .catch((error) => {
                reject(error);
            });
        });
    }

    /**
     * addDistributeSection
     * @param distrbuteMode
     * @param distribute
     */
    addDistributeSection(distrbuteMode: string, distribute: ISERHub | ISERFile | ISERMail) {
        console.log("fcn called: setDistribute - SERApp");

        let mode = ESERDistribute[distrbuteMode];

        switch (mode) {
            case ESERDistribute.file:
                this.distribute.file = distribute as ISERFile;
                break;
            case ESERDistribute.mail:
                this.distribute.mail = distribute as ISERMail;
                break;

            default:
                this.distribute.hub = distribute as ISERHub;
                break;
        }

        this.serReport.setDistribute(this.distribute);
    }

    /**
     * addSelectionSection
     * @param selection
     */
    addSelectionSection(selection: ISerSenseSelection) {
        console.log("fcn called: setDistribute - SERApp");

        this.selection.push(selection);
        this.serReport.setSelections(this.selection);
    }

    /**
     * getSerContent
     */
    setSerContent(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.getScript()
            .then((script) => {
                return this.analyseScriptAndConvertToReport(script);
            })
            .then((report) => {
                this.serReport = new SERReport();
                this.serReport.setReport(report);
                resolve();
            })
            .catch((error) => {
                reject(error);
            });
        });
    }

    /**
     * getSerContent
     */
    getSerContent(): Promise<ISERReportExtend> {
        return new Promise((resolve, reject) => {
            try {
                resolve(this.serReport.getReportInJson());
            } catch (error) {
                reject(error);
            }
        });
    }

    setFullPropertys(report: ISERReportExtend): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.serReport.setConnection(report.connections);
                this.serReport.setDistribute(report.distribute);
                this.serReport.setGeneral(report.general);
                this.serReport.setTemplate(report.template);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    private createApplication(appName: string): Promise<EngineAPI.IApp> {
        console.log("fcn called: createApplication - SERApp");

        return new Promise((resolve, reject) => {
            let resApp: EngineAPI.IApp;
            this.global.createApp(appName, "main")
            .then((app) => {
                console.log("APP", app);
                return this.global.openDoc(app.qAppId);
            })
            .then((app) => {
                resolve(app);
            })
            .catch((error) => {
                console.error("ERROR in createApplication", error);
                reject(error);
            });
        });
    }

    private getScript(): Promise<string> {
        return new Promise((resolve, reject) => {
            this.app.getScript()
            .then((script) => {
                resolve(script);
            })
            .catch((error) => {
                reject(error);
            });
        });
    }

    private analyseScriptAndConvertToReport(script: string): Promise<ISERReportExtend> {
        return new Promise((resolve, reject) => {
            try {
                let regexString = /SER\.START\(([^)]+)\)/g;
                let regexMatch = regexString.exec(script);
                let serTaskVariable = regexMatch[1];

                // let regexString1 = new RegExp(`/SET ${serTaskVariable} = ´([^´]+´)`);
                // regexString1 = /SET task = ´([^´]+´)/g;
                // let regexMatch1 = regexString.exec(script);

                let startPos = script.indexOf(`SET ${serTaskVariable} = ´`);
                let subScript = script.substr(startPos);
                let endPos = subScript.indexOf(";");

                subScript = subScript.substr(0, endPos);

                let arrSubScript = subScript.split("´");
                let jsonString = arrSubScript[1];

                resolve(hjson.parse(jsonString));
            } catch (error) {
                reject(error);
            }
        });
    }

}