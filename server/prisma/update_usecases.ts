import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Updating UseCase illustrations...');

    const updates = [
        { title: 'Fever & Infection', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800' },
        { title: 'Lab Tests', url: 'https://images.unsplash.com/photo-1579152276503-60506eb36873?auto=format&fit=crop&w=800' },
        { title: 'Elderly Care', url: 'https://images.unsplash.com/photo-1581578731522-620478059633?auto=format&fit=crop&w=800' },
        { title: 'IV Drip at Home', url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800' },
        { title: 'Vaccinations', url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=800' },
    ];

    for (const item of updates) {
        await prisma.useCase.updateMany({
            where: { title: { contains: item.title } },
            data: { illustrationUrl: item.url }
        });
        console.log(`✅ Updated ${item.title}`);
    }

    console.log('\n✨ All UseCases updated with premium images.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
