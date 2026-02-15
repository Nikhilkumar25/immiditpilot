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

async function backup() {
    console.log('🚀 Starting full database backup...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../backups/full');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    const fileName = `full_backup_${timestamp}.sql`;
    const filePath = path.join(backupDir, fileName);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL not found in .env');
        return;
    }

    try {
        // Use pg_dump via the connection string
        await execPromise(`pg_dump "${dbUrl}" > "${filePath}"`);
        console.log(`✅ Backup successful: ${filePath}`);
        await logEvent('BACKUP', 'full', 'success', fileName);
    } catch (err: any) {
        console.error('❌ Backup failed:', err.message);
        await logEvent('BACKUP', 'full', 'failure', err.message);
    }
}

backup();
