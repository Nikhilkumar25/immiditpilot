import React, { useState } from 'react';
import { Star, X } from 'lucide-react';

interface RatingDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { score: number; category: string; comment: string }) => void;
    title: string;
    categories: string[];
}

const RatingDialog: React.FC<RatingDialogProps> = ({ isOpen, onClose, onSubmit, title, categories }) => {
    const [score, setScore] = useState(0);
    const [hover, setHover] = useState(0);
    const [category, setCategory] = useState(categories[0] || '');
    const [comment, setComment] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (score === 0) return alert('Please select a star rating');
        onSubmit({ score, category, comment });
        onClose();
        // Reset state
        setScore(0);
        setComment('');
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
            <div className="modal-content card" style={{
                width: '100%', maxWidth: '400px', background: 'var(--card-bg)',
                borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                    <X size={20} />
                </button>

                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600 }}>{title}</h3>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                        <button
                            key={s}
                            onMouseEnter={() => setHover(s)}
                            onMouseLeave={() => setHover(0)}
                            onClick={() => setScore(s)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                            <Star
                                size={32}
                                fill={(hover || score) >= s ? '#ffc107' : 'transparent'}
                                color={(hover || score) >= s ? '#ffc107' : '#ced4da'}
                                style={{ transition: 'all 0.2s' }}
                            />
                        </button>
                    ))}
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Category</label>
                    <select
                        className="input"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        style={{ width: '100%' }}
                    >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Comments (Optional)</label>
                    <textarea
                        className="input"
                        rows={3}
                        placeholder="Write your feedback..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        style={{ width: '100%', resize: 'none' }}
                    />
                </div>

                <button
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    style={{ width: '100%' }}
                >
                    Submit Feedback
                </button>
            </div>
        </div>
    );
};

export default RatingDialog;
