import React, { useState } from 'react';
import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

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
    const [isExpanded, setIsExpanded] = useState(false);
    const currentIdx = STEPS.findIndex((s) => s.key === status);
    const currentStep = currentIdx >= 0 ? STEPS[currentIdx] : null;

    return (
        <div
            className={`progress-tracker-container ${isExpanded ? 'expanded' : 'collapsed'}`}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            {/* Collapsed view (Mobile only) */}
            {!isExpanded && (
                <div className="mobile-tracker-summary">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', width: '100%' }}>
                        <div className="progress-circle active" style={{ width: 28, height: 28, flexShrink: 0 }}>
                            <span style={{ fontSize: '0.75rem' }}>{currentIdx + 1}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.813rem', fontWeight: 700, color: 'var(--primary)' }}>
                                {currentStep?.label || 'Status Unknown'}
                            </div>
                            <div style={{ fontSize: '0.688rem', color: 'var(--text-muted)' }}>
                                Step {currentIdx + 1} of {STEPS.length} · Tap to view details
                            </div>
                        </div>
                        <ChevronDown size={18} color="var(--text-muted)" />
                    </div>
                </div>
            )}

            {/* Expanded / Desktop view */}
            <div className={`progress-tracker ${(isExpanded || window.innerWidth > 768) ? 'show' : 'hide-mobile'}`}>
                {isExpanded && (
                    <div style={{ paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-md)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="mobile-only">
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Service Journey</span>
                        <ChevronUp size={18} color="var(--text-muted)" />
                    </div>
                )}
                <div className="steps-wrapper">
                    {STEPS.map((step, idx) => {
                        const isCompleted = idx < currentIdx;
                        const isActive = idx === currentIdx;

                        return (
                            <div className="progress-step" key={step.key}>
                                <div className="progress-step-content">
                                    <div className={`progress-circle ${isCompleted ? 'completed' : isActive ? 'active' : ''}`}>
                                        {isCompleted ? <CheckCircle size={14} /> : <span style={{ fontSize: '0.75rem' }}>{idx + 1}</span>}
                                    </div>
                                    <div className="progress-label" style={{
                                        color: isActive ? 'var(--primary)' : undefined,
                                        fontWeight: isActive ? 600 : 400
                                    }}>
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
            </div>
        </div>
    );
}
