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
        <div className="progress-tracker">
            {STEPS.map((step, idx) => {
                const isCompleted = idx < currentIdx;
                const isActive = idx === currentIdx;

                return (
                    <div className="progress-step" key={step.key}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className={`progress-circle ${isCompleted ? 'completed' : isActive ? 'active' : ''}`}>
                                {isCompleted ? <CheckCircle size={16} /> : idx + 1}
                            </div>
                            <div className="progress-label" style={{ color: isActive ? 'var(--primary)' : undefined, fontWeight: isActive ? 600 : 400 }}>
                                {step.label}
                            </div>
                        </div>
                        {idx < STEPS.length - 1 && (
                            <div className={`progress-line ${isCompleted ? 'completed' : ''}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
