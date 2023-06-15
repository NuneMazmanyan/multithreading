import {spawn} from 'child_process';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.join(__dirname,'..', 'logs');

async function getProcessStatisticsData(command, args = [], timeout) {
    const childProcess = spawn(command, [...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: timeout | undefined,
    });

    const startTime = new Date();
    let success = false;
    let commandSuccess = true;
    let error = undefined;
    let stdoutData = '';
    let statistics;

    return new Promise((resolve) => {
        childProcess.stdout.on('data', (data) => {
            stdoutData += data;
        });

        childProcess.on('error', (err) => {
            error = err.message;
            commandSuccess = false;
        });

        childProcess.on('exit', (code) => {
            const endTime = new Date();
            const duration = endTime - startTime;

            if (code !== 0) {
                error = `Process exited with code ${code}`;
                success = false;
                commandSuccess = false;
            } else {
                success = true;
                commandSuccess = true;
            }

            const timestamp = startTime.toISOString().slice(0,13);
            statistics = {
                start: startTime.toISOString(),
                duration: duration,
                success: success,
                commandSuccess: commandSuccess ? {} : { commandSuccess },
                error: error ? { error } : {},
            };

            const value = {
                filePath: path.join(logsDir, `Test${timestamp}${command}.json`),
                statistics: JSON.stringify(statistics),
            };

            resolve(value);
        });
    });
}


const command = 'ls';
const args = ['-l', '-a'];
const timeout = 100000;

getProcessStatisticsData(command, args, timeout)
    .then((data)=> {
        const jsonData = data.statistics;
        fs.writeFileSync(data.filePath, jsonData);
    })
    .catch((error) => {
        console.log(error.message);
        return 0;
});