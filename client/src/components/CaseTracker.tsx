import React from 'react';
import { CheckCircle } from 'lucide-react';

const STEPS = [
    { key: 'pending_nurse_assignment', label: 'Pending' },
    { key: 'nurse_assigned', label: 'Assigned' },
    { key: 'nurse_on_the_way', label: 'En Route' },
    { key: 'vitals_recorded', label: 'Vitals' },
    { key: 'awaiting_doctor_review', label: 'Review' },
    { key: 'doctor_completed', label: 'Diagnosed' },
    { key: 'completed', label: 'Done' },
];

interface Props {
    status: string;
}

export default function CaseTracker({ status }: Props) {
    const currentIdx = STEPS.findIndex((s) => s.key === status);

    return (
        <div className="progress-tracker" style={{ display: 'flex', gap: 0, padding: '10px 0', minWidth: 'max-content' }}>
            {STEPS.map((step, idx) => {
                const isCompleted = idx < currentIdx;
                const isActive = idx === currentIdx;

                return (
                    <div className="progress-step" key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 64 }}>
                            <div className={`progress-circle ${isCompleted ? 'completed' : isActive ? 'active' : ''}`} style={{ width: 28, height: 28 }}>
                                {isCompleted ? <CheckCircle size={14} /> : <span style={{ fontSize: '0.75rem' }}>{idx + 1}</span>}
                            </div>
                            <div className="progress-label" style={{
                                color: isActive ? 'var(--primary)' : undefined,
                                fontWeight: isActive ? 600 : 400,
                                fontSize: '0.625rem',
                                marginTop: 4,
                                textAlign: 'center'
                            }}>
                                {step.label}
                            </div>
                        </div>
                        {idx < STEPS.length - 1 && (
                            <div className={`progress-line ${isCompleted ? 'completed' : ''}`} style={{ width: 20, margin: '0 -10px', marginTop: -16 }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
