import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    const password = await bcrypt.hash('12121212', 12);
    const adminPassword = await bcrypt.hash('minusone', 12);

    // Seed admin user
    const admin = await prisma.user.upsert({
        where: { phone: '0000000000' },
        update: {},
        create: {
            email: 'admin@immidit.com',
            passwordHash: adminPassword,
            name: 'Admin User',
            phone: '0000000000',
            role: 'admin',
        },
    });

    const roles = ['patient', 'nurse', 'doctor', 'lab'] as const;
    const roleSuffix: Record<string, string> = {
        patient: '1',
        nurse: '2',
        doctor: '3',
        lab: '4',
    };
    const roleNames: Record<string, string[]> = {
        patient: ['Rahul Sharma', 'Priya Mehta', 'Ankit Verma', 'Sneha Gupta', 'Vikram Joshi'],
        nurse: ['Neha Singh', 'Pooja Rao', 'Kavita Das', 'Sunita Yadav', 'Ritu Kumari'],
        doctor: ['Dr. Amit Patel', 'Dr. Sonal Kapoor', 'Dr. Rajesh Nair', 'Dr. Meena Iyer', 'Dr. Sanjay Mishra'],
        lab: ['Lab Tech Arun', 'Lab Tech Deepa', 'Lab Tech Manish', 'Lab Tech Rekha', 'Lab Tech Suresh'],
    };

    const createdUsers: { role: string; name: string; phone: string }[] = [
        { role: 'admin', name: admin.name, phone: admin.phone },
    ];

    for (let i = 0; i < 5; i++) {
        for (const role of roles) {
            const phone = `${i}00000000${roleSuffix[role]}`;
            const name = roleNames[role][i];
            const email = `${role}.dummy${i + 1}@immidit.com`;

            const user = await prisma.user.upsert({
                where: { phone },
                update: {},
                create: {
                    email,
                    passwordHash: password,
                    name,
                    phone,
                    role,
                },
            });

            createdUsers.push({ role, name: user.name, phone: user.phone });
        }
    }

    console.log('✅ Seeded dummy users:');
    console.log('─'.repeat(50));
    for (const u of createdUsers) {
        console.log(`  ${u.role.padEnd(8)} | ${u.name.padEnd(22)} | ${u.phone}`);
    }
    console.log('─'.repeat(50));
    console.log('  Password for all: 12121212');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
