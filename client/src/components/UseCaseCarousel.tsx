import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UseCase } from '../../../shared/types';
import { ChevronRight } from 'lucide-react';

interface UseCaseCarouselProps {
    useCases: UseCase[];
}

export default function UseCaseCarousel({ useCases }: UseCaseCarouselProps) {
    const navigate = useNavigate();

    if (!useCases || useCases.length === 0) return null;

    return (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
            <div style={{
                display: 'flex',
                gap: 'var(--space-md)',
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                padding: '4px 4px 16px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
            }} className="no-scrollbar">
                {useCases.map((uc) => (
                    <div
                        key={uc.id}
                        onClick={() => navigate(uc.ctaAction, { state: { fromUseCase: uc.title } })}
                        style={{
                            flex: '0 0 280px',
                            height: '160px',
                            background: uc.themeColor || 'var(--primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--space-lg)',
                            color: 'white',
                            position: 'relative',
                            overflow: 'hidden',
                            scrollSnapAlign: 'start',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                            transition: 'var(--transition)'
                        }}
                        className="use-case-card"
                    >
                        {/* Background Illustration / Image */}
                        {uc.illustrationUrl && (
                            <div style={{
                                position: 'absolute',
                                right: '-10%',
                                bottom: '-10%',
                                width: '60%',
                                height: '80%',
                                opacity: 0.3,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundImage: `url(${uc.illustrationUrl})`,
                                mixBlendMode: 'overlay'
                            }} />
                        )}

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{uc.title}</h3>
                            <p style={{ fontSize: '0.875rem', margin: '4px 0 0', opacity: 0.9, fontWeight: 500 }}>{uc.subtitle}</p>
                        </div>

                        <div style={{
                            position: 'relative',
                            zIndex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '0.813rem',
                            fontWeight: 700,
                            background: 'rgba(255,255,255,0.2)',
                            width: 'fit-content',
                            padding: '6px 14px',
                            borderRadius: 'var(--radius-full)',
                            backdropFilter: 'blur(4px)'
                        }}>
                            {uc.ctaText} <ChevronRight size={14} />
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .use-case-card:active {
                    transform: scale(0.98);
                }
                @media (max-width: 480px) {
                    .use-case-card {
                        flex: 0 0 85% !important;
                    }
                }
            `}</style>
        </div>
    );
}
