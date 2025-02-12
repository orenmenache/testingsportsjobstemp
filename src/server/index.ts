import fs from 'fs';

import { CORE } from '../types/CORE';
import getEdition from './functions/get/edition';
import { MYSQL_DB } from '../classes/MYSQL_DB';
import getBrand from './functions/get/brand';
import getProduct from './functions/get/product';
import { EDIT, GenericProcessProps } from './functions/process/EDIT';
import { LOG } from './functions/log/LOG';
import getTimestamp from './functions/get/timestamp';
import recognizeError from './functions/error/recognize';
import cleanup from './functions/cleanup';
import { AE } from '../types/AE';
import updateJob from './functions/db/updateJob';
import { TABLES } from '../config/TABLES';
import { VictorResult } from './functions/process/AERenderVersion/processVictorResult';
import handleGoogleDriveReadError__AERENDER from './functions/error/handleGoogleDriveRead__AERENDER';
import { TimeDeltas } from '../V2/classes/TimeDeltas';
import { appendToLogFile } from '../V2/utils/appendToLog';
import { Paths } from '../types/CORE/Paths';
import { getGeneralPaths } from '../functions/R2R/components/getGeneralPaths';
import { coreTables } from '../constants/coreTables';
import { getSubfolderStrucure } from '../functions/R2R/components/getSubfolderStructure';
import { DB } from '../types/DB';
import identifyRenderMachine from '../functions/identifyRenderMachine';
import { getAERenderPath } from '../V2/config/constants/getAERenderPath';
import { PATHS } from '../functions/PATHS';

// will be used to check if system is busy
const systemBusyFilePath = `G:/My Drive/Sports/systemBusy.txt`;

export default async function SERVER_MAIN(
    logToConsole: boolean = true, 
    debugMode: boolean = false
){
    const funcName = `SERVER_MAIN`;

    /**
     * Initialize the databases,
     * TimeDeltas, logFile and renderMachine.
     */
    const SportsDB = new MYSQL_DB();
    SportsDB.createPool('SPORTS');
    const BackofficeDB = new MYSQL_DB();
    BackofficeDB.createPool('BACKOFFICE');

    const RM = await identifyRenderMachine(SportsDB);
    const TD = new TimeDeltas();
    const nowYYYYMMDDhhmmss = TD.formatYYYYMMDDhhmmss(new Date());
    const logFileName = `test ${nowYYYYMMDDhhmmss}.txt`;

    /**
     * Log first message to the log file.
     */
    let nextMessage = `Started test @ ${nowYYYYMMDDhhmmss}${debugMode && ` in debug mode`}`;
    appendToLogFile(TD, nextMessage, logFileName, logToConsole, debugMode ? 'cyan' : 'pink');

    try {
        !debugMode && checkIfSystemIsBusy();

        const goOverFreshJobs = async () => {
            const freshJobs: AE.Job[] = await SportsDB.SELECT(TABLES.jobs, {
                whereClause: { status: 'fresh' },
            });

            if (freshJobs.length === 0) {
                nextMessage = `No fresh jobs found`;
                appendToLogFile(
                    TD,
                    nextMessage,
                    logFileName,
                    logToConsole,
                    'orange'
                );
                // return true;
            } else {
                for (const job of freshJobs) {
                    try {
                        await editSingleFreshJob(
                            RM,
                            TD,
                            job,
                            SportsDB,
                            BackofficeDB,
                            logFileName,
                            debugMode,
                        );
                    } catch (e) {
                        LOG.message(`${e}`, 'red');
                    }
                }
            }
        };

        await goOverFreshJobs();

        const goOverEditedJobs = async () => {
            const editedJobs: AE.Job[] = await SportsDB.SELECT(TABLES.jobs, {
                whereClause: { status: 'edited' },
            });

            if (editedJobs.length === 0) {
                nextMessage = `No edited jobs found`;
                appendToLogFile(
                    TD,
                    nextMessage,
                    logFileName,
                    logToConsole,
                    'orange'
                );
                // return true;
            } else {
                for (const job of editedJobs) {
                    try {
                        await renderSingleEditedJob(
                            RM,
                            TD,
                            job,
                            SportsDB,
                            BackofficeDB,
                            logFileName,
                            debugMode,
                        );
                    } catch (e) {
                        LOG.message(`${e}`, 'red');
                    }
                }
            }
        };

        await goOverEditedJobs();
    } catch (e) {
        // handle error
        nextMessage = `${funcName} failed @ ${getTimestamp()} with error: ${e}`;
        appendToLogFile(TD, nextMessage, logFileName, logToConsole, 'red');
    } finally {
        await SportsDB.pool.end();
        await BackofficeDB.pool.end();
        // await cleanup();
    }
}

async function editSingleFreshJob(
    RM: DB.RenderMachine,
    TD: TimeDeltas,
    job: AE.Job,
    SportsDB: MYSQL_DB,
    BackofficeDB: MYSQL_DB,
    logFileName: string,
    debugMode: boolean = false
): Promise<void> {
    const funcName = `processSingleFreshJob`;

    let nextMessage = '';

    try {
        // write systemBusy file
        !debugMode && fs.writeFileSync(systemBusyFilePath, 'true');

        try {
            nextMessage = `Next job: ${job.brand_name} ${job.product_name} ${job.lang}`;
            appendToLogFile(TD, nextMessage, logFileName, true, 'cyan');

            const edition: CORE.Edition = await getEdition(SportsDB, job);
            const brand: CORE.Brand = await getBrand(SportsDB, job.brand_name);
            const product: CORE.Product = await getProduct(
                SportsDB,
                job.product_name
            );

            // throw JSON.stringify(edition, null, 4);

            let processProps: GenericProcessProps = {
                SportsDB,
                BackofficeDB,
                brand,
                edition,
                product,
                dbgLevel: 1,
            };

            if (!(product.product_name in EDIT))
                throw `No process found for ${product.product_name}`;
            let victorResult: VictorResult = await EDIT[product.product_name](
                processProps
            );

            let potentialErrorName = recognizeError(victorResult.message || '');

            // only in the event of a googleDriveRead error, we'll retry the process.
            if (potentialErrorName === 'googleDriveRead')
                victorResult = await handleGoogleDriveReadError__AERENDER({
                    product,
                    processProps,
                    victorResult,
                });

            potentialErrorName = recognizeError(victorResult.message || '');

            // if there's an error that is not of the following types, throw the result.
            if (
                !(
                    potentialErrorName === 'success' ||
                    potentialErrorName === 'empty' ||
                    potentialErrorName === 'context'
                )
            ) {
                // Let's try not updating the job status to error, so that we can retry the process.
                // await updateJob({ SportsDB, nextJob, log, newStatus: 'error' });
                throw victorResult.message;
            }

            nextMessage = `Edit completed successfully (${potentialErrorName})`;
            // log += nextMessage + '\n';
            LOG.message(nextMessage, 'green');

            await updateJob({
                SportsDB,
                nextJob: job,
                log: '',
                newStatus: 'edited',
            });

            // return victorResult;
        } catch (e) {
            // handle error
            nextMessage = `${job.brand_name} ${job.lang} ${
                job.product_name
            } failed @ ${getTimestamp()} with error: ${e}`;
            appendToLogFile(TD, nextMessage, logFileName, true, 'red');
        }
    } catch (e) {
        throw `${funcName}: ${e}`;
    } finally {
        // write systemBusy file
        !debugMode && fs.writeFileSync(systemBusyFilePath, 'false');
    }
}

async function renderSingleEditedJob(
    RM: DB.RenderMachine,
    TD: TimeDeltas,
    job: AE.Job,
    SportsDB: MYSQL_DB,
    BackofficeDB: MYSQL_DB,
    logFileName: string,
    debugMode: boolean = false
) {
    try {
        // write the initial log message into a new log file
        appendToLogFile(TD, 'Test started', logFileName, true, 'pink');

        const aeRenderPath = getAERenderPath();

        const edition: CORE.Edition = await getEdition(SportsDB, job);
        const brand: CORE.Brand = await getBrand(SportsDB, job.brand_name);
        const product: CORE.Product = await getProduct(
            SportsDB,
            job.product_name
        );
        const renderMachine: DB.RenderMachine = await identifyRenderMachine(
            SportsDB
        );

        const generalFolderPaths: Paths.GeneralFolders = await getGeneralPaths(
            renderMachine,
            SportsDB
        );

        /**
         * get the buleprint of the subfolder structure for the given product.
         */
        let productSubfolders: CORE.AE.ProductSubFolder[] =
            await SportsDB.SELECT(coreTables.product_subfolders, {
                whereClause: { product_name: edition.product_name },
            });

        const subFolders = getSubfolderStrucure(
            productSubfolders,
            renderMachine,
            edition,
            brand,
            product,
            generalFolderPaths
        );

        const timeLimit = 5000;

        const abortController = new AbortController();

        const paths: AE.Json.AbsolutePath.Obj = PATHS.getAll__CORE(
            subFolders,
            edition
        );

        throw JSON.stringify(paths, null, 4);

        const projectFilePath = paths.projectSaveFile;
        // const exportFolderPath = paths.;
        const exportFileName = `GivTrade test AERender ${TD.now.getTime()}.mp4`;
        const renderCompName = `0_Main comp_AERender`;

        // const aeRender = new AERender(
        //     TD,
        //     logFileName,
        //     aeRenderPath,
        //     projectFilePath,
        //     exportFolderPath,
        //     exportFileName,
        //     renderCompName,
        //     timeLimit,
        //     abortController
        // );

        try {
            // await aeRender.execPromiseInstance;
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                console.warn(
                    'Render process aborted. error.name === "AbortError"'
                );
                appendToLogFile(
                    TD,
                    'Render process aborted. error.name === "AbortError"',
                    logFileName
                );
            } else {
                console.error('Render process failed:', error);
                appendToLogFile(
                    TD,
                    `Render process failed: ${(error as Error).message}`,
                    logFileName
                );
            }
        }
    } catch (e) {
        const errorMessage = `Caught Error: ${e}`;
        console.warn(errorMessage);
        appendToLogFile(TD, errorMessage, logFileName);
    }
}

function checkIfSystemIsBusy() {
    // create systemBusy file if it doesn't exist
    if (!fs.existsSync(systemBusyFilePath))
        fs.writeFileSync(systemBusyFilePath, 'false');

    let systemBusy = fs.readFileSync(systemBusyFilePath).toString() === 'true';
    if (systemBusy) throw `System is busy`;
}
