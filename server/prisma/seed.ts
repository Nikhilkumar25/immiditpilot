import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding CMS and IMS data...\n');

    // ═══ CMS SERVICES ═══
    const services = await Promise.all([
        // Fever & Infection Care
        prisma.cmsService.create({ data: { name: 'High Fever Check', category: 'Fever & Infection', basePrice: 499, instantCarePremium: 200, estimatedDuration: 30, requiresDoctorReview: true, requiresVitals: true, requiresLabOption: false, order: 1 } }),
        prisma.cmsService.create({ data: { name: 'Dengue Test (NS1 + Platelets)', category: 'Fever & Infection', basePrice: 399, instantCarePremium: 0, estimatedDuration: 20, requiresDoctorReview: true, requiresVitals: false, requiresLabOption: true, order: 2 } }),
        prisma.cmsService.create({ data: { name: 'Viral Fever', category: 'Fever & Infection', basePrice: 499, instantCarePremium: 200, estimatedDuration: 30, requiresDoctorReview: true, requiresVitals: true, order: 3 } }),
        prisma.cmsService.create({ data: { name: 'Loose Motions / Diarrhea', category: 'Fever & Infection', basePrice: 499, instantCarePremium: 200, estimatedDuration: 30, requiresDoctorReview: true, requiresVitals: true, order: 4 } }),
        prisma.cmsService.create({ data: { name: 'Tetanus (TT) Shot', category: 'Fever & Infection', basePrice: 499, instantCarePremium: 100, estimatedDuration: 15, requiresDoctorReview: false, requiresVitals: false, order: 5 } }),
        prisma.cmsService.create({ data: { name: 'Rabies Vaccine (Dog Bite)', category: 'Fever & Infection', basePrice: 499, instantCarePremium: 100, estimatedDuration: 20, requiresDoctorReview: true, requiresVitals: false, order: 6 } }),

        // Diabetes & BP Care
        prisma.cmsService.create({ data: { name: 'Sugar Test (Fasting/Random)', category: 'Diabetes & BP', basePrice: 199, instantCarePremium: 0, estimatedDuration: 10, requiresDoctorReview: false, requiresVitals: false, requiresLabOption: true, order: 7 } }),
        prisma.cmsService.create({ data: { name: 'HbA1c (3-Month Avg)', category: 'Diabetes & BP', basePrice: 449, instantCarePremium: 0, estimatedDuration: 10, requiresDoctorReview: false, requiresVitals: false, requiresLabOption: true, order: 8 } }),
        prisma.cmsService.create({ data: { name: 'BP Check', category: 'Diabetes & BP', basePrice: 499, instantCarePremium: 100, estimatedDuration: 20, requiresDoctorReview: true, requiresVitals: true, order: 9 } }),
        prisma.cmsService.create({ data: { name: 'Insulin Injection Help', category: 'Diabetes & BP', basePrice: 499, instantCarePremium: 100, estimatedDuration: 15, requiresDoctorReview: false, requiresVitals: false, order: 10 } }),
        prisma.cmsService.create({ data: { name: 'Diabetic Foot Check', category: 'Diabetes & BP', basePrice: 499, instantCarePremium: 100, estimatedDuration: 30, requiresDoctorReview: true, requiresVitals: true, order: 11 } }),

        // Thyroid & Hormone
        prisma.cmsService.create({ data: { name: 'TSH Test', category: 'Thyroid & Hormone', basePrice: 299, estimatedDuration: 10, requiresDoctorReview: false, requiresVitals: false, requiresLabOption: true, order: 12 } }),
        prisma.cmsService.create({ data: { name: 'T3 / T4', category: 'Thyroid & Hormone', basePrice: 399, estimatedDuration: 10, requiresDoctorReview: false, requiresVitals: false, requiresLabOption: true, order: 13 } }),
        prisma.cmsService.create({ data: { name: 'Thyroid Full Panel', category: 'Thyroid & Hormone', basePrice: 599, estimatedDuration: 10, requiresDoctorReview: false, requiresVitals: false, requiresLabOption: true, order: 14 } }),

        // Vaccinations
        prisma.cmsService.create({ data: { name: 'Hepatitis A Vaccine', category: 'Vaccinations', basePrice: 499, estimatedDuration: 15, requiresDoctorReview: false, requiresVitals: false, order: 15 } }),
        prisma.cmsService.create({ data: { name: 'Hepatitis B (3 Doses)', category: 'Vaccinations', basePrice: 499, description: '3-dose schedule over 6 months', estimatedDuration: 15, requiresDoctorReview: false, requiresVitals: false, order: 16 } }),
        prisma.cmsService.create({ data: { name: 'HPV Vaccine', category: 'Vaccinations', basePrice: 499, description: 'Human Papillomavirus vaccine', estimatedDuration: 15, requiresDoctorReview: false, requiresVitals: false, order: 17 } }),
        prisma.cmsService.create({ data: { name: 'Flu Shot', category: 'Vaccinations', basePrice: 499, estimatedDuration: 15, requiresDoctorReview: false, requiresVitals: false, order: 18 } }),
        prisma.cmsService.create({ data: { name: 'Tetanus Booster', category: 'Vaccinations', basePrice: 499, estimatedDuration: 15, requiresDoctorReview: false, requiresVitals: false, order: 19 } }),
        prisma.cmsService.create({ data: { name: 'Rabies Vaccine', category: 'Vaccinations', basePrice: 499, estimatedDuration: 15, requiresDoctorReview: false, requiresVitals: false, order: 20 } }),

        // Elder & Home Support
        prisma.cmsService.create({ data: { name: 'Monthly Elder Visit', category: 'Elder & Home Support', basePrice: 499, instantCarePremium: 200, estimatedDuration: 45, requiresDoctorReview: true, requiresVitals: true, order: 21 } }),
        prisma.cmsService.create({ data: { name: 'Vitals Monitoring', category: 'Elder & Home Support', basePrice: 699, instantCarePremium: 100, estimatedDuration: 30, description: 'BP, Sugar, Pulse, Oxygen, Temp, Weight', requiresDoctorReview: true, requiresVitals: true, order: 22 } }),
        prisma.cmsService.create({ data: { name: 'Catheter Care', category: 'Elder & Home Support', basePrice: 999, instantCarePremium: 300, estimatedDuration: 45, requiresDoctorReview: true, requiresVitals: true, order: 23 } }),
        prisma.cmsService.create({ data: { name: 'Bedridden Care', category: 'Elder & Home Support', basePrice: 499, instantCarePremium: 200, estimatedDuration: 60, requiresDoctorReview: true, requiresVitals: true, order: 24 } }),
        prisma.cmsService.create({ data: { name: 'Post-Hospital Care', category: 'Elder & Home Support', basePrice: 499, instantCarePremium: 200, estimatedDuration: 45, requiresDoctorReview: true, requiresVitals: true, order: 25 } }),

        // Lab & Checkups
        prisma.cmsService.create({ data: { name: 'CBC', category: 'Lab & Checkups', basePrice: 399, description: 'Complete Blood Count', estimatedDuration: 10, requiresDoctorReview: false, requiresVitals: false, requiresLabOption: true, order: 26 } }),
        prisma.cmsService.create({ data: { name: 'Platelet Count', category: 'Lab & Checkups', basePrice: 249, estimatedDuration: 10, requiresDoctorReview: false, requiresVitals: false, requiresLabOption: true, order: 27 } }),
        prisma.cmsService.create({ data: { name: 'Lipid Profile', category: 'Lab & Checkups', basePrice: 499, description: 'Cholesterol, HDL, LDL, Triglycerides', estimatedDuration: 10, requiresDoctorReview: false, requiresVitals: false, requiresLabOption: true, order: 28 } }),
        prisma.cmsService.create({ data: { name: 'LFT / KFT', category: 'Lab & Checkups', basePrice: 549, description: 'Liver Function / Kidney Function', estimatedDuration: 10, requiresDoctorReview: false, requiresVitals: false, requiresLabOption: true, order: 29 } }),
        prisma.cmsService.create({ data: { name: 'Vitamin D / B12', category: 'Lab & Checkups', basePrice: 699, estimatedDuration: 10, requiresDoctorReview: false, requiresVitals: false, requiresLabOption: true, order: 30 } }),
        prisma.cmsService.create({ data: { name: 'Full Body Checkup', category: 'Lab & Checkups', basePrice: 1499, description: 'CBC, Lipid, LFT, KFT, Thyroid, Sugar, Vitamin D/B12', estimatedDuration: 15, requiresDoctorReview: true, requiresVitals: false, requiresLabOption: true, order: 31 } }),
    ]);
    console.log(`✅ ${services.length} CMS services seeded`);

    // ═══ ZONES ═══
    const zones = await Promise.all([
        prisma.zone.create({ data: { name: 'Gurgaon', centerLat: 28.4595, centerLng: 77.0266, radiusKm: 15, demandLevel: 'high' } }),
        prisma.zone.create({ data: { name: 'South Delhi', centerLat: 28.5245, centerLng: 77.2066, radiusKm: 10, demandLevel: 'high' } }),
        prisma.zone.create({ data: { name: 'Central Delhi', centerLat: 28.6328, centerLng: 77.2197, radiusKm: 8, demandLevel: 'normal' } }),
        prisma.zone.create({ data: { name: 'North Delhi', centerLat: 28.7041, centerLng: 77.1025, radiusKm: 8, demandLevel: 'normal' } }),
        prisma.zone.create({ data: { name: 'Noida', centerLat: 28.5355, centerLng: 77.3910, radiusKm: 12, demandLevel: 'normal' } }),
    ]);
    console.log(`✅ ${zones.length} zones seeded (Gurgaon primary)`);

    // ═══ LAB TESTS ═══
    const labTests = await Promise.all([
        prisma.labTest.create({ data: { name: 'CBC', category: 'Hematology', price: 399, reportTAT: '2 hours', preparationInstructions: 'No fasting needed', order: 1 } }),
        prisma.labTest.create({ data: { name: 'Platelet Count', category: 'Hematology', price: 249, reportTAT: '2 hours', preparationInstructions: 'No fasting needed', order: 2 } }),
        prisma.labTest.create({ data: { name: 'Dengue NS1 Antigen', category: 'Serology', price: 299, reportTAT: '4 hours', preparationInstructions: 'No fasting needed', order: 3 } }),
        prisma.labTest.create({ data: { name: 'Sugar Fasting', category: 'Biochemistry', price: 99, reportTAT: '1 hour', preparationInstructions: '8-12 hours fasting required', order: 4 } }),
        prisma.labTest.create({ data: { name: 'Sugar Random', category: 'Biochemistry', price: 99, reportTAT: '1 hour', preparationInstructions: 'No fasting needed', order: 5 } }),
        prisma.labTest.create({ data: { name: 'HbA1c', category: 'Biochemistry', price: 449, reportTAT: '4 hours', preparationInstructions: 'No fasting needed', order: 6 } }),
        prisma.labTest.create({ data: { name: 'Lipid Profile', category: 'Biochemistry', price: 499, reportTAT: '4 hours', preparationInstructions: '10-12 hours fasting required', order: 7 } }),
        prisma.labTest.create({ data: { name: 'LFT (Liver Function)', category: 'Biochemistry', price: 349, reportTAT: '4 hours', preparationInstructions: '8 hours fasting preferred', order: 8 } }),
        prisma.labTest.create({ data: { name: 'KFT (Kidney Function)', category: 'Biochemistry', price: 349, reportTAT: '4 hours', preparationInstructions: 'No fasting needed', order: 9 } }),
        prisma.labTest.create({ data: { name: 'TSH', category: 'Immunology', price: 299, reportTAT: '6 hours', preparationInstructions: 'No fasting needed', order: 10 } }),
        prisma.labTest.create({ data: { name: 'T3 / T4', category: 'Immunology', price: 399, reportTAT: '6 hours', preparationInstructions: 'No fasting needed', order: 11 } }),
        prisma.labTest.create({ data: { name: 'Thyroid Full Panel', category: 'Immunology', price: 599, reportTAT: '6 hours', preparationInstructions: 'No fasting needed', order: 12 } }),
        prisma.labTest.create({ data: { name: 'Vitamin D', category: 'Immunology', price: 499, reportTAT: '24 hours', preparationInstructions: 'No fasting needed', order: 13 } }),
        prisma.labTest.create({ data: { name: 'Vitamin B12', category: 'Immunology', price: 499, reportTAT: '24 hours', preparationInstructions: 'No fasting needed', order: 14 } }),
        prisma.labTest.create({ data: { name: 'Urine Routine', category: 'Microbiology', price: 149, reportTAT: '2 hours', preparationInstructions: 'Midstream sample preferred', order: 15 } }),
    ]);
    console.log(`✅ ${labTests.length} lab tests seeded`);

    // ═══ LAB BUNDLES ═══
    const testMap = Object.fromEntries(labTests.map(t => [t.name, t.id]));

    const fullBody = await prisma.labBundle.create({ data: { name: 'Full Body Checkup', bundlePrice: 1499 } });
    for (const tn of ['CBC', 'Lipid Profile', 'LFT (Liver Function)', 'KFT (Kidney Function)', 'TSH', 'Sugar Fasting', 'Vitamin D', 'Vitamin B12', 'Urine Routine']) {
        await prisma.labBundleTest.create({ data: { bundleId: fullBody.id, testId: testMap[tn] } });
    }

    const diabetesPanel = await prisma.labBundle.create({ data: { name: 'Diabetes Panel', bundlePrice: 599 } });
    for (const tn of ['Sugar Fasting', 'Sugar Random', 'HbA1c']) {
        await prisma.labBundleTest.create({ data: { bundleId: diabetesPanel.id, testId: testMap[tn] } });
    }

    const thyroidPanel = await prisma.labBundle.create({ data: { name: 'Thyroid Panel', bundlePrice: 599 } });
    for (const tn of ['TSH', 'T3 / T4', 'Thyroid Full Panel']) {
        await prisma.labBundleTest.create({ data: { bundleId: thyroidPanel.id, testId: testMap[tn] } });
    }

    const feverPanel = await prisma.labBundle.create({ data: { name: 'Fever Panel', bundlePrice: 699 } });
    for (const tn of ['CBC', 'Dengue NS1 Antigen', 'Urine Routine']) {
        await prisma.labBundleTest.create({ data: { bundleId: feverPanel.id, testId: testMap[tn] } });
    }
    console.log('✅ 4 lab bundles seeded');

    // ═══ USE CASES (Landing Page) ═══
    await prisma.useCase.createMany({
        data: [
            { title: 'Fever? Nurse at your door', subtitle: "Don't wait in a clinic queue", ctaText: 'Book Nurse Visit', ctaAction: '/patient/book', themeColor: '#FF6B6B', order: 1 },
            { title: 'Lab Tests from Home', subtitle: 'Sample collection in 15 min', ctaText: 'Book Lab Test', ctaAction: '/patient/book', themeColor: '#3498DB', order: 2 },
            { title: 'Elder Care Made Easy', subtitle: 'Monthly check-ups for your loved ones', ctaText: 'Book Elder Visit', ctaAction: '/patient/book', themeColor: '#E91E8C', order: 3 },
            { title: 'Instant IV Drip', subtitle: 'Dehydration? Get relief at home', ctaText: 'Book Now', ctaAction: '/patient/book', themeColor: '#20B2AA', order: 4 },
            { title: 'Vaccinations at Home', subtitle: 'No hospital visits needed', ctaText: 'See Vaccines', ctaAction: '/patient/book', themeColor: '#9B59B6', order: 5 },
        ],
    });
    console.log('✅ 5 landing page use cases seeded');

    // ═══ NOTIFICATION TEMPLATES ═══
    await prisma.notificationTemplate.createMany({
        data: [
            { eventType: 'nurse_assigned', title: 'Nurse Assigned', messageTemplate: 'Your nurse {{nurseName}} is on the way! ETA: 15 mins.', deliveryChannel: 'push' },
            { eventType: 'vitals_recorded', title: 'Vitals Recorded', messageTemplate: 'Vitals have been recorded. A doctor will review shortly.', deliveryChannel: 'push' },
            { eventType: 'doctor_completed', title: 'Doctor Review Done', messageTemplate: 'Dr. {{doctorName}} has completed the assessment.', deliveryChannel: 'push' },
            { eventType: 'lab_order_created', title: 'Lab Test Recommended', messageTemplate: 'A lab test has been recommended: {{testNames}}.', deliveryChannel: 'push' },
            { eventType: 'report_uploaded', title: 'Lab Report Ready', messageTemplate: 'Your lab report is ready. View it now.', deliveryChannel: 'push' },
            { eventType: 'payment_success', title: 'Payment Confirmed', messageTemplate: '₹{{amount}} paid for {{serviceName}}.', deliveryChannel: 'both' },
            { eventType: 'follow_up_reminder', title: 'Follow-Up Due', messageTemplate: 'Your follow-up visit is due on {{dueDate}}.', deliveryChannel: 'both' },
        ],
    });
    console.log('✅ 7 notification templates seeded');

    // ═══ PRESCRIPTION TEMPLATES ═══
    await prisma.prescriptionTemplate.createMany({
        data: [
            { name: 'High Fever Template', defaultDiagnosisText: 'Pyrexia of Unknown Origin', defaultAdvice: 'Rest, fluids, Paracetamol 500mg TDS. Monitor temperature every 4 hours.', defaultFollowUpDays: 3 },
            { name: 'Dengue Monitoring', defaultDiagnosisText: 'Dengue Fever — monitor platelets', defaultAdvice: 'Bed rest, oral fluids, avoid NSAIDs. Daily platelet count. Hospitalize if platelets < 50,000.', defaultFollowUpDays: 1 },
            { name: 'Diabetes Routine', defaultDiagnosisText: 'Type 2 Diabetes Mellitus', defaultAdvice: 'Monitor fasting/post-meal sugar. Continue prescribed medications. Low GI diet.', defaultFollowUpDays: 30 },
            { name: 'Wound Dressing', defaultDiagnosisText: 'Wound — clean, no signs of infection', defaultAdvice: 'Keep wound dry, change dressing daily. Apply antibiotic ointment. Return if swelling/redness worsens.', defaultFollowUpDays: 3 },
            { name: 'Post-Vaccination', defaultDiagnosisText: 'Post-vaccination observation complete', defaultAdvice: 'Mild fever/soreness is normal for 24-48 hours. Paracetamol if needed. Seek care if high fever persists > 48 hours.', defaultFollowUpDays: 0 },
        ],
    });
    console.log('✅ 5 prescription templates seeded');

    // ═══ FOLLOW-UP PROTOCOLS ═══
    await prisma.followUpProtocol.createMany({
        data: [
            { triggerCondition: 'post_visit', followUpDays: 3, followUpType: 'nurse_visit', mandatory: true },
            { triggerCondition: 'post_visit', followUpDays: 7, followUpType: 'doctor_call', mandatory: false },
            { triggerCondition: 'lab_result_abnormal', followUpDays: 1, followUpType: 'doctor_call', mandatory: true },
            { triggerCondition: 'post_vaccination', followUpDays: 2, followUpType: 'self_check', mandatory: false },
            { triggerCondition: 'dengue_monitoring', followUpDays: 1, followUpType: 'nurse_visit', mandatory: true },
            { triggerCondition: 'elder_care', followUpDays: 30, followUpType: 'nurse_visit', mandatory: true },
        ],
    });
    console.log('✅ 6 follow-up protocols seeded');

    // ═══ INVENTORY ITEMS ═══
    await prisma.inventoryItem.createMany({
        data: [
            { name: 'Disposable Syringe 5ml', sku: 'SYR-5ML', unit: 'Pcs', currentStock: 200, reorderLevel: 50, costPrice: 5, salePrice: 10 },
            { name: 'Disposable Syringe 10ml', sku: 'SYR-10ML', unit: 'Pcs', currentStock: 150, reorderLevel: 50, costPrice: 7, salePrice: 12 },
            { name: 'Cotton Roll (500g)', sku: 'COT-500', unit: 'Roll', currentStock: 30, reorderLevel: 10, costPrice: 80, salePrice: 0 },
            { name: 'Surgical Gloves (pair)', sku: 'GLV-SURG', unit: 'Pair', currentStock: 300, reorderLevel: 100, costPrice: 8, salePrice: 0 },
            { name: 'Spirit Swab', sku: 'SWB-SPRT', unit: 'Pcs', currentStock: 500, reorderLevel: 100, costPrice: 2, salePrice: 0 },
            { name: 'IV Cannula 20G', sku: 'IVC-20G', unit: 'Pcs', currentStock: 100, reorderLevel: 30, costPrice: 25, salePrice: 50 },
            { name: 'IV Set (Standard)', sku: 'IVS-STD', unit: 'Pcs', currentStock: 80, reorderLevel: 20, costPrice: 35, salePrice: 60 },
            { name: 'Normal Saline 500ml', sku: 'NS-500', unit: 'Bottle', currentStock: 50, reorderLevel: 15, costPrice: 40, salePrice: 80 },
            { name: 'Dextrose 5% 500ml', sku: 'DEX-500', unit: 'Bottle', currentStock: 40, reorderLevel: 15, costPrice: 45, salePrice: 90 },
            { name: 'Crepe Bandage 4"', sku: 'BND-CRP4', unit: 'Pcs', currentStock: 60, reorderLevel: 20, costPrice: 30, salePrice: 50 },
            { name: 'Micropore Tape', sku: 'TPE-MIC', unit: 'Roll', currentStock: 40, reorderLevel: 15, costPrice: 25, salePrice: 0 },
            { name: 'Vacutainer (EDTA)', sku: 'VCT-EDTA', unit: 'Pcs', currentStock: 200, reorderLevel: 50, costPrice: 15, salePrice: 0 },
            { name: 'Vacutainer (Plain)', sku: 'VCT-PLN', unit: 'Pcs', currentStock: 200, reorderLevel: 50, costPrice: 12, salePrice: 0 },
            { name: 'Tourniquet', sku: 'TRNQ', unit: 'Pcs', currentStock: 20, reorderLevel: 5, costPrice: 50, salePrice: 0 },
            { name: 'Paracetamol 500mg', sku: 'MED-PCM', unit: 'Strip', currentStock: 100, reorderLevel: 30, costPrice: 8, salePrice: 15 },
            { name: 'ORS Sachet', sku: 'MED-ORS', unit: 'Sachet', currentStock: 80, reorderLevel: 30, costPrice: 5, salePrice: 10 },
        ],
    });
    console.log('✅ 16 inventory items seeded');

    console.log('\n🎉 Seed complete!');
}

main()
    .catch((e) => {
        console.error('Seed error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
