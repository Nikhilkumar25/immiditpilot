import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const execPromise = promisify(exec);

async function logEvent(action: string, type: 'full' | 'partial', status: 'success' | 'failure', details: string) {
    const logPath = path.join(__dirname, '../backups/backup_log.json');
    let logs = [];
    if (fs.existsSync(logPath)) {
        logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    }
    logs.push({
        timestamp: new Date().toISOString(),
        action,
        type,
        status,
        details
    });
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
}

async function restore() {
    const args = process.argv.slice(2);
    const fileName = args[0];

    if (!fileName) {
        console.error('❌ Please provide a backup file name from backups/full/');
        return;
    }

    const filePath = path.join(__dirname, '../backups/full', fileName);
    if (!fs.existsSync(filePath)) {
        console.error('❌ Backup file not found:', filePath);
        return;
    }

    console.log(`🚀 Starting database restoration from ${fileName}...`);
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL not found in .env');
        return;
    }

    try {
        // Warning: This will overwrite data.
        // We use psql to run the SQL dump
        await execPromise(`psql "${dbUrl}" < "${filePath}"`);
        console.log(`✅ Restoration successful from ${fileName}`);
        await logEvent('RESTORE', 'full', 'success', fileName);
    } catch (err: any) {
        console.error('❌ Restoration failed:', err.message);
        await logEvent('RESTORE', 'full', 'failure', err.message);
    }
}

restore();
