import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import cluster from 'cluster';
import os from 'os';

function readCSV(csvFilePath) {
    return new Promise((resolve) => {
        const result = [];
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => {
                result.push(data)
            })
            .on('end', () => {
                resolve(result);
            })
    })
}

async function getCSVFiles(directoryPath) {
    let csvFiles = [];
    if (!fs.existsSync(directoryPath)) {
        console.log('No directory with matching name')
        return;
    }
    return new Promise((resolve, reject) => {
        fs.readdir(directoryPath, (error, files) => {
            if (error) {
                reject(error);
                return;
            }
            csvFiles = files.filter((file) => path.extname(file) === '.csv');
            resolve(csvFiles);
        })
    }).then()
}

function getWorkersCount(csvFilesCount) {
    let cpus = os.cpus().length;
    return Math.min(cpus,csvFilesCount)
}

async function processCSVFile(csvFilePath) {
    await readCSV(csvFilePath)
        .then((data) => {
            const jsonData = JSON.stringify(data);
            console.log(path.join(path.dirname(csvFilePath.replace('csv files','converted files')), path.basename(csvFilePath).replace('csv', 'json')))
            fs.writeFileSync(path.join(path.dirname(csvFilePath.replace('csv files','converted files')), path.basename(csvFilePath).replace('csv', 'json')), jsonData);
        })
        .catch((error) => {
            console.log(`Error processing file ${csvFilePath}:`, error);
            return 0;
        });
}

async function convertCsvDirFilesToJSONDirFiles(directoryPath) {
    let csvFiles;
    if (cluster.isPrimary) {
        csvFiles = await getCSVFiles(directoryPath);
        let workersCount = getWorkersCount(csvFiles.length);
        const filePathsPerWorker = Math.floor(csvFiles.length / workersCount);
        for(let i = 0; i < csvFiles.length; i += filePathsPerWorker){
            cluster.fork({csvFilePaths: csvFiles.slice(i, i + filePathsPerWorker)})
        }

    } else {
        await processCSVFile(path.join(directoryPath,process.env.csvFilePaths))
        process.exit()
    }
    return;
}

convertCsvDirFilesToJSONDirFiles('C:/Users/Nune/OneDrive/Рабочий стол/EPAM Node/Multithreading/task2/csv files').then()