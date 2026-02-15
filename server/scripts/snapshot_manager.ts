import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

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

export async function exportModel(modelName: string) {
    console.log(`📦 Exporting ${modelName} snapshot...`);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotDir = path.join(__dirname, '../backups/snapshots');
    if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir, { recursive: true });

    const fileName = `${modelName}_${timestamp}.json`;
    const filePath = path.join(snapshotDir, fileName);

    try {
        const data = await (prisma as any)[modelName].findMany();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`✅ Exported ${modelName} to ${fileName}`);
        await logEvent('EXPORT', 'partial', 'success', fileName);
    } catch (err: any) {
        console.error(`❌ Export failed for ${modelName}:`, err.message);
        await logEvent('EXPORT', 'partial', 'failure', `${modelName}: ${err.message}`);
    }
}

export async function importModel(modelName: string, fileName: string) {
    console.log(`📥 Importing ${modelName} from ${fileName}...`);
    const filePath = path.join(__dirname, '../backups/snapshots', fileName);

    if (!fs.existsSync(filePath)) {
        console.error('❌ Snapshot file not found');
        return;
    }

    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Use a transaction for safety
        await prisma.$transaction(async (tx) => {
            // Option 1: Upsert everything (safer for dependencies)
            // For now, simple createMany for demonstration (this might fail if IDs exist)
            // Clean up: delete existing? (Destructive)
            // await (tx as any)[modelName].deleteMany(); 

            // Safer approach: loop and upsert based on id
            for (const item of data) {
                await (tx as any)[modelName].upsert({
                    where: { id: item.id },
                    update: item,
                    create: item
                });
            }
        });

        console.log(`✅ Restored ${data.length} records into ${modelName}`);
        await logEvent('IMPORT', 'partial', 'success', fileName);
    } catch (err: any) {
        console.error(`❌ Import failed for ${modelName}:`, err.message);
        await logEvent('IMPORT', 'partial', 'failure', `${modelName}: ${err.message}`);
    }
}

// CLI usage
const args = process.argv.slice(2);
if (args[0] === 'export' && args[1]) {
    exportModel(args[1]).then(() => prisma.$disconnect());
} else if (args[0] === 'import' && args[1] && args[2]) {
    importModel(args[1], args[2]).then(() => prisma.$disconnect());
}
