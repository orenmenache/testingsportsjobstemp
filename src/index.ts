/**
 * Here we'll convert data from the DB to a Json.Payload object
 */

import fs from 'fs';
import axios from 'axios';

import { MYSQL_DB } from './classes/MYSQL_DB';
import { GENERALNEWS } from './functions/GENERALNEWS';
import { STANDINGS } from './functions/STANDINGS';
import identifyRenderMachine from './functions/identifyRenderMachine';
import { AE } from './types/AE';
import { DB } from './types/DB';
import { EDITIONS } from './functions/EDITIONS';
import { FOLDERS } from './functions/FOLDERS';
import { PATHS } from './functions/PATHS';
import { itemTextKeys, mappingFuncs, itemFileKeys, standingTextKeys } from './functions/MAPPING';
import { PRESENTERSCHEMES } from './functions/PRESENTERSCHEMES';
import { getPresenterSchemeFiles } from './functions/Presenters';
import { NEXTMATCHES } from './functions/NEXTMATCHES';
import { CORE } from './types/CORE';
import { coreTables } from './constants/coreTables';
import { getBrandEditionProduct } from './functions/helper/getBrandEditionProduct';
import { buildAbsoluteSubfolderStructure__AE } from './functions/helper/buildAbsoluteSubfolderStructure';
import path from 'path';
import { getFormattedDate } from './functions/helper/getFormattedDate';
import { testCalendarSNSAE } from './functions/standalone/Economic News/Calendar SNS/test';
import { Fortuna_SNS_AE_Ranking__CORE } from './fortuna_AESNSRanking';
import { getExpectedVariables__AE } from './getExpectedVariables__AE';
import { getBackgrounds__AE } from './getBackgrounds__AE';
import { goNoGo } from './getGoNoGo';
import { Fortuna_AE_daily_news__CORE } from './fortuna_AEdailyNews';
import { Race2Real_AE_daily_news } from './functions/R2R/race2real_AEdailyNews HI TRANS';
import { Race2Real_AE_daily_news__MOTORSPORT_EN } from './functions/R2R/race2real_AEdailyNews EN MOTORSPORT';

const tempMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// async function Fortuna_SNS_AE_Schedule__CORE() {    
//     const DB = new MYSQL_DB();
//     DB.createPool();

//     try {
//         /**
//          * Firstly we define the two main variables
//          * @param brand_name string,
//          * @param lang of the type @type {CORE.Keys.Lang} 
//          * @param product_name of the @type {CORE.Keys.Product}
//          * 
//          * When transitioning into the UI, these will be
//          * the two main variables that will be set by the user
//          * 
//          * besides these, we'll try and make all the data flow
//          * from the database.
//          */
//         const brand_name: string = 'Fortuna';
//         const product_name: CORE.Keys.Product = 'SNS_AE_Schedule';
//         const lang: CORE.Keys.Lang = 'RO';
//         const renderMachine: DB.RenderMachine = await identifyRenderMachine(DB);
        
//         const now = new Date();
//         const PORT = 9411;
//         const API_Endpoint = '/api/extboiler/';

//         let texts: AE.Json.TextImport[] = [];
//         let files: AE.Json.FileImport[] = [];
//         let trimSyncData: AE.Json.TS.Sequence = [];

//         const {brand, edition, product} = 
//             await getBrandEditionProduct(DB, brand_name, product_name);

//         const $: {[key in CORE.Keys.AE.ExpectedPathVariables]: string} = 
//             await getExpectedVariables__AE({renderMachine, DB, brand, edition, product});

//         /** 
//          * get the buleprint of the subfolder structure for the given product.
//          */
//         let subfolderStructure: CORE.AE.ProductSubFolder[] = 
//             await DB.SELECT(coreTables.product_subfolders,
//             {whereClause: {product_name: edition.product_name}}
//         );

//         /** 
//          * build the subfolders as an object with the absolute paths
//          * where the keys are of @type {CORE.Keys.AE.ProductSubFolder}
//          */
//         const subFolders: {[key in CORE.Keys.AE.ProductSubFolder]: string} = 
//             buildAbsoluteSubfolderStructure__AE(subfolderStructure, $);

//         const backgrounds: {[key in DB.SportName]: string[]} = getBackgrounds__AE({subFolders});

//         // const withLangTableKeys = baseTableKeys.map(key => `${key}__${$.lang}`) as TableKeys.CricketNewsEdition<typeof $.lang>[];
//         const newsItems = await DB.SELECT<{[key: string]: string}>(`GeneralNews.RAPID__TRANS_NEWS`);
//             if (newsItems.length === 0) throw `No general news items found`;
        
//         /** 
//          * because we want a to select a random template 
//          * and background and take the selected file out of the pool
//          * we first create the initial
//          */
//         const templateFolderContent: string[] = fs.readdirSync(subFolders.templates);
//         let templateFiles: string[] = templateFolderContent.filter(file => file.endsWith('.aep'));
//             if (templateFiles.length === 0) throw `No templates found in folder: ${subFolders.templates}`;

//         // now we know that we have at least 1 template and 1 background

        

//         const itemKeys: string[] = ['headline', 'sub_headline', 'narration'];
//         const item: {[key: string]: string} = newsItems[0];
//         // for (let item of newsItems) {
//             goNoGo({item, itemKeys});
//                 // if (!goNoGo) return; // continue;

//         /**
//          * Now for every item we get the texts and files
//          * if there are standings we get the standings texts
//          * currently the schedule texts are not implemented
//          */
//         const runThroughItems = async () => {
//             const items: DB.Item.JoinedNews[] = await GENERALNEWS.getTransItemsByLang(DB, lang);
//                 if (items.length === 0) throw `No items found for lang ${lang} in table RAPID__TRANS_NEWS`;

//             for (let i=0; i<items.length; i++) {
//                 const item = items[i];
        
//                 const populateItemTexts = () => {
//                     for (const itemTextKey of itemTextKeys) {
//                         const textLayerName =
//                             mappingFuncs[itemTextKey as DB.Jobs.Mapping.ItemFileKey](
//                                 item
//                             );

//                         const text: AE.Json.TextImport = {
//                             text: item[itemTextKey as keyof DB.Item.News],
//                             textLayerName,
//                             recursiveInsertion: false,
//                         };
//                         texts.push(text);
//                     }
//                 }

//                 populateItemTexts();

//                 const populateItemFiles = () => {

//                     // console.log(`Narration: ${subFolders.narration}`);
//                     // console.log(`item.file_name: ${item.file_name}`);

//                     const itemFiles: {[key: string ]: string} = {
//                         narration: `${subFolders.narration}${item.file_name}`,
//                         background: path.resolve(subFolders.dynamic_backgrounds.replace('$item_specific_sport_name',item.sport_name),item.background).replace(/\\/g, '/'),
//                         logo: `${$.logos.replace('$item_specific_sport_name',item.sport_name)}/${item.logo}`,
//                     }

//                     // throw `itemFiles: ${JSON.stringify(itemFiles, null, 2)}`

//                     for (let key in itemFiles){
//                         const absoluteFilePath = itemFiles[key];

//                         if (!fs.existsSync(absoluteFilePath))
//                             throw `absoluteFilePath path does not exist: ${absoluteFilePath} for key: ${key}`;
//                         files.push({
//                             absolutePath: absoluteFilePath,
//                             compositionName:
//                                 mappingFuncs[
//                                     key as DB.Jobs.Mapping.ItemFileKey
//                                 ](item),
//                             resizeAction: key === 'logo' ? 'fitToMedia' : null // 'fitToComp', // currently fitToComp is throwing an error
//                         });
//                     }
//                 }
                
//                 populateItemFiles();
//             } // end items for loop
//         }

//         await runThroughItems();

//         const trimNarration = () => {
//             // firstly we trim the narration comps
//             for (let i = 1; i <= 5; i++) {
//                 const narrationCompName = `News-Narration${i}`;
//                 const trim: AE.Json.TS.Trim = {
//                     method: 'trimByAudio',
//                     layerOrCompName: narrationCompName,
//                 };
//                 trimSyncData.push(trim);
//             }
//         }

//         trimNarration();

//         const trimSyncNews = () => {
//             // now let's sync narration comps and trim the news comps
//             for (let ii = 1; ii <= 2; ii++) {
                
//                 const syncNarrationComps = () => {
//                     // first we sync the internal narration comps
//                     // narration comps 1-3 are in News comp 1 and 4-5 are in News comp 2
                    
//                     // we start with syncing the first narration comp
//                     // to the beginning of the timeline (cause it's been trimmed)
//                     const syncFirstNarrationLayerToStart = () => {
//                         const narrationCompNumber = (ii - 1) * 3 + 1; // 1 or 4
//                         const narrationCompName = `News-Narration${narrationCompNumber}`;
//                         const sync: AE.Json.TS.Sync = {
//                             method: 'syncHeadTail',
//                             padding: 0.1,
//                             layerAName: narrationCompName,
//                             layerBName: `stickToStart${ii}`, // 1 or 2
//                         };
//                         trimSyncData.push(sync);
//                     }
//                     syncFirstNarrationLayerToStart();

//                     const numberOfNarrationComps = 4 - ii;
//                     for (let jj = 1; jj < numberOfNarrationComps; jj++) {
//                         const narrationCompNumber = (ii - 1) * 3 + jj; // 1-2 for news 1 and 4 for news 2
//                         // console.log(`narrationCompNumber: ${narrationCompNumber}`);
//                         const nextNarrationCompNumber = narrationCompNumber + 1;
//                         const narrationCompName = `News-Narration${narrationCompNumber}`;
//                         const nextNarrationCompName = `News-Narration${nextNarrationCompNumber}`;
//                         const sync: AE.Json.TS.Sync = {
//                             method: 'syncHeadTail',
//                             padding: 0.1,
//                             layerAName: nextNarrationCompName,
//                             layerBName: narrationCompName,
//                         };
//                         trimSyncData.push(sync);
//                     }
//                 }
//                 syncNarrationComps();
                
//                 const syncBackgrounds = () => {
//                     // Each background needs to get synced with the previous narration end
//                     const numberOfBackgroundComps = 4 - ii;
//                     for (let jj = 2; jj <= numberOfBackgroundComps; jj++) {
//                         const backgroundCompNumber = (ii - 1) * 3 + jj; // 2-3 for news 1 and 5 for news 2
//                         // console.log(`narrationCompNumber: ${narrationCompNumber}`);
//                         const prevNarrationCompNumber = backgroundCompNumber - 1;
//                         const backgroundCompName = `News-BG${backgroundCompNumber}`;
//                         const prevNarrationCompName = `News-Narration${prevNarrationCompNumber}`;
//                         const sync: AE.Json.TS.Sync = {
//                             method: 'syncHeadTail',
//                             padding: 0.1,
//                             layerAName: backgroundCompName,
//                             layerBName: prevNarrationCompName,
//                         };
//                         trimSyncData.push(sync);
//                     }
//                 }
//                 syncBackgrounds();

//                 const newsCompName = `Todays news ${ii}`;
//                 const trim: AE.Json.TS.Trim = {
//                     method: 'trimByAudio',
//                     layerOrCompName: newsCompName,
//                 };
//                 trimSyncData.push(trim);

//                 /**
//                  * Now we sync the markers of Todays news ${i}
//                  * with the ends of the previous narration comps
//                  */
//                 const relocateMarkers = () => {
//                     const markerLayerName = `Todays news ${ii}`;
//                     let soundMarkerLayerNames: string[] = [];
//                     const numberOfNarrationComps = 4 - ii;
//                     for (let kk = 1; kk < numberOfNarrationComps; kk++) {
//                         const narrationCompNumber = (ii - 1) * 3 + kk; // 1-2 for news 1 and 4 for news 2
//                         // console.log(`narrationCompNumber: ${narrationCompNumber}`);
//                         const narrationCompName = `News-Narration${narrationCompNumber}`;
//                         soundMarkerLayerNames.push(narrationCompName);
//                     }
                    
//                     const sync: AE.Json.TS.SyncMarker = {
//                         method: 'markersSync',
//                         padding: 0,
//                         layerAName: markerLayerName,
//                         layerBName: soundMarkerLayerNames,
//                     };
//                     trimSyncData.push(sync);
//                 }

//                 relocateMarkers();
//             }
//         }

//         trimSyncNews();

//         /**
//          * We're done with inserting files and texts
//          * and we're done with trimming narration and presenters
//          * and syncing the news items internally (syncing the layers IN the news comps)
//          * now it's time to sync the main comp layers
//          * 
//          * Syncing is done by pulling the next layer's start 
//          * to the previous layer's end.
//          * 
//          * we'll start with Presenter Open to Intro
//          * then News comp 1 to Presenter Open
//          * then News comp 2 to News comp 1
//          * then Presenter Close to News comp 2
//          * 
//          * Once all that's done we sync the soundtrack
//          * and the markers
//          */
//         const syncMainCompLayers = () => {
//             // Presenter Open to Intro
//             // trimSyncData.push({
//             //     method: 'syncHeadTail',
//             //     padding: 0,
//             //     layerAName: 'Presenter Open',
//             //     layerBName: 'Intro',
//             // });

//             // News comp 1 to Presenter Open
//             trimSyncData.push({
//                 method: 'syncHeadTail',
//                 padding: 0,
//                 layerAName: 'Todays news 1',
//                 layerBName: 'Intro',
//             });

//             // News comp 2 to News comp 1
//             trimSyncData.push({
//                 method: 'syncHeadTail',
//                 padding: 0,
//                 layerAName: 'Todays news 2',
//                 layerBName: 'Todays news 1',
//             });
            
//             // // Presenter Close to News comp 2
//             // trimSyncData.push({
//             //     method: 'syncHeadTail',
//             //     padding: 0,
//             //     layerAName: 'Presenter Close',
//             //     layerBName: 'News comp 2',
//             // });

//             // Ending to News comp 2 instead of Presenter Close via single marker
//             trimSyncData.push({
//                 method: 'syncMarkerToOutPoint',
//                 padding: 0,
//                 layerAName: 'Ending',
//                 layerBName: 'Todays news 2',
//             });

//             const syncTransitions = () => {
//                 const transitionLayerNames = [
//                     // 'trans-presOpen-news1',
//                     // 'trans-news1-news2',
//                     // 'trans-news2-presClose',
//                     'trans1',
//                     'trans2',
//                 ];

//                 const syncToLayers = [
//                     // 'Presenter Open',
//                     'Todays news 1',
//                     'Todays news 2',
//                 ]

//                 for (let i=0; i<transitionLayerNames.length; i++){
//                     const transLayerName = transitionLayerNames[i];
//                     const syncToLayer = syncToLayers[i];
//                     const syncMarker: AE.Json.TS.Sync = {
//                         method: 'syncMarkerToOutPoint',
//                         padding: 0,
//                         layerAName: transLayerName,
//                         layerBName: syncToLayer,
//                     }
//                     trimSyncData.push(syncMarker);
//                 }
//             }

//             syncTransitions();

//             const syncSoundtrack = () => {
//                 const syncMarker: AE.Json.TS.Sync = {
//                     method: 'syncMarkerToOutPoint',
//                     padding: 0,
//                     layerAName: 'Sound ending',
//                     // layerBName: 'Presenter Close',
//                     layerBName: 'Todays news 2',
//                 }
//                 trimSyncData.push(syncMarker);

//                 // now we trim the loop to the beginning of
//                 // the sound ending
//                 const trim: AE.Json.TS.Trim = {
//                     method: 'trimOutToIn',
//                     // layerOrCompName: 'Intro news III Loop',
//                     layerOrCompName: 'Intro Sound',
//                     trimToLayer: 'Sound ending',
//                 };
//                 trimSyncData.push(trim);
//             }

//             syncSoundtrack();
//         }

//         syncMainCompLayers();

//         // set workarea
//         const trim: AE.Json.TS.Trim = {
//             method: 'trimWorkareaToLayerOut',
//             layerOrCompName: '0_Main comp',
//             trimToLayer: 'Ending',
//         };
//         trimSyncData.push(trim);

//         let payload: AE.Json.Payload = {
//             files,
//             texts,
//             trimSyncData,
//             names: {
//                 exportComp: '0_Main comp',
//                 importBin: 'Imports',
//             },
//             paths: PATHS.getAll__CORE(subFolders, edition),
//             dbg: {
//                 dbgLevel: -7,
//                 saveExportClose: {
//                     isSave: false,
//                     isExport: false,
//                     isClose: false,
//                 },
//             },
//         };

//         for (let text of payload.texts) {
//             text.text = typeof text.text === 'string' ? text.text : String(text.text);
//             // Use convertedText here
//         }

//         const jsoned = JSON.stringify(payload).replace(/\\\\/g, '/');
//         // console.warn(jsoned);

//         // return;

//         const axiosResponse = await axios.post(
//             `http://localhost:${PORT}${API_Endpoint}`,
//             { stringifiedJSON: jsoned }
//         );
//         console.log(JSON.stringify(axiosResponse.data));
//     } catch (error) {
//         console.error(error);
//     } finally {
//         await DB.pool.end();
//     }
// }

// Fortuna_SNS_AE_Schedule__CORE();
// testCalendarSNSAE();
// Fortuna_SNS_AE_Ranking__CORE();

Race2Real_AE_daily_news__MOTORSPORT_EN();