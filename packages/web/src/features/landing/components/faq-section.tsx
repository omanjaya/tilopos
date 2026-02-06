import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItemProps {
    question: string;
    answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-gray-200">
            <button
                className="w-full py-5 flex items-center justify-between text-left group"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="font-medium text-[var(--brand-heading)] group-hover:text-[var(--brand-primary)] transition-colors">
                    {question}
                </span>
                <ChevronDown className={`w-5 h-5 text-[var(--brand-muted)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40 pb-5' : 'max-h-0'}`}>
                <p className="text-[var(--brand-text)] text-sm leading-relaxed">{answer}</p>
            </div>
        </div>
    );
}

interface FAQ {
    question: string;
    answer: string;
}

const faqs: FAQ[] = [
    { question: "Apakah ada biaya setup?", answer: "Tidak ada. Langsung daftar dan gunakan tanpa biaya tambahan." },
    { question: "Apakah data saya aman?", answer: "Ya, kami menggunakan enkripsi SSL 256-bit dan backup harian otomatis." },
    { question: "Bisa digunakan offline?", answer: "Ya, POS tetap berjalan offline dan sync otomatis saat online." },
    { question: "Bagaimana cara hubungi support?", answer: "Via live chat, WhatsApp, telepon, atau email. Tim kami siap 24/7." },
];

export function FAQSection() {
    return (
        <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'var(--brand-heading)' }}>
                        Pertanyaan Umum
                    </h2>
                </div>
                <div>
                    {faqs.map((faq, index) => (
                        <FAQItem key={index} question={faq.question} answer={faq.answer} />
                    ))}
                </div>
            </div>
        </section>
    );
}
