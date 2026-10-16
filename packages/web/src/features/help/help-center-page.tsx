import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Book,
  Video,
  Keyboard,
  Mail,
  Phone,
  ChevronRight,
} from 'lucide-react';
import { useOpenShortcutsDialog } from '@/components/layout/global-shortcuts-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { faqCategories, getFAQsByCategory, searchFAQs } from '@/config/faqs.config';

const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim() || '';
const SUPPORT_WHATSAPP = (import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined)?.replace(/\D/g, '') || '';

export function HelpCenterPage() {
  const openShortcuts = useOpenShortcutsDialog();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const displayedFAQs = searchQuery
    ? searchFAQs(searchQuery)
    : getFAQsByCategory(selectedCategory);

  const quickLinkContent = (title: string, description: string, Icon: typeof Video) => (
    <Card className="h-full transition-shadow hover:shadow-lg cursor-pointer">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </CardContent>
    </Card>
  );

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Pusat Bantuan</h1>
        <p className="mt-2 text-muted-foreground">
          Temukan jawaban untuk pertanyaan Anda atau pelajari fitur TiloPOS
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari bantuan... (contoh: refund, stok, laporan)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-10 text-lg"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Link to="/app/help/tutorials" className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {quickLinkContent('Tutorial', 'Panduan cara menggunakan TiloPOS', Video)}
        </Link>
        <button
          type="button"
          onClick={openShortcuts}
          className="rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {quickLinkContent('Pintasan Keyboard', 'Pelajari pintasan untuk aksi cepat', Keyboard)}
        </button>
      </div>

      {/* Category Cards */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Kategori</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {faqCategories.slice(1).map((category) => {
            const categoryFAQs = getFAQsByCategory(category.id);
            return (
              <button
                type="button"
                key={category.id}
                className="rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-pressed={selectedCategory === category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setSearchQuery('');
                }}
              >
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{category.icon}</span>
                    {category.name}
                  </CardTitle>
                  <CardDescription>
                    {categoryFAQs.length} artikel tersedia
                  </CardDescription>
                </CardHeader>
              </Card>
              </button>
            );
          })}
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {selectedCategory === 'all'
              ? 'Pertanyaan yang Sering Diajukan'
              : faqCategories.find(c => c.id === selectedCategory)?.name}
          </h2>
          {selectedCategory !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              Lihat Semua
            </Button>
          )}
        </div>

        {displayedFAQs.length > 0 ? (
          <Accordion type="single" collapsible>
            {displayedFAQs.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="font-medium">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <p className="text-muted-foreground whitespace-pre-line">
                      {faq.answer}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {faq.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <Book className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>
              {searchQuery
                ? `Tidak ditemukan hasil untuk "${searchQuery}"`
                : 'Belum ada artikel di kategori ini'}
            </p>
          </div>
        )}
      </div>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle>Butuh Bantuan Lebih Lanjut?</CardTitle>
          <CardDescription>
            Tim support kami siap membantu Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          {SUPPORT_EMAIL || SUPPORT_WHATSAPP ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {SUPPORT_EMAIL && (
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{SUPPORT_EMAIL}</p>
              </div>
            </a>
            )}

            {SUPPORT_WHATSAPP && (
            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                <Phone className="h-5 w-5 text-green-500" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium">WhatsApp</p>
                <p className="text-sm text-muted-foreground">+{SUPPORT_WHATSAPP}</p>
              </div>
            </a>
            )}
          </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Kontak dukungan belum dikonfigurasi. Hubungi pemilik atau administrator bisnis Anda.
            </p>
          )}

          <div className="mt-4 rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Jam operasional: Senin - Jumat, 9:00 - 18:00 WIB
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
