import { useState } from 'react';
import { Search, Play, Clock, Filter, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { tutorials, tutorialCategories, searchTutorials } from '@/config/tutorials.config';

export function TutorialLibraryPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTutorial, setSelectedTutorial] = useState<string | null>(null);
  const [watchedTutorials, setWatchedTutorials] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('tilo-watched-tutorials');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const filteredTutorials = selectedCategory === 'all'
    ? tutorials
    : tutorials.filter(t => t.category === selectedCategory);

  const displayedTutorials = searchQuery
    ? searchTutorials(searchQuery)
    : filteredTutorials;

  const handleMarkWatched = (tutorialId: string) => {
    setWatchedTutorials(prev => {
      const updated = new Set(prev);
      updated.add(tutorialId);
      localStorage.setItem('tilo-watched-tutorials', JSON.stringify([...updated]));
      return updated;
    });
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'getting-started': return 'Getting Started';
      case 'advanced': return 'Advanced';
      case 'troubleshooting': return 'Troubleshooting';
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'getting-started': return 'bg-green-500';
      case 'advanced': return 'bg-blue-500';
      case 'troubleshooting': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Tutorial Library</h1>
        <p className="mt-2 text-muted-foreground">
          Pelajari cara menggunakan TILO dengan video tutorial lengkap
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari tutorial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-8 flex flex-wrap gap-2">
        {tutorialCategories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
          >
            <Filter className="mr-2 h-4 w-4" />
            {category.name}
            <Badge variant="secondary" className="ml-2">
              {category.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Tutorial Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {displayedTutorials.map((tutorial) => (
          <div
            key={tutorial.id}
            className="group cursor-pointer overflow-hidden rounded-lg border transition-shadow hover:shadow-lg"
            onClick={() => setSelectedTutorial(tutorial.id)}
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-muted">
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <Play className="h-12 w-12 text-primary opacity-50 transition-opacity group-hover:opacity-100" />
              </div>

              {/* Duration Badge */}
              <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                <Clock className="mr-1 inline h-3 w-3" />
                {tutorial.duration}
              </div>

              {/* Watched Badge */}
              {watchedTutorials.has(tutorial.id) && (
                <div className="absolute top-2 right-2 rounded bg-green-500 px-2 py-1 text-xs text-white">
                  <CheckCircle2 className="mr-1 inline h-3 w-3" />
                  Ditonton
                </div>
              )}

              {/* Category Badge */}
              <div className={`absolute top-2 left-2 rounded ${getCategoryColor(tutorial.category)} px-2 py-1 text-xs text-white`}>
                {getCategoryLabel(tutorial.category)}
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="mb-2 font-semibold line-clamp-2">{tutorial.title}</h3>
              <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                {tutorial.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {tutorial.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {displayedTutorials.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            {searchQuery
              ? `Tidak ada tutorial yang cocok dengan "${searchQuery}"`
              : 'Tidak ada tutorial tersedia'}
          </p>
        </div>
      )}

      {/* Video Player Modal */}
      <Dialog open={selectedTutorial !== null} onOpenChange={() => setSelectedTutorial(null)}>
        <DialogContent className="max-w-4xl">
          {selectedTutorial && (() => {
            const tutorial = tutorials.find(t => t.id === selectedTutorial);
            if (!tutorial) return null;

            return (
              <>
                <DialogHeader>
                  <DialogTitle>{tutorial.title}</DialogTitle>
                </DialogHeader>

                {/* Video Player */}
                <div className="aspect-video overflow-hidden rounded-lg bg-black">
                  <iframe
                    width="100%"
                    height="100%"
                    src={tutorial.videoUrl}
                    title={tutorial.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                {/* Tutorial Info */}
                <div className="mt-4">
                  <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <Clock className="mr-1 h-4 w-4" />
                      {tutorial.duration}
                    </span>
                    <Badge>{getCategoryLabel(tutorial.category)}</Badge>
                  </div>

                  <p className="text-muted-foreground">{tutorial.description}</p>

                  {/* Tags */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tutorial.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Mark as Watched Button */}
                  {!watchedTutorials.has(tutorial.id) && (
                    <Button
                      onClick={() => handleMarkWatched(tutorial.id)}
                      className="mt-4"
                      variant="outline"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Tandai Sudah Ditonton
                    </Button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
