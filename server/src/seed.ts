import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create demo users
    const password = await bcrypt.hash('password123', 12);

    const patient = await prisma.user.upsert({
        where: { email: 'patient@immidit.com' },
        update: {},
        create: {
            email: 'patient@immidit.com',
            passwordHash: password,
            name: 'Rahul Sharma',
            phone: '+91 9876543210',
            role: 'patient',
        },
    });

    const nurse = await prisma.user.upsert({
        where: { email: 'nurse@immidit.com' },
        update: {},
        create: {
            email: 'nurse@immidit.com',
            passwordHash: password,
            name: 'Priya Singh',
            phone: '+91 9876543211',
            role: 'nurse',
        },
    });

    const doctor = await prisma.user.upsert({
        where: { email: 'doctor@immidit.com' },
        update: {},
        create: {
            email: 'doctor@immidit.com',
            passwordHash: password,
            name: 'Dr. Amit Patel',
            phone: '+91 9876543212',
            role: 'doctor',
        },
    });

    const admin = await prisma.user.upsert({
        where: { email: 'admin@immidit.com' },
        update: {},
        create: {
            email: 'admin@immidit.com',
            passwordHash: password,
            name: 'Admin User',
            phone: '+91 9876543213',
            role: 'admin',
        },
    });

    const lab = await prisma.user.upsert({
        where: { email: 'lab@immidit.com' },
        update: {},
        create: {
            email: 'lab@immidit.com',
            passwordHash: password,
            name: 'Lab Technician',
            phone: '+91 9876543214',
            role: 'lab',
        },
    });

    console.log('✅ Seeded users:');
    console.log(`  Patient: ${patient.email}`);
    console.log(`  Nurse:   ${nurse.email}`);
    console.log(`  Doctor:  ${doctor.email}`);
    console.log(`  Admin:   ${admin.email}`);
    console.log(`  Lab:     ${lab.email}`);
    console.log('  Password for all: password123');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
